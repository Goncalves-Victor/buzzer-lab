/* ==========================================================================
   playlist.ts
   A playlist do aluno: as musicas que vao juntas para o ESP32.

   Diferente de "Meus exemplos", aqui a ORDEM importa: e a ordem em que as
   musicas aparecem no menu do OLED. Por isso a lista nunca e reordenada por
   data de criacao.

   Como em customSongs.ts, o resto do app so conhece a interface
   PlaylistRepository. Trocar por nuvem depois e escrever outra implementacao.
   ========================================================================== */

import type { SongEvent, StoredSong } from '../music/songTypes';
import { sanitizeEvents } from '../music/songUtils';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

/** Maximo de letras do nome que cabe numa linha do OLED (21 colunas no tamanho 1). */
export const PLAYLIST_NAME_MAX = 20;

export interface PlaylistAddResult {
  /** true quando ja existia uma musica com esse nome e ela foi atualizada. */
  updated: boolean;
}

export interface PlaylistRepository {
  list(): StoredSong[];
  /** Adiciona no fim. Se o nome ja existe, atualiza a musica no mesmo lugar. */
  add(name: string, events: SongEvent[]): PlaylistAddResult;
  remove(id: string): void;
  rename(id: string, name: string): void;
  move(id: string, direction: -1 | 1): void;
}

function sanitize(raw: unknown): StoredSong[] {
  if (!Array.isArray(raw)) return [];
  const result: StoredSong[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const song = item as Partial<StoredSong>;
    if (typeof song.id !== 'string' || typeof song.name !== 'string') continue;
    // Passa pelo mesmo filtro do localStorage da musica atual: JSON editado a
    // mao ou de versao antiga nao pode derrubar a exportacao.
    const events = sanitizeEvents(song.events);
    if (events.length === 0) continue;
    result.push({
      id: song.id,
      name: song.name,
      events,
      createdAt: typeof song.createdAt === 'number' ? song.createdAt : 0,
    });
  }
  return result;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function cleanName(name: string): string {
  return name.trim().slice(0, 40) || 'Sem nome';
}

export const localPlaylistRepository: PlaylistRepository = {
  list() {
    return sanitize(readJson<unknown>(STORAGE_KEYS.playlist, []));
  },

  add(name, events) {
    const finalName = cleanName(name);
    // Copia profunda simples: a playlist nao pode mudar junto com a musica aberta.
    const copy = events.map((e) => ({ ...e }));
    const all = this.list();
    const existing = all.findIndex((song) => sameName(song.name, finalName));

    if (existing >= 0) {
      all[existing] = { ...all[existing], events: copy };
      writeJson(STORAGE_KEYS.playlist, all);
      return { updated: true };
    }

    all.push({
      id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`,
      name: finalName,
      events: copy,
      createdAt: Date.now(),
    });
    writeJson(STORAGE_KEYS.playlist, all);
    return { updated: false };
  },

  remove(id) {
    writeJson(
      STORAGE_KEYS.playlist,
      this.list().filter((song) => song.id !== id),
    );
  },

  rename(id, name) {
    writeJson(
      STORAGE_KEYS.playlist,
      this.list().map((song) => (song.id === id ? { ...song, name: cleanName(name) } : song)),
    );
  },

  move(id, direction) {
    const all = this.list();
    const index = all.findIndex((song) => song.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= all.length) return;
    const [item] = all.splice(index, 1);
    all.splice(target, 0, item);
    writeJson(STORAGE_KEYS.playlist, all);
  },
};
