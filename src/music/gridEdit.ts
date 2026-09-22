/* ==========================================================================
   gridEdit.ts
   Operacoes usadas pelo Piano Roll (grade estilo "arraste e solte").

   O modelo de dados continua o mesmo SongEvent[] sequencial de sempre: cada
   evento comeca onde o anterior termina, sem posicao absoluta guardada. Isso
   e proposital, porque o resto do app (Timeline, exportacao, importacao)
   ja confia nesse formato e nao precisa mudar.

   O truque para simular "arrastar livremente" em cima desse modelo:
   - MOVER = liberar o espaco antigo (vira silencio, funde com vizinhos) e
     depois inserir a nota de novo na nova posicao (dividindo o silencio que
     estiver la).
   - REDIMENSIONAR = muda a duracao da propria nota e absorve/devolve tempo
     do silencio logo depois dela. Nunca invade a proxima nota: e isso que
     garante a monofonia sem precisar de nenhuma verificacao extra de
     sobreposicao.

   Todas as funcoes recebem e devolvem SongEvent[], como o resto de music/.
   ========================================================================== */

import type { NoteInfo } from './notes';
import type { SongEvent } from './songTypes';
import { createNoteEvent, createRestEvent, indexOfId, makeId, startTimes } from './songUtils';

/** Duracao minima que uma nota pode ter na grade, em ms. */
export const MIN_GRID_DURATION = 20;

/** Junta silencios vizinhos em um so. Mantem a lista arrumada apos edicoes. */
export function mergeAdjacentRests(events: SongEvent[]): SongEvent[] {
  const result: SongEvent[] = [];
  for (const event of events) {
    const last = result[result.length - 1];
    if (last && last.type === 'rest' && event.type === 'rest') {
      last.duration += event.duration;
    } else {
      result.push({ ...event });
    }
  }
  return result;
}

/** Descobre em que indice e em que instante (relativo ao evento) um ms cai. */
function locate(events: SongEvent[], atMs: number): { index: number; offset: number } | null {
  const starts = startTimes(events);
  for (let i = 0; i < events.length; i++) {
    const start = starts[i];
    const end = start + events[i].duration;
    if (atMs >= start && atMs < end) return { index: i, offset: atMs - start };
  }
  return null;
}

/** Quanto de silencio livre existe a partir de um ponto dentro de um rest. */
function freeSpaceFrom(events: SongEvent[], index: number, offset: number): number {
  const event = events[index];
  if (!event || event.type !== 'rest') return 0;
  return event.duration - offset;
}

/**
 * Insere um evento JA PRONTO (preservando seu id) em um ponto exato da
 * grade, dividindo o silencio que estiver ali. Se o ponto cair em cima de
 * outra nota (ocupado), devolve a lista sem alteracao — quem chama reconhece
 * isso comparando o array de volta com o original (===).
 *
 * A duracao do evento e reduzida automaticamente se nao houver espaco livre
 * suficiente ate a proxima nota.
 */
function insertEventAt(events: SongEvent[], atMs: number, event: SongEvent): SongEvent[] {
  if (events.length === 0) {
    const duration = Math.max(MIN_GRID_DURATION, event.duration);
    return [{ ...event, duration }];
  }

  const target = locate(events, Math.max(0, atMs));
  // Ponto depois do fim da musica: completa com silencio ate la, se precisar.
  if (!target) {
    const total = startTimes(events).reduce(
      (acc, start, i) => Math.max(acc, start + events[i].duration),
      0,
    );
    const gap = atMs - total;
    const next = events.slice();
    if (gap > 0) next.push(createRestEvent(gap));
    next.push({ ...event, duration: Math.max(MIN_GRID_DURATION, event.duration) });
    return next;
  }

  const { index, offset } = target;
  const slot = events[index];

  // O ponto cai em cima de uma nota: espaco ocupado, nao encaixamos nada.
  if (slot.type === 'note') return events;

  const available = freeSpaceFrom(events, index, offset);
  const duration = Math.max(MIN_GRID_DURATION, Math.min(event.duration, available));
  if (duration < MIN_GRID_DURATION) return events;

  const before = offset;
  const after = slot.duration - offset - duration;

  const replacement: SongEvent[] = [];
  if (before > 0) replacement.push(createRestEvent(before));
  replacement.push({ ...event, duration });
  if (after > 0) replacement.push(createRestEvent(after));

  const next = events.slice();
  next.splice(index, 1, ...replacement);
  return next;
}

