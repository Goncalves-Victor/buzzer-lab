/* ==========================================================================
   TimelineEvent.tsx
   Um bloco da linha do tempo.

   Duas leituras visuais ao mesmo tempo:
   - a LARGURA representa a duracao (bloco largo = nota longa);
   - a ALTURA da barrinha interna representa a altura do som (agudo = alta).

   Assim o aluno enxerga a musica antes mesmo de ouvir.
   ========================================================================== */

import type { SongEvent } from '../music/songTypes';
import { formatHz } from '../music/notes';
import { describeEvent } from '../music/songUtils';

interface TimelineEventProps {
  event: SongEvent;
  index: number;
  selected: boolean;
  playing: boolean;
  onSelect: (id: string) => void;
  onDragStartIndex: (index: number) => void;
  onDropIndex: (index: number) => void;
}

/** Escala logaritmica: nossa percepcao de altura tambem e logaritmica. */
function pitchRatio(frequency: number): number {
  const min = Math.log2(120);
  const max = Math.log2(1100);
  const value = Math.log2(Math.max(120, Math.min(1100, frequency)));
  return (value - min) / (max - min);
}

/** Largura em pixels proporcional a duracao, com limites para caber na tela. */
function blockWidth(duration: number): number {
  return Math.max(46, Math.min(260, 40 + duration * 0.16));
}

export function TimelineEvent({
  event,
  index,
  selected,
  playing,
  onSelect,
  onDragStartIndex,
  onDropIndex,
}: TimelineEventProps) {
  const isRest = event.type === 'rest';
  const ratio = isRest ? 0 : pitchRatio(event.frequency);

  const className = [
    'tl-event',
    isRest ? 'is-rest' : 'is-note',
    selected ? 'is-selected' : '',
    playing ? 'is-playing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      style={{ width: `${blockWidth(event.duration)}px` }}
      onClick={() => onSelect(event.id)}
      aria-pressed={selected}
      aria-label={`Passo ${index + 1}: ${describeEvent(event)}`}
      title={describeEvent(event)}
      draggable
      onDragStart={(dragEvent) => {
        dragEvent.dataTransfer.effectAllowed = 'move';
        // Alguns navegadores exigem que algo seja escrito no dataTransfer.
        dragEvent.dataTransfer.setData('text/plain', String(index));
        onDragStartIndex(index);
      }}
      onDragOver={(dragEvent) => {
        dragEvent.preventDefault();
        dragEvent.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(dragEvent) => {
        dragEvent.preventDefault();
        onDropIndex(index);
      }}
    >
      <span className="tl-index">{index + 1}</span>

      <span className="tl-pitch" aria-hidden="true">
        <span className="tl-pitch-bar" style={{ height: `${isRest ? 6 : 18 + ratio * 62}%` }} />
      </span>

      <span className="tl-name">{isRest ? 'PAUSA' : event.note}</span>
      <span className="tl-duration">{event.duration} ms</span>
      {!isRest ? <span className="tl-hz">{formatHz(event.frequency)} Hz</span> : null}
    </button>
  );
}
