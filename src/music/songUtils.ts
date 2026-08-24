/* ==========================================================================
   songUtils.ts
   Operacoes puras sobre SongEvent[].

   Todas as funcoes devolvem um NOVO array. Isso e proposital: o historico de
   desfazer/refazer guarda snapshots e depende de imutabilidade.
   ========================================================================== */

import { REST_NAME, getNote, describeFrequency } from './notes';
import type { NoteInfo } from './notes';
import type { SongEvent } from './songTypes';

let idCounter = 0;

/** Ids curtos e unicos dentro da sessao. Nao precisam sobreviver ao reload. */
export function makeId(): string {
  idCounter += 1;
  return `e${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function createNoteEvent(note: NoteInfo, duration: number): SongEvent {
  return {
    id: makeId(),
    note: note.name,
    frequency: note.frequency,
    duration: Math.max(1, Math.round(duration)),
    type: 'note',
  };
}

export function createRestEvent(duration: number): SongEvent {
  return {
    id: makeId(),
    note: REST_NAME,
    frequency: 0,
    duration: Math.max(1, Math.round(duration)),
    type: 'rest',
  };
}

/** Cria um evento a partir de uma frequencia livre (usado na importacao). */
export function createEventFromFrequency(frequency: number, duration: number): SongEvent {
  if (frequency <= 0) return createRestEvent(duration);
  const known = getNote(describeFrequency(frequency));
  if (known) return createNoteEvent(known, duration);
  return {
    id: makeId(),
    note: describeFrequency(frequency),
    frequency,
    duration: Math.max(1, Math.round(duration)),
    type: 'note',
  };
}

export function totalDuration(events: SongEvent[]): number {
  return events.reduce((sum, e) => sum + e.duration, 0);
}

export function countNotes(events: SongEvent[]): number {
  return events.filter((e) => e.type === 'note').length;
}

export function countRests(events: SongEvent[]): number {
  return events.filter((e) => e.type === 'rest').length;
}

/** Instante inicial (ms) de cada evento, acumulado. Usado pela timeline/player. */
export function startTimes(events: SongEvent[]): number[] {
  const times: number[] = [];
  let acc = 0;
  for (const e of events) {
    times.push(acc);
    acc += e.duration;
  }
  return times;
}

/** Indice do evento que esta tocando em um instante (ms). -1 se passou do fim. */
export function indexAtTime(events: SongEvent[], timeMs: number): number {
  let acc = 0;
  for (let i = 0; i < events.length; i++) {
    acc += events[i].duration;
    if (timeMs < acc) return i;
  }
  return -1;
}

export function indexOfId(events: SongEvent[], id: string | null): number {
  if (!id) return -1;
  return events.findIndex((e) => e.id === id);
}

// --------------------------------------------------------------------------
// Operacoes de edicao
// --------------------------------------------------------------------------

export function updateEvent(
  events: SongEvent[],
  id: string,
  patch: Partial<Omit<SongEvent, 'id'>>,
): SongEvent[] {
  return events.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

export function removeEvent(events: SongEvent[], id: string): SongEvent[] {
  return events.filter((e) => e.id !== id);
}

export function duplicateEvent(events: SongEvent[], id: string): SongEvent[] {
  const index = indexOfId(events, id);
  if (index < 0) return events;
  const copy: SongEvent = { ...events[index], id: makeId() };
  const next = events.slice();
  next.splice(index + 1, 0, copy);
  return next;
}

/** Insere um evento em uma posicao. index === events.length adiciona no fim. */
export function insertAt(events: SongEvent[], index: number, event: SongEvent): SongEvent[] {
  const next = events.slice();
  const safe = Math.max(0, Math.min(index, events.length));
  next.splice(safe, 0, event);
  return next;
}

export function moveEvent(events: SongEvent[], id: string, direction: -1 | 1): SongEvent[] {
  const index = indexOfId(events, id);
  if (index < 0) return events;
  const target = index + direction;
  if (target < 0 || target >= events.length) return events;
  const next = events.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

/** Reordena por arrasto (drag-and-drop). Mantido separado de moveEvent. */
export function reorder(events: SongEvent[], fromIndex: number, toIndex: number): SongEvent[] {
  if (fromIndex === toIndex) return events;
  if (fromIndex < 0 || fromIndex >= events.length) return events;
  const next = events.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
  return next;
}

// --------------------------------------------------------------------------
// Formatacao para a interface (sempre em portugues)
// --------------------------------------------------------------------------

/** 2450 -> "2,45 s". Usado nos resumos. */
export function formatSeconds(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} s`;
}

/** 7250 -> "00:07.250". Usado no cronometro de gravacao/reproducao. */
export function formatTimecode(ms: number): string {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = Math.floor(safe % 1000);
  const pad = (n: number, size: number) => String(n).padStart(size, '0');
  return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

/**
 * Valida dados vindos do localStorage.
 * Uma versao antiga do app, ou um JSON editado a mao, nao pode derrubar a
 * aplicacao: o que nao for reconhecido simplesmente e descartado.
 */
export function sanitizeEvents(raw: unknown): SongEvent[] {
  if (!Array.isArray(raw)) return [];
  const result: SongEvent[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const candidate = item as Partial<SongEvent>;
    const duration = candidate.duration;
    const frequency = candidate.frequency;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) continue;
    if (typeof frequency !== 'number' || !Number.isFinite(frequency) || frequency < 0) continue;

    const type = candidate.type === 'rest' || frequency === 0 ? 'rest' : 'note';
    result.push({
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : makeId(),
      note:
        type === 'rest'
          ? REST_NAME
          : typeof candidate.note === 'string' && candidate.note
            ? candidate.note
            : describeFrequency(frequency),
      frequency: type === 'rest' ? 0 : frequency,
      duration: Math.round(duration),
      type,
    });
  }
  return result;
}

/** Texto curto do evento para leitores de tela e tooltips. */
export function describeEvent(event: SongEvent): string {
  return event.type === 'rest'
    ? `Pausa de ${event.duration} ms`
    : `Nota ${event.note} (${event.frequency} Hz) por ${event.duration} ms`;
}
