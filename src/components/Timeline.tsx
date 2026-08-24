/* ==========================================================================
   Timeline.tsx
   Sequencia da musica.

   O arrastar-e-soltar existe, mas TODA operacao tambem tem botao. Isso mantem
   a ferramenta utilizavel em touchscreen e por criancas, que e o publico alvo.
   ========================================================================== */

import { useEffect, useRef } from 'react';
import type { SongEvent } from '../music/songTypes';
import { formatSeconds, totalDuration } from '../music/songUtils';
import { TimelineEvent } from './TimelineEvent';

interface TimelineProps {
  events: SongEvent[];
  selectedId: string | null;
  selectedIndex: number;
  playingIndex: number;
  onSelect: (id: string | null) => void;
  onAddRest: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClear: () => void;
  onQuantize: () => void;
}

export function Timeline({
  events,
  selectedId,
  selectedIndex,
  playingIndex,
  onSelect,
  onAddRest,
  onDelete,
  onDuplicate,
  onMove,
  onInsertBefore,
  onInsertAfter,
  onReorder,
  onClear,
  onQuantize,
}: TimelineProps) {
  const dragFrom = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hasSelection = selectedIndex >= 0;

  // Mantem o bloco que esta tocando visivel durante a reproducao.
  useEffect(() => {
    if (playingIndex < 0 || !trackRef.current) return;
    const child = trackRef.current.children[playingIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [playingIndex]);

  return (
    <section className="panel timeline-panel" aria-label="Linha do tempo da música">
      <header className="panel-head">
        <h2 className="panel-title">Linha do tempo</h2>
        <span className="panel-meta">
          {events.length} {events.length === 1 ? 'passo' : 'passos'} ·{' '}
          {formatSeconds(totalDuration(events))}
        </span>
      </header>

      {events.length === 0 ? (
        <p className="empty-state">
          Sua música está vazia. Clique em <strong>Gravar</strong> e toque o piano, ou abra um
          exemplo pronto.
        </p>
      ) : (
        <div className="timeline-track" ref={trackRef} role="list">
          {events.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              index={index}
              selected={event.id === selectedId}
              playing={index === playingIndex}
              onSelect={onSelect}
              onDragStartIndex={(from) => {
                dragFrom.current = from;
              }}
              onDropIndex={(to) => {
                if (dragFrom.current !== null && dragFrom.current !== to) {
                  onReorder(dragFrom.current, to);
                }
                dragFrom.current = null;
              }}
            />
          ))}
        </div>
      )}

      <div className="timeline-tools">
        <button type="button" className="btn btn-small" onClick={onAddRest}>
          + Adicionar pausa
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={onInsertBefore}
          disabled={!hasSelection}
        >
          ⇤ Inserir antes
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={onInsertAfter}
          disabled={!hasSelection}
        >
          ⇥ Inserir depois
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => onMove(-1)}
          disabled={!hasSelection || selectedIndex === 0}
        >
          ← Mover
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => onMove(1)}
          disabled={!hasSelection || selectedIndex === events.length - 1}
        >
          Mover →
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={onDuplicate}
          disabled={!hasSelection}
        >
          ⧉ Duplicar
        </button>
        <button
          type="button"
          className="btn btn-small btn-danger"
          onClick={onDelete}
          disabled={!hasSelection}
        >
          🗑 Excluir
        </button>

        <span className="timeline-tools-gap" aria-hidden="true" />

        <button
          type="button"
          className="btn btn-small"
          onClick={onQuantize}
          disabled={events.length === 0}
        >
          ⏱ Ajustar tempos
        </button>
        <button
          type="button"
          className="btn btn-small btn-ghost"
          onClick={onClear}
          disabled={events.length === 0}
        >
          Limpar música
        </button>
      </div>
    </section>
  );
}
