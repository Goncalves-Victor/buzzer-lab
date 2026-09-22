/* ==========================================================================
   PianoRoll.tsx
   Segunda forma de editar a MESMA música da Timeline: piano na vertical à
   esquerda, grade de tempo à direita. Clicar cria nota, arrastar move,
   puxar a borda direita redimensiona.

   Este componente não guarda a música: ele só descreve, em cada gesto,
   QUAL operação de music/gridEdit.ts deve rodar em cima do SongEvent[] que
   vem de fora. Isso mantém a mesma fonte de verdade da Timeline.

   Monofonia aqui não é "verificada": ela é garantida pelas próprias funções
   de gridEdit.ts (mover e redimensionar nunca deixam uma nota invadir a
   seguinte). Este componente não precisa reimplementar essa regra.
   ========================================================================== */

import { useCallback, useMemo, useRef, useState } from 'react';
import { PIANO_NOTES } from '../music/notes';
import type { NoteInfo } from '../music/notes';
import { QUANTIZE_STEPS } from '../music/songTypes';
import type { SongEvent } from '../music/songTypes';
import { startTimes } from '../music/songUtils';
import {
  MIN_GRID_DURATION,
  insertNoteAt,
  moveNote,
  removeAsRest,
  resizeNote,
  snapToGrid,
} from '../music/gridEdit';

/** Altura de cada linha de nota (uma tecla do piano vertical), em pixels. */
const ROW_HEIGHT = 22;
/** Pixels por milissegundo no eixo do tempo. */
const PX_PER_MS = 0.15;
/** Largura mínima da grade, para sempre sobrar espaço para clicar e criar. */
const MIN_GRID_MS = 4000;
/** Margem de tempo depois da última nota, para dar espaço de continuar a música. */
const TRAILING_MS = 2000;

// As linhas ficam de cima (agudo) para baixo (grave), como no piano deitado
// de lado — é a orientação que a maioria das ferramentas de piano roll usa.
const ROWS: NoteInfo[] = [...PIANO_NOTES].reverse();

interface DragState {
  id: string;
  kind: 'move' | 'resize';
  /** Offset do clique dentro do bloco, para o arrasto não "pular" a nota. */
  grabOffsetMs: number;
}

interface PianoRollProps {
  events: SongEvent[];
  selectedId: string | null;
  playingIndex: number;
  onCommit: (events: SongEvent[]) => void;
  onSelect: (id: string | null) => void;
  onDeleteAndShift: (id: string) => void;
  onPreview: (frequency: number, duration: number) => void;
}

