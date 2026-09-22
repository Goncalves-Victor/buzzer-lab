/* ==========================================================================
   useSong.ts
   Fonte de verdade da aplicacao.

   Timeline, editor, player e gerador de codigo consomem TODOS este mesmo
   SongEvent[]. Nenhum deles guarda copia propria da musica.
   ========================================================================== */

import { useCallback, useMemo, useState } from 'react';
import type { NoteInfo } from '../music/notes';
import type { SongEvent } from '../music/songTypes';
import {
  createNoteEvent,
  createRestEvent,
  duplicateEvent,
  indexOfId,
  insertAt,
  moveEvent,
  removeEvent,
  reorder,
  updateEvent,
} from '../music/songUtils';
import { useHistory } from './useHistory';

/** Duracao usada quando o usuario adiciona um evento manualmente. */
export const DEFAULT_NEW_DURATION = 250;

export interface SongController {
  events: SongEvent[];
  selectedId: string | null;
  selectedIndex: number;
  selectedEvent: SongEvent | null;

  select: (id: string | null) => void;
  selectByIndex: (index: number) => void;

  /** Substitui a musica inteira criando um ponto no historico. */
  setEvents: (events: SongEvent[]) => void;
  /** Substitui sem criar ponto no historico (carregamento inicial). */
  loadEvents: (events: SongEvent[]) => void;
  /** Comeca do zero e limpa o historico. */
  resetEvents: (events: SongEvent[]) => void;

  appendEvents: (events: SongEvent[]) => void;
  addNote: (note: NoteInfo, duration?: number) => void;
  addRest: (duration?: number) => void;
  insertRelativeToSelection: (event: SongEvent, position: 'before' | 'after') => void;
  updateSelected: (patch: Partial<Omit<SongEvent, 'id'>>) => void;
  deleteSelected: () => void;
  /** Apaga um evento especifico por id, deslocando o resto da musica. Usado
   * pelo Piano Roll no botao "Apagar e puxar o resto". */
  deleteById: (id: string) => void;
  duplicateSelected: () => void;
  moveSelected: (direction: -1 | 1) => void;
  moveByDrag: (fromIndex: number, toIndex: number) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useSong(initial: SongEvent[] = []): SongController {
  const history = useHistory<SongEvent[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = history.present;

  const selectedIndex = useMemo(() => indexOfId(events, selectedId), [events, selectedId]);
  const selectedEvent = selectedIndex >= 0 ? events[selectedIndex] : null;

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const selectByIndex = useCallback(
    (index: number) => {
      setSelectedId(index >= 0 && index < events.length ? events[index].id : null);
    },
    [events],
  );

  const setEvents = useCallback((next: SongEvent[]) => history.commit(next), [history]);

  const loadEvents = useCallback((next: SongEvent[]) => history.replace(next), [history]);

  const resetEvents = useCallback(
    (next: SongEvent[]) => {
      history.reset(next);
      setSelectedId(null);
    },
    [history],
  );

  const appendEvents = useCallback(
    (added: SongEvent[]) => {
      if (added.length === 0) return;
      history.commit((current) => [...current, ...added]);
    },
    [history],
  );

  /**
   * Insere logo depois do evento selecionado; sem selecao, vai para o fim.
   * O evento novo ja fica selecionado para o aluno editar na hora.
   */
  const insertRelativeToSelection = useCallback(
    (event: SongEvent, position: 'before' | 'after') => {
      history.commit((current) => {
        const index = indexOfId(current, selectedId);
        if (index < 0) return [...current, event];
        return insertAt(current, position === 'before' ? index : index + 1, event);
      });
      setSelectedId(event.id);
    },
    [history, selectedId],
  );

  const addNote = useCallback(
    (note: NoteInfo, duration = DEFAULT_NEW_DURATION) => {
      insertRelativeToSelection(createNoteEvent(note, duration), 'after');
    },
    [insertRelativeToSelection],
  );

  const addRest = useCallback(
    (duration = DEFAULT_NEW_DURATION) => {
      insertRelativeToSelection(createRestEvent(duration), 'after');
    },
    [insertRelativeToSelection],
  );

  const updateSelected = useCallback(
    (patch: Partial<Omit<SongEvent, 'id'>>) => {
      if (!selectedId) return;
      history.commit((current) => updateEvent(current, selectedId, patch));
    },
    [history, selectedId],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const index = indexOfId(events, selectedId);
    history.commit((current) => removeEvent(current, selectedId));
    // Depois de apagar, seleciona o vizinho para o aluno continuar editando.
    const remaining = events.filter((e) => e.id !== selectedId);
    const nextIndex = Math.min(index, remaining.length - 1);
    setSelectedId(nextIndex >= 0 ? remaining[nextIndex].id : null);
  }, [events, history, selectedId]);

  const deleteById = useCallback(
    (id: string) => {
      const index = indexOfId(events, id);
      if (index < 0) return;
      history.commit((current) => removeEvent(current, id));
      if (id === selectedId) {
        const remaining = events.filter((e) => e.id !== id);
        const nextIndex = Math.min(index, remaining.length - 1);
        setSelectedId(nextIndex >= 0 ? remaining[nextIndex].id : null);
      }
    },
    [events, history, selectedId],
  );

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    history.commit((current) => duplicateEvent(current, selectedId));
  }, [history, selectedId]);

  const moveSelected = useCallback(
    (direction: -1 | 1) => {
      if (!selectedId) return;
      history.commit((current) => moveEvent(current, selectedId, direction));
    },
    [history, selectedId],
  );

  const moveByDrag = useCallback(
    (fromIndex: number, toIndex: number) => {
      history.commit((current) => reorder(current, fromIndex, toIndex));
    },
    [history],
  );

  return {
    events,
    selectedId,
    selectedIndex,
    selectedEvent,
    select,
    selectByIndex,
    setEvents,
    loadEvents,
    resetEvents,
    appendEvents,
    addNote,
    addRest,
    insertRelativeToSelection,
    updateSelected,
    deleteSelected,
    deleteById,
    duplicateSelected,
    moveSelected,
    moveByDrag,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}
