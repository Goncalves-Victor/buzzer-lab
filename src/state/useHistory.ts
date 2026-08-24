/* ==========================================================================
   useHistory.ts
   Historico de snapshots para Desfazer / Refazer.

   Guardamos copias do estado inteiro (e nao "acoes") porque a musica e um
   array pequeno e imutavel: snapshot e mais simples de acertar e nunca fica
   fora de sincronia com a edicao.

   O limite evita que o historico cresca sem parar durante uma aula inteira.
   ========================================================================== */

import { useCallback, useRef, useState } from 'react';

export interface History<T> {
  present: T;
  /** Altera o estado criando um ponto no historico. */
  commit: (updater: T | ((current: T) => T)) => void;
  /** Altera o estado SEM criar ponto no historico (ex.: carregar do storage). */
  replace: (value: T) => void;
  /** Recomeca do zero, apagando o historico (ex.: "Nova música"). */
  reset: (value: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 80;

export function useHistory<T>(initial: T, limit = HISTORY_LIMIT): History<T> {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  // Guarda o valor atual em ref para o commit funcional nao depender de state
  // nas dependencias dos callbacks (evita recriar handlers a cada edicao).
  const presentRef = useRef(initial);
  presentRef.current = state.present;

  const commit = useCallback(
    (updater: T | ((current: T) => T)) => {
      setState((prev) => {
        const next =
          typeof updater === 'function' ? (updater as (current: T) => T)(prev.present) : updater;
        if (Object.is(next, prev.present)) return prev;
        const past = [...prev.past, prev.present];
        if (past.length > limit) past.shift();
        return { past, present: next, future: [] };
      });
    },
    [limit],
  );

  const replace = useCallback((value: T) => {
    setState((prev) => (Object.is(value, prev.present) ? prev : { ...prev, present: value }));
  }, []);

  const reset = useCallback((value: T) => {
    setState({ past: [], present: value, future: [] });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future].slice(0, limit),
      };
    });
  }, [limit]);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const [next, ...rest] = prev.future;
      const past = [...prev.past, prev.present];
      if (past.length > limit) past.shift();
      return { past, present: next, future: rest };
    });
  }, [limit]);

  return {
    present: state.present,
    commit,
    replace,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
