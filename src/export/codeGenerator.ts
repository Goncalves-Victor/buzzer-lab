/* ==========================================================================
   codeGenerator.ts
   Converte SongEvent[] nos dois vetores paralelos usados no Arduino.

   Regras do formato:
   - vetNotas[i] e a frequencia em Hz, sempre INTEIRA (293.66 vira 294);
   - vetDuracao[i] e a duracao em ms, sempre INTEIRA;
   - frequencia 0 significa silencio;
   - os dois vetores tem obrigatoriamente o mesmo numero de elementos.
   ========================================================================== */

import type { SongEvent } from '../music/songTypes';
import { countNotes, countRests, formatSeconds, totalDuration } from '../music/songUtils';

/** Quantos numeros por linha no codigo gerado. Dez deixa a leitura confortavel. */
const VALUES_PER_LINE = 10;

export interface GeneratedArrays {
  notes: number[];
  durations: number[];
  notesName: string;
  durationsName: string;
  code: string;
}

export interface SongStats {
  noteCount: number;
  restCount: number;
  eventCount: number;
  totalMs: number;
  totalLabel: string;
}

/**
 * Transforma o nome digitado pelo usuario em um identificador C++ valido.
 * 'Mega Man Theme' -> 'megaManTheme'  (depois viram megaManThemeN / megaManThemeT)
 */
export function toIdentifier(name: string): string {
  const withoutAccents = name
    .normalize('NFD')
    // Remove os sinais diacriticos separados pelo NFD (acentos, til, cedilha).
    .replace(/[\u0300-\u036f]/g, '');

  const words = withoutAccents
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'minhaMusica';

  const joined = words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');

  // Identificador C++ nao pode comecar com digito.
  return /^[0-9]/.test(joined) ? `musica${joined}` : joined;
}

/** Frequencia do app (com decimais) -> valor exportado (inteiro). */
export function exportFrequency(frequency: number): number {
  return Math.max(0, Math.round(frequency));
}

export function exportDuration(duration: number): number {
  return Math.max(1, Math.round(duration));
}

function formatArray(name: string, values: number[]): string {
  if (values.length === 0) {
    return `const int ${name}[] = {};`;
  }
  const lines: string[] = [];
  for (let i = 0; i < values.length; i += VALUES_PER_LINE) {
    const chunk = values.slice(i, i + VALUES_PER_LINE);
    const isLast = i + VALUES_PER_LINE >= values.length;
    lines.push(`  ${chunk.join(', ')}${isLast ? '' : ','}`);
  }
  return `const int ${name}[] = {\n${lines.join('\n')}\n};`;
}

export function generateArrays(events: SongEvent[], songName: string): GeneratedArrays {
  const base = toIdentifier(songName);
  const notesName = `${base}N`;
  const durationsName = `${base}T`;

  const notes = events.map((e) => exportFrequency(e.type === 'rest' ? 0 : e.frequency));
  const durations = events.map((e) => exportDuration(e.duration));

  const code = `${formatArray(notesName, notes)}\n\n${formatArray(durationsName, durations)}`;

  return { notes, durations, notesName, durationsName, code };
}

export function songStats(events: SongEvent[]): SongStats {
  const totalMs = totalDuration(events);
  return {
    noteCount: countNotes(events),
    restCount: countRests(events),
    eventCount: events.length,
    totalMs,
    totalLabel: formatSeconds(totalMs),
  };
}
