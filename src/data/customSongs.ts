/* ==========================================================================
   customSongs.ts
   "Meus exemplos": musicas salvas pelo proprio aluno, guardadas no
   localStorage quando NAO ha perfil (nome) ativo.

   Este repositorio so sabe LER e GRAVAR a lista inteira. As operacoes
   (adicionar, excluir...) sao as funcoes puras de songLists.ts, que servem
   tambem para a lista do perfil na nuvem (ver state/useLibrary.ts).
   ========================================================================== */

import type { StoredSong } from '../music/songTypes';
import { sanitizeStoredSongs } from './songLists';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

export interface SongRepository {
  list(): StoredSong[];
  replaceAll(songs: StoredSong[]): void;
}

export const localSongRepository: SongRepository = {
  list() {
    return sanitizeStoredSongs(readJson<unknown>(STORAGE_KEYS.customSongs, []));
  },

  replaceAll(songs) {
    writeJson(STORAGE_KEYS.customSongs, songs);
  },
};
