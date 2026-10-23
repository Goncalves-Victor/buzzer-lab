/* ==========================================================================
   useLibrary.ts
   A "biblioteca" do aluno: "Meus exemplos" + playlist, e o perfil (nome) que
   decide ONDE ela e guardada.

   - SEM nome: as listas ficam no localStorage (como sempre foi).
   - COM nome: as listas ficam na nuvem, sob esse nome (data/cloudSync.ts), e
     o localStorage generico NAO e tocado. Assim o backup de quem usa o app
     sem nome nunca e sobrescrito pela lista de um perfil.

   Regras herdadas do OLED Lab:
   - nome novo (sem nada salvo) comeca VAZIO: nao herda a lista local, senao
     um nome novo "puxaria" musicas de outra pessoa por engano;
   - nome com dados substitui as listas pelo que esta na nuvem;
   - apagar o nome volta para a lista local;
   - so envia para a nuvem DEPOIS da primeira leitura daquele nome: o
     Firebase apaga o no ao receber listas vazias, e escrever o estado vazio
     inicial apagaria o que estava salvo.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SongEvent, StoredSong } from '../music/songTypes';
import { saveProfile, watchProfile } from '../data/cloudSync';
import { localSongRepository } from '../data/customSongs';
import { localPlaylistRepository } from '../data/playlist';
import {
  addCustomSong,
  addToPlaylist,
  moveSong,
  removeSong,
  renameSong,
} from '../data/songLists';
import { STORAGE_KEYS, readJson, writeJson } from '../data/storage';

export type CloudStatus = 'idle' | 'loading' | 'syncing' | 'saved' | 'error';

/** Tempo de pausa na digitacao do nome / antes de enviar mudancas. */
const DEBOUNCE_MS = 600;
export const PROFILE_NAME_MAX = 30;

export interface LibraryController {
  customSongs: StoredSong[];
  playlist: StoredSong[];

  /** Texto do campo de nome (muda a cada tecla). */
  nameInput: string;
  setNameInput: (name: string) => void;
  /** Nome confirmado (depois da pausa na digitacao). Vazio = sem perfil. */
  profileName: string;
  cloudStatus: CloudStatus;
  cloudError: string;

  saveCustom: (name: string, events: SongEvent[]) => void;
  removeCustom: (id: string) => void;

  /** Devolve true se a musica ja existia na playlist e foi atualizada. */
  addToPlaylist: (name: string, events: SongEvent[]) => boolean;
  renameInPlaylist: (id: string, name: string) => void;
  moveInPlaylist: (id: string, direction: -1 | 1) => void;
  removeFromPlaylist: (id: string) => void;
}

function readStoredName(): string {
  const stored = readJson<unknown>(STORAGE_KEYS.profileName, '');
  return typeof stored === 'string' ? stored.trim().slice(0, PROFILE_NAME_MAX) : '';
}

/** Representacao usada para saber se as listas mudaram de verdade. */
function serialize(customSongs: StoredSong[], playlist: StoredSong[]): string {
  return JSON.stringify({ customSongs, playlist });
}

