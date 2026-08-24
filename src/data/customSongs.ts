/* ==========================================================================
   customSongs.ts
   "Meus exemplos": musicas salvas pelo proprio aluno.

   O editor nunca fala com o localStorage diretamente. Ele fala com a interface
   SongRepository. Trocar o armazenamento local por sincronizacao na nuvem
   depois e escrever uma nova implementacao desta interface, sem tocar na
   timeline nem no editor.
   ========================================================================== */

import type { SongEvent, StoredSong } from '../music/songTypes';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

export interface SongRepository {
  list(): StoredSong[];
  save(name: string, events: SongEvent[]): StoredSong;
  remove(id: string): void;
  rename(id: string, name: string): void;
}

function sanitize(raw: unknown): StoredSong[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is StoredSong => {
    if (typeof item !== 'object' || item === null) return false;
    const song = item as Partial<StoredSong>;
    return (
      typeof song.id === 'string' && typeof song.name === 'string' && Array.isArray(song.events)
    );
  });
}

export const localSongRepository: SongRepository = {
  list() {
    return sanitize(readJson<unknown>(STORAGE_KEYS.customSongs, [])).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  },

  save(name, events) {
    const song: StoredSong = {
      id: `s${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`,
      name: name.trim() || 'Sem nome',
      // Copia profunda simples: a musica salva nao pode mudar junto com a atual.
      events: events.map((e) => ({ ...e })),
      createdAt: Date.now(),
    };
    const all = this.list();
    writeJson(STORAGE_KEYS.customSongs, [song, ...all]);
    return song;
  },

  remove(id) {
    writeJson(
      STORAGE_KEYS.customSongs,
      this.list().filter((song) => song.id !== id),
    );
  },

  rename(id, name) {
    writeJson(
      STORAGE_KEYS.customSongs,
      this.list().map((song) => (song.id === id ? { ...song, name: name.trim() || song.name } : song)),
    );
  },
};