export function PianoRoll({
  events,
  selectedId,
  playingIndex,
  onCommit,
  onSelect,
  onDeleteAndShift,
  onPreview,
}: PianoRollProps) {
  const [gridStep, setGridStep] = useState<number>(125);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // Copia de trabalho durante o arrasto: evita recriar o historico de
  // desfazer a cada pixel movido. Só vira um "commit" de verdade ao soltar.
  const draftRef = useRef<SongEvent[] | null>(null);
  const [, forceRender] = useState(0);

  const starts = useMemo(() => startTimes(events), [events]);
  const totalMs = starts.length > 0 ? starts[starts.length - 1] + events[events.length - 1].duration : 0;
  const gridWidthMs = Math.max(MIN_GRID_MS, totalMs + TRAILING_MS);
  const gridWidthPx = gridWidthMs * PX_PER_MS;
  const gridHeightPx = ROWS.length * ROW_HEIGHT;

  const current = draftRef.current ?? events;
  const currentStarts = draftRef.current ? startTimes(draftRef.current) : starts;

  /** Converte a posição X do ponteiro (relativa à grade) em milissegundos. */
  const xToMs = useCallback(
    (clientX: number): number => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const raw = (clientX - rect.left + (gridRef.current?.scrollLeft ?? 0)) / PX_PER_MS;
      return Math.max(0, raw);
    },
    [],
  );

  const yToRow = useCallback((clientY: number): number => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const relative = clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    return Math.max(0, Math.min(ROWS.length - 1, Math.floor(relative / ROW_HEIGHT)));
  }, []);

  const commitDraft = useCallback(() => {
    if (draftRef.current) {
      onCommit(draftRef.current);
      draftRef.current = null;
    }
  }, [onCommit]);

  // ---- Criar nota clicando em espaço vazio -------------------------------
  const handleGridClick = useCallback(
    (event: React.MouseEvent) => {
      // Um clique que terminou um arrasto não deve também criar uma nota.
      if (dragRef.current) return;
      const atMs = snapToGrid(xToMs(event.clientX), gridStep);
      const row = ROWS[yToRow(event.clientY)];
      if (!row) return;

      const next = insertNoteAt(events, atMs, row, gridStep);
      if (next === events) return; // ponto ocupado: nada a fazer
      onCommit(next);
      const created = next.find(
        (e) => e.type === 'note' && e.note === row.name && !events.some((old) => old.id === e.id),
      );
      if (created) {
        onSelect(created.id);
        onPreview(row.frequency, Math.min(gridStep, 300));
      }
    },
    [events, gridStep, onCommit, onPreview, onSelect, xToMs, yToRow],
  );

  // ---- Arrastar (mover ou redimensionar) ---------------------------------
  const beginDrag = useCallback(
    (id: string, kind: 'move' | 'resize', event: React.PointerEvent) => {
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      const index = current.findIndex((e) => e.id === id);
      const startMs = index >= 0 ? currentStarts[index] : 0;
      const grabOffsetMs = xToMs(event.clientX) - startMs;
      dragRef.current = { id, kind, grabOffsetMs };
      draftRef.current = events;
      onSelect(id);
    },
    [current, currentStarts, events, onSelect, xToMs],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !draftRef.current) return;

      if (drag.kind === 'move') {
        const row = ROWS[yToRow(event.clientY)];
        if (!row) return;
        const targetMs = snapToGrid(xToMs(event.clientX) - drag.grabOffsetMs, gridStep);
        draftRef.current = moveNote(draftRef.current, drag.id, targetMs, row);
      } else {
        const index = draftRef.current.findIndex((e) => e.id === drag.id);
        if (index < 0) return;
        const start = startTimes(draftRef.current)[index];
        const newDuration = snapToGrid(xToMs(event.clientX) - start, gridStep);
        draftRef.current = resizeNote(draftRef.current, drag.id, Math.max(MIN_GRID_DURATION, newDuration));
      }
      forceRender((n) => n + 1);
    },
    [gridStep, xToMs, yToRow],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    commitDraft();
  }, [commitDraft]);

  // Se o ponteiro sair da janela no meio do arrasto (ex.: usuário arrasta
  // para fora da aba), o arrasto precisa terminar mesmo assim.
  const handlePointerCancel = useCallback(() => {
    dragRef.current = null;
    draftRef.current = null;
    forceRender((n) => n + 1);
  }, []);

  const playingId = playingIndex >= 0 && playingIndex < events.length ? events[playingIndex].id : null;

  return (
    <section className="panel pianoroll-panel" aria-label="Piano roll">
      <header className="panel-head">
        <h2 className="panel-title">Grade (piano roll)</h2>
        <div className="pianoroll-toolbar">
          <span className="field-label">Encaixe</span>
          <div className="segmented">
            {QUANTIZE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                className={`segmented-btn${gridStep === step ? ' is-on' : ''}`}
                onClick={() => setGridStep(step)}
              >
                {step} ms
              </button>
            ))}
          </div>
        </div>
      </header>

      <p className="hint-text">
        Clique num espaço vazio para criar uma nota. Arraste para mover, puxe a ponta direita
        para mudar a duração.
      </p>

      <div className="pianoroll-scroll">
        <div className="pianoroll-body" style={{ height: `${gridHeightPx}px` }}>
          <div className="pianoroll-keys" aria-hidden="true">
            {ROWS.map((note) => (
              <div
                key={note.name}
                className={`pianoroll-key${note.isSharp ? ' is-sharp' : ''}`}
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {!note.isSharp ? <span>{note.name}</span> : null}
              </div>
            ))}
          </div>

          <div
            className="pianoroll-grid"
            ref={gridRef}
            style={{ width: `${gridWidthPx}px`, height: `${gridHeightPx}px` }}
            onClick={handleGridClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {ROWS.map((note, rowIndex) => (
              <div
                key={note.name}
                className={`pianoroll-row${note.isSharp ? ' is-sharp' : ''}`}
                style={{ top: `${rowIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
              />
            ))}

            {current.map((songEvent, index) => {
              if (songEvent.type === 'rest') return null;
              const rowIndex = ROWS.findIndex((n) => n.name === songEvent.note);
              // Frequência personalizada fora da tabela: não tem linha própria
              // na grade, então não é desenhada aqui (continua editável pelo
              // Editor da nota e visível na Timeline em blocos).
              if (rowIndex < 0) return null;
              const left = currentStarts[index] * PX_PER_MS;
              const width = Math.max(6, songEvent.duration * PX_PER_MS);
              const isSelected = songEvent.id === selectedId;
              const isPlaying = songEvent.id === playingId;

              return (
                <div
                  key={songEvent.id}
                  className={`pianoroll-note${isSelected ? ' is-selected' : ''}${isPlaying ? ' is-playing' : ''}`}
                  style={{
                    left: `${left}px`,
                    top: `${rowIndex * ROW_HEIGHT + 1}px`,
                    width: `${width}px`,
                    height: `${ROW_HEIGHT - 2}px`,
                  }}
                  onPointerDown={(event) => beginDrag(songEvent.id, 'move', event)}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onDeleteAndShift(songEvent.id);
                  }}
                  title={`${songEvent.note} · ${songEvent.duration} ms — arraste para mover, duplo clique para apagar e puxar o resto`}
                >
                  <span className="pianoroll-note-label">{songEvent.note}</span>
                  <span
                    className="pianoroll-note-handle"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      beginDrag(songEvent.id, 'resize', event);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pianoroll-actions">
        <button
          type="button"
          className="btn btn-small btn-danger"
          disabled={!selectedId}
          onClick={() => selectedId && onCommit(removeAsRest(events, selectedId))}
        >
          🗑 Apagar (vira silêncio)
        </button>
        <button
          type="button"
          className="btn btn-small"
          disabled={!selectedId}
          onClick={() => selectedId && onDeleteAndShift(selectedId)}
          title="Remove a nota e puxa tudo que vem depois para frente"
        >
          ⇤ Apagar e puxar o resto
        </button>
      </div>
    </section>
  );
}