export function useLibrary(): LibraryController {
  const [nameInput, setNameInput] = useState(readStoredName);
  const [profileName, setProfileName] = useState(readStoredName);

  // Se ja existe um nome salvo, comeca vazio (a nuvem preenche em seguida):
  // evita mostrar por um instante a lista local de quem nao tem nome.
  const [customSongs, setCustomSongs] = useState<StoredSong[]>(() =>
    profileName ? [] : localSongRepository.list(),
  );
  const [playlist, setPlaylist] = useState<StoredSong[]>(() =>
    profileName ? [] : localPlaylistRepository.list(),
  );
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle');
  const [cloudError, setCloudError] = useState('');

  // Refs com o valor MAIS RECENTE: duas acoes seguidas no mesmo instante (antes
  // do re-render) precisam enxergar o resultado uma da outra.
  const customRef = useRef(customSongs);
  const playlistRef = useRef(playlist);
  const profileRef = useRef(profileName);
  profileRef.current = profileName;

  const lastSyncedRef = useRef<string | null>(null);
  const cloudReadyRef = useRef(false);

  // ---- Aplicar listas ------------------------------------------------------
  /** Mudanca feita pelo usuario: so vai para o localStorage se nao ha perfil. */
  const commitCustom = useCallback((next: StoredSong[]) => {
    customRef.current = next;
    setCustomSongs(next);
    if (!profileRef.current) localSongRepository.replaceAll(next);
  }, []);

  const commitPlaylist = useCallback((next: StoredSong[]) => {
    playlistRef.current = next;
    setPlaylist(next);
    if (!profileRef.current) localPlaylistRepository.replaceAll(next);
  }, []);

  /** Troca as listas por outras vindas de fora (nuvem ou backup local). Nao grava nada. */
  const replaceLists = useCallback((nextCustom: StoredSong[], nextPlaylist: StoredSong[]) => {
    customRef.current = nextCustom;
    playlistRef.current = nextPlaylist;
    setCustomSongs(nextCustom);
    setPlaylist(nextPlaylist);
  }, []);

  // ---- Confirma o nome depois de uma pausa na digitacao --------------------
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const clean = nameInput.trim().slice(0, PROFILE_NAME_MAX);
      setProfileName(clean);
      writeJson(STORAGE_KEYS.profileName, clean);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [nameInput]);

  // ---- Ao definir/trocar o nome: observa o perfil na nuvem -----------------
  useEffect(() => {
    cloudReadyRef.current = false; // ainda nao carregou este nome
    setCloudError('');

    if (!profileName) {
      setCloudStatus('idle');
      replaceLists(localSongRepository.list(), localPlaylistRepository.list());
      return;
    }

    lastSyncedRef.current = null;
    setCloudStatus('loading');
    return watchProfile(
      profileName,
      (profile) => {
        lastSyncedRef.current = serialize(profile.customSongs, profile.playlist);
        cloudReadyRef.current = true;
        replaceLists(profile.customSongs, profile.playlist);
        setCloudStatus('saved');
      },
      () => {
        // Nome sem nada salvo: comeca vazio.
        lastSyncedRef.current = serialize([], []);
        cloudReadyRef.current = true;
        replaceLists([], []);
        setCloudStatus('idle');
      },
      (message) => {
        setCloudError(message);
        setCloudStatus('error');
      },
    );
  }, [profileName, replaceLists]);

  // ---- Envia as mudancas para a nuvem (com pausa) --------------------------
  useEffect(() => {
    if (!profileName || !cloudReadyRef.current) return;
    const json = serialize(customSongs, playlist);
    // Evita reenviar o que acabou de chegar da propria nuvem (eco do listener).
    if (json === lastSyncedRef.current) return;

    setCloudStatus('syncing');
    const timer = window.setTimeout(() => {
      saveProfile(profileName, { customSongs, playlist })
        .then(() => {
          lastSyncedRef.current = json;
          setCloudError('');
          setCloudStatus('saved');
        })
        .catch((error: unknown) => {
          setCloudError(error instanceof Error ? error.message : 'Falha ao salvar.');
          setCloudStatus('error');
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [customSongs, playlist, profileName]);

  // ---- Acoes ---------------------------------------------------------------
  const saveCustom = useCallback(
    (name: string, events: SongEvent[]) => {
      commitCustom(addCustomSong(customRef.current, name, events));
    },
    [commitCustom],
  );

  const removeCustom = useCallback(
    (id: string) => commitCustom(removeSong(customRef.current, id)),
    [commitCustom],
  );

  const addToPlaylistAction = useCallback(
    (name: string, events: SongEvent[]) => {
      const { list, updated } = addToPlaylist(playlistRef.current, name, events);
      commitPlaylist(list);
      return updated;
    },
    [commitPlaylist],
  );

  const renameInPlaylist = useCallback(
    (id: string, name: string) => commitPlaylist(renameSong(playlistRef.current, id, name)),
    [commitPlaylist],
  );

  const moveInPlaylist = useCallback(
    (id: string, direction: -1 | 1) => commitPlaylist(moveSong(playlistRef.current, id, direction)),
    [commitPlaylist],
  );

  const removeFromPlaylist = useCallback(
    (id: string) => commitPlaylist(removeSong(playlistRef.current, id)),
    [commitPlaylist],
  );

  return {
    customSongs,
    playlist,
    nameInput,
    setNameInput,
    profileName,
    cloudStatus,
    cloudError,
    saveCustom,
    removeCustom,
    addToPlaylist: addToPlaylistAction,
    renameInPlaylist,
    moveInPlaylist,
    removeFromPlaylist,
  };
}
