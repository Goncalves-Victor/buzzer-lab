/* ==========================================================================
   notes.ts
   Tabela central de notas.

   Todo o projeto (piano, editor, player, importacao e exportacao) consulta
   este arquivo. Nao espalhe frequencias magicas pelos componentes.

   As frequencias sao calculadas em temperamento igual a partir de A4 = 440 Hz:
     f = 440 * 2 ^ ((midi - 69) / 12)
   e arredondadas para 2 casas, que e a precisao usada nas tabelas de buzzer.
   ========================================================================== */

export interface NoteInfo {
  /** Nome completo, ex.: 'D#4'. */
  name: string;
  /** Nome da nota sem oitava, ex.: 'D#'. */
  step: string;
  octave: number;
  /** Numero MIDI. Usado apenas como indice ordenado, nao exportamos MIDI. */
  midi: number;
  frequency: number;
  /** true para teclas pretas (sustenidos). */
  isSharp: boolean;
}

const STEP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Nome usado para pausas dentro de um SongEvent. */
export const REST_NAME = 'REST';

function buildNote(midi: number): NoteInfo {
  const step = STEP_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  const frequency = Math.round(440 * Math.pow(2, (midi - 69) / 12) * 100) / 100;
  return {
    name: `${step}${octave}`,
    step,
    octave,
    midi,
    frequency,
    isSharp: step.includes('#'),
  };
}

/** Faixa completa conhecida pelo app: C1 (24) ate C8 (108). */
export const ALL_NOTES: NoteInfo[] = [];
for (let midi = 24; midi <= 108; midi++) {
  ALL_NOTES.push(buildNote(midi));
}

const BY_NAME = new Map<string, NoteInfo>();
for (const note of ALL_NOTES) {
  BY_NAME.set(note.name.toUpperCase(), note);
}

/** Faixa mostrada no piano virtual: C3 ate C6. */
export const PIANO_FIRST_MIDI = 48; // C3
export const PIANO_LAST_MIDI = 84; // C6
export const PIANO_NOTES: NoteInfo[] = ALL_NOTES.filter(
  (n) => n.midi >= PIANO_FIRST_MIDI && n.midi <= PIANO_LAST_MIDI,
);

/** Oitavas que o usuario pode escolher como base do teclado do computador. */
export const KEYBOARD_OCTAVES = [3, 4, 5] as const;

export function getNote(name: string): NoteInfo | null {
  return BY_NAME.get(name.trim().toUpperCase()) ?? null;
}

export function getNoteByMidi(midi: number): NoteInfo | null {
  return ALL_NOTES.find((n) => n.midi === midi) ?? null;
}

/**
 * Encontra a nota mais proxima de uma frequencia.
 * Usado na importacao: 294 Hz vindo do Arduino vira D4 (293.66 Hz).
 *
 * toleranceCents = 50 significa "no maximo meio semitom de distancia".
 * Acima disso consideramos frequencia personalizada e devolvemos null.
 */
export function findNoteByFrequency(frequency: number, toleranceCents = 50): NoteInfo | null {
  if (!(frequency > 0)) return null;
  let best: NoteInfo | null = null;
  let bestCents = Infinity;
  for (const note of ALL_NOTES) {
    const cents = Math.abs(1200 * Math.log2(frequency / note.frequency));
    if (cents < bestCents) {
      bestCents = cents;
      best = note;
    }
  }
  return bestCents <= toleranceCents ? best : null;
}

/**
 * Nome amigavel para exibir quando a frequencia nao bate com nenhuma nota.
 * Ex.: 1000 Hz vira '1000 Hz'.
 */
export function describeFrequency(frequency: number): string {
  const note = findNoteByFrequency(frequency);
  if (note) return note.name;
  return `${formatHz(frequency)} Hz`;
}

/** Formata Hz no padrao brasileiro (virgula decimal), sem zeros inuteis. */
export function formatHz(frequency: number): string {
  const rounded = Math.round(frequency * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
