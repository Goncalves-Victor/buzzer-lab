/* ==========================================================================
   Piano.tsx
   Piano virtual de C3 a C6.

   Cuidados obrigatorios tratados aqui:
   - keydown repetido pelo navegador nao dispara varias notas (event.repeat);
   - soltar o dedo/mouse fora da tecla nao deixa nota presa (listener no window);
   - perder o foco da janela interrompe a nota;
   - o piano e monofonico: existe no maximo uma nota ao vivo por vez;
   - os listeners sao removidos quando o componente desmonta.

   O componente nao toca som: ele avisa o App, que fala com o AudioEngine.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NoteInfo } from '../music/notes';
import { KEYBOARD_OCTAVES, PIANO_NOTES, formatHz, getNoteByMidi } from '../music/notes';

/** Mapa pedido no projeto: A = C, W = C#, S = D ... K = proximo C. */
const KEY_MAP: { key: string; semitone: number }[] = [
  { key: 'a', semitone: 0 },
  { key: 'w', semitone: 1 },
  { key: 's', semitone: 2 },
  { key: 'e', semitone: 3 },
  { key: 'd', semitone: 4 },
  { key: 'f', semitone: 5 },
  { key: 't', semitone: 6 },
  { key: 'g', semitone: 7 },
  { key: 'y', semitone: 8 },
  { key: 'h', semitone: 9 },
  { key: 'u', semitone: 10 },
  { key: 'j', semitone: 11 },
  { key: 'k', semitone: 12 },
];

interface PianoProps {
  baseOctave: number;
  onBaseOctaveChange: (octave: number) => void;
  onNoteOn: (note: NoteInfo) => void;
  onNoteOff: (note: NoteInfo) => void;
  /** Nota destacada durante a reproducao da musica. */
  playbackNote: string | null;
  /** Enquanto a musica toca, o piano fica bloqueado para nao misturar sons. */
  disabled?: boolean;
}

