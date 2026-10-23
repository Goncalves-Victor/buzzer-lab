/* ==========================================================================
   songLists.ts
   Operacoes PURAS sobre listas de StoredSong ("Meus exemplos" e playlist).

   Ficam fora dos repositorios porque a mesma lista pode viver em dois
   lugares: no localStorage (sem perfil) ou na nuvem (com perfil). As duas
   formas usam exatamente estas funcoes; so muda onde o resultado e guardado.

   Todas devolvem um array NOVO e nunca mexem no que receberam.
   ========================================================================== */

import type { SongEvent, StoredSong } from '../music/songTypes';
import { sanitizeEvents } from '../music/songUtils';

export interface PlaylistAddResult {
  list: StoredSong[];
  /** true quando ja existia uma musica com esse nome e ela foi atualizada. */
  updated: boolean;
}

/** Nome de musica aceito nas listas (o campo de nome do app tambem limita em 40). */
function cleanName(name: string): string {
  return name.trim().slice(0, 40) || 'Sem nome';
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

/** Copia profunda simples: a musica guardada nao pode mudar junto com a aberta. */
function copyEvents(events: SongEvent[]): SongEvent[] {
  return events.map((e) => ({ ...e }));
}

/**
 * Valida o que vem do localStorage ou da nuvem. Aceita array OU objeto com
 * chaves numericas (e assim que o Firebase devolve uma lista com buracos), e
 * descarta o que nao for reconhecido: dado corrompido nao derruba o app.
 */
export function sanitizeStoredSongs(raw: unknown): StoredSong[] {
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null
      ? Object.values(raw)
      : [];

  const result: StoredSong[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const song = item as Partial<StoredSong>;
    if (typeof song.id !== 'string' || typeof song.name !== 'string') continue;
    const events = sanitizeEvents(song.events);
    if (events.length === 0) continue;
    // A ordem das chaves e fixa de proposito: o app compara JSON para saber
    // se algo mudou de verdade (ver useLibrary).
    result.push({
      id: song.id,
      name: song.name,
      events,
      createdAt: typeof song.createdAt === 'number' ? song.createdAt : 0,
    });
  }
  return result;
}

// --------------------------------------------------------------------------
// "Meus exemplos": a mais nova aparece primeiro
// --------------------------------------------------------------------------

export function addCustomSong(list: StoredSong[], name: string, events: SongEvent[]): StoredSong[] {
  const song: StoredSong = {
    id: newId('s'),
    name: cleanName(name),
    events: copyEvents(events),
    createdAt: Date.now(),
  };
  return [song, ...list];
}

export function removeSong(list: StoredSong[], id: string): StoredSong[] {
  return list.filter((song) => song.id !== id);
}

// --------------------------------------------------------------------------
// Playlist: a ORDEM importa (e a ordem do menu no OLED)
// --------------------------------------------------------------------------

/** Adiciona no fim. Se o nome ja existe, atualiza a musica no mesmo lugar. */
export function addToPlaylist(
  list: StoredSong[],
  name: string,
  events: SongEvent[],
): PlaylistAddResult {
  const finalName = cleanName(name);
  const existing = list.findIndex((song) => sameName(song.name, finalName));

  if (existing >= 0) {
    const next = list.slice();
    next[existing] = { ...next[existing], events: copyEvents(events) };
    return { list: next, updated: true };
  }

  const song: StoredSong = {
    id: newId('p'),
    name: finalName,
    events: copyEvents(events),
    createdAt: Date.now(),
  };
  return { list: [...list, song], updated: false };
}

export function renameSong(list: StoredSong[], id: string, name: string): StoredSong[] {
  return list.map((song) => (song.id === id ? { ...song, name: cleanName(name) } : song));
}

export function moveSong(list: StoredSong[], id: string, direction: -1 | 1): StoredSong[] {
  const index = list.findIndex((song) => song.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
