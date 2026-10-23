/* ==========================================================================
   playlist.ts
   A playlist do aluno: as musicas que vao juntas para o ESP32.

   Diferente de "Meus exemplos", aqui a ORDEM importa: e a ordem em que as
   musicas aparecem no menu do OLED. Por isso a lista nunca e reordenada por
   data de criacao.

   Este repositorio guarda no localStorage quando NAO ha perfil (nome) ativo.
   Ele so sabe ler e gravar a lista inteira; as operacoes (adicionar, mover,
   renomear...) sao as funcoes puras de songLists.ts.
   ========================================================================== */

import type { StoredSong } from '../music/songTypes';
import { sanitizeStoredSongs } from './songLists';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

/** Maximo de letras do nome que cabe numa linha do OLED (21 colunas no tamanho 1). */
export const PLAYLIST_NAME_MAX = 20;

export interface PlaylistRepository {
  list(): StoredSong[];
  replaceAll(songs: StoredSong[]): void;
}

export const localPlaylistRepository: PlaylistRepository = {
  list() {
    return sanitizeStoredSongs(readJson<unknown>(STORAGE_KEYS.playlist, []));
  },

  replaceAll(songs) {
    writeJson(STORAGE_KEYS.playlist, songs);
  },
};