/**
 * Cria uma nota nova em um ponto exato da grade (com id novo). Usada quando
 * o aluno clica num espaço vazio para adicionar uma nota que ainda não
 * existe.
 */
export function insertNoteAt(
  events: SongEvent[],
  atMs: number,
  note: NoteInfo,
  requestedDuration: number,
): SongEvent[] {
  return insertEventAt(events, atMs, createNoteEvent(note, requestedDuration));
}

/**
 * Remove uma nota deixando silencio no lugar (o resto da musica nao se
 * move). E o comportamento padrao de apagar na grade.
 */
export function removeAsRest(events: SongEvent[], id: string): SongEvent[] {
  const index = indexOfId(events, id);
  if (index < 0) return events;
  const replaced = events.slice();
  replaced[index] = createRestEvent(events[index].duration);
  return mergeAdjacentRests(replaced);
}

/**
 * Move uma nota para um novo instante e/ou uma nova nota (pitch), mantendo o
 * mesmo id (é a mesma nota, só em outro lugar — importante para a seleção
 * não se perder no meio do arrasto). O espaço antigo vira silêncio; a
 * duração é preservada quando há espaço, ou reduzida até `MIN_GRID_DURATION`
 * quando o destino for apertado. Se nem o mínimo couber, a nota volta para o
 * lugar original (o movimento é cancelado).
 */
export function moveNote(
  events: SongEvent[],
  id: string,
  newAtMs: number,
  newNote: NoteInfo,
): SongEvent[] {
  const index = indexOfId(events, id);
  if (index < 0) return events;
  const original = events[index];

  const released = removeAsRest(events, id);
  const moved: SongEvent = {
    id: original.id,
    note: newNote.name,
    frequency: newNote.frequency,
    duration: original.duration,
    type: 'note',
  };
  const inserted = insertEventAt(released, Math.max(0, newAtMs), moved);

  // Se a insercao nao coube em lugar nenhum (destino ocupado ou sem espaco
  // ate para o minimo), o array volta identico ao "released": desfazemos e
  // devolvemos a musica original, sem mover nada.
  if (inserted === released) return events;
  return inserted;
}

/**
 * Estica ou encolhe a nota pela borda direita. Cresce comendo o silencio
 * seguinte; nunca ultrapassa a proxima nota (isso e o que garante que a
 * grade continua monofonica sem checagem extra).
 */
export function resizeNote(events: SongEvent[], id: string, newDuration: number): SongEvent[] {
  const index = indexOfId(events, id);
  if (index < 0 || events[index].type !== 'note') return events;

  const nextEvent = events[index + 1];
  const maxDuration =
    nextEvent && nextEvent.type === 'rest'
      ? events[index].duration + nextEvent.duration
      : nextEvent
        ? events[index].duration // ja encostada na proxima nota: nao ha o que crescer
        : Infinity; // ultimo evento da musica: pode crescer livremente

  const safeDuration = Math.max(MIN_GRID_DURATION, Math.min(newDuration, maxDuration));
  const delta = safeDuration - events[index].duration;
  if (delta === 0) return events;

  const next = events.slice();
  next[index] = { ...next[index], duration: safeDuration };

  if (delta > 0 && nextEvent && nextEvent.type === 'rest') {
    const remaining = nextEvent.duration - delta;
    if (remaining > 0) {
      next[index + 1] = { ...nextEvent, duration: remaining };
    } else {
      next.splice(index + 1, 1);
    }
  } else if (delta < 0) {
    if (nextEvent && nextEvent.type === 'rest') {
      next[index + 1] = { ...nextEvent, duration: nextEvent.duration - delta };
    } else {
      next.splice(index + 1, 0, createRestEvent(-delta));
    }
  }

  return next;
}

/** Ponto de encaixe (snap) mais proximo, para o clique/arrasto ficar preciso. */
export function snapToGrid(ms: number, gridStep: number): number {
  if (gridStep <= 0) return Math.round(ms);
  return Math.max(0, Math.round(ms / gridStep) * gridStep);
}

/** Um id novo, usado quando o Piano Roll precisa criar uma nota "solta". */
export function newEventId(): string {
  return makeId();
}