export function Piano({
  baseOctave,
  onBaseOctaveChange,
  onNoteOn,
  onNoteOff,
  playbackNote,
  disabled = false,
}: PianoProps) {
  const [liveNote, setLiveNote] = useState<string | null>(null);

  // Refs espelham o estado porque os listeners de window/teclado sao criados
  // uma vez e nao podem depender do valor capturado no primeiro render.
  const liveNoteRef = useRef<string | null>(null);
  const pointerDownRef = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const whiteNotes = useMemo(() => PIANO_NOTES.filter((n) => !n.isSharp), []);
  const blackNotes = useMemo(() => PIANO_NOTES.filter((n) => n.isSharp), []);

  /** Etiqueta da tecla do computador correspondente a cada nota. */
  const keyboardLabels = useMemo(() => {
    const labels = new Map<string, string>();
    const firstMidi = (baseOctave + 1) * 12;
    for (const entry of KEY_MAP) {
      const note = getNoteByMidi(firstMidi + entry.semitone);
      if (note) labels.set(note.name, entry.key.toUpperCase());
    }
    return labels;
  }, [baseOctave]);

  const startNote = useCallback(
    (note: NoteInfo) => {
      if (disabledRef.current) return;
      // Monofonia: a nota anterior termina antes de a nova comecar.
      if (liveNoteRef.current === note.name) return;
      if (liveNoteRef.current) {
        const previous = PIANO_NOTES.find((n) => n.name === liveNoteRef.current);
        if (previous) onNoteOff(previous);
      }
      liveNoteRef.current = note.name;
      setLiveNote(note.name);
      onNoteOn(note);
    },
    [onNoteOn, onNoteOff],
  );

  const stopNote = useCallback(() => {
    const current = liveNoteRef.current;
    if (!current) return;
    const note = PIANO_NOTES.find((n) => n.name === current);
    liveNoteRef.current = null;
    setLiveNote(null);
    if (note) onNoteOff(note);
  }, [onNoteOff]);

  // ---- Teclado do computador --------------------------------------------
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // event.repeat evita que segurar a tecla vire dezenas de note-on.
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      const entry = KEY_MAP.find((item) => item.key === event.key.toLowerCase());
      if (!entry) return;
      const note = getNoteByMidi((baseOctave + 1) * 12 + entry.semitone);
      if (!note) return;
      event.preventDefault();
      startNote(note);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const entry = KEY_MAP.find((item) => item.key === event.key.toLowerCase());
      if (!entry) return;
      const note = getNoteByMidi((baseOctave + 1) * 12 + entry.semitone);
      // So paramos se a tecla solta for realmente a que esta soando: assim
      // trocar rapidamente de notas nao corta a nota nova por engano.
      if (note && liveNoteRef.current === note.name) stopNote();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [baseOctave, startNote, stopNote]);

  // ---- Ponteiro solto fora da tecla e perda de foco ----------------------
  useEffect(() => {
    const endPointer = () => {
      pointerDownRef.current = false;
      stopNote();
    };
    const onBlur = () => {
      pointerDownRef.current = false;
      stopNote();
    };
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
      window.removeEventListener('blur', onBlur);
    };
  }, [stopNote]);

  // Se o piano for bloqueado no meio de uma nota, ela precisa parar.
  useEffect(() => {
    if (disabled) stopNote();
  }, [disabled, stopNote]);

  const handlePointerDown = (note: NoteInfo) => (event: React.PointerEvent) => {
    event.preventDefault();
    pointerDownRef.current = true;
    startNote(note);
  };

  const handlePointerEnter = (note: NoteInfo) => () => {
    // Arrastar o dedo pelo teclado troca de nota, como num piano de verdade.
    if (pointerDownRef.current) startNote(note);
  };

  const whiteWidth = 100 / whiteNotes.length;

  const isActive = (name: string) => liveNote === name || playbackNote === name;

  const renderKeyContent = (note: NoteInfo) => (
    <>
      <span className="key-name">{note.name}</span>
      {keyboardLabels.has(note.name) ? (
        <span className="key-hint">{keyboardLabels.get(note.name)}</span>
      ) : null}
    </>
  );

  return (
    <section className="panel piano-panel" aria-label="Piano virtual">
      <header className="panel-head">
        <h2 className="panel-title">Piano</h2>
        <div className="piano-toolbar">
          <span className="field-label">Oitava do teclado</span>
          <div className="segmented" role="group" aria-label="Oitava do teclado do computador">
            {KEYBOARD_OCTAVES.map((octave) => (
              <button
                key={octave}
                type="button"
                className={`segmented-btn${octave === baseOctave ? ' is-on' : ''}`}
                onClick={() => onBaseOctaveChange(octave)}
              >
                {octave}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="piano-scroll">
        <div className="piano" style={{ minWidth: `${whiteNotes.length * 34}px` }}>
          <div className="piano-white-row">
            {whiteNotes.map((note) => (
              <button
                key={note.name}
                type="button"
                className={`key key-white${isActive(note.name) ? ' is-active' : ''}`}
                style={{ width: `${whiteWidth}%` }}
                disabled={disabled}
                title={`${note.name} — ${formatHz(note.frequency)} Hz`}
                aria-label={`${note.name}, ${formatHz(note.frequency)} hertz`}
                onPointerDown={handlePointerDown(note)}
                onPointerEnter={handlePointerEnter(note)}
                onContextMenu={(event) => event.preventDefault()}
              >
                {renderKeyContent(note)}
              </button>
            ))}
          </div>

          <div className="piano-black-row" aria-hidden={false}>
            {blackNotes.map((note) => {
              const whiteBefore = whiteNotes.filter((w) => w.midi < note.midi).length;
              const width = whiteWidth * 0.6;
              return (
                <button
                  key={note.name}
                  type="button"
                  className={`key key-black${isActive(note.name) ? ' is-active' : ''}`}
                  style={{
                    left: `${whiteBefore * whiteWidth}%`,
                    width: `${width}%`,
                    marginLeft: `${-width / 2}%`,
                  }}
                  disabled={disabled}
                  title={`${note.name} — ${formatHz(note.frequency)} Hz`}
                  aria-label={`${note.name}, ${formatHz(note.frequency)} hertz`}
                  onPointerDown={handlePointerDown(note)}
                  onPointerEnter={handlePointerEnter(note)}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  {renderKeyContent(note)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="piano-foot">
        {liveNote ? (
          <>
            Tocando <strong>{liveNote}</strong> ·{' '}
            {formatHz(PIANO_NOTES.find((n) => n.name === liveNote)?.frequency ?? 0)} Hz
          </>
        ) : (
          <>Toque com o mouse, o dedo ou as teclas A, W, S, E, D, F, T, G, Y, H, U, J, K.</>
        )}
      </p>
    </section>
  );
}
