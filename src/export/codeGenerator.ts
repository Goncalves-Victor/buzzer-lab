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

// --------------------------------------------------------------------------
// Playlist: varias musicas + a tabela MUSICAS[] usada pelo menu do OLED
// --------------------------------------------------------------------------

/**
 * Texto seguro para o OLED e para uma string C++. A fonte padrao da
 * Adafruit_GFX so tem ASCII (acento vira simbolo estranho na tela) e aspas ou
 * barra invertida quebrariam a string do codigo.
 */
export function toOledText(name: string, maxLength: number): string {
  const clean = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/"/g, "'")
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, maxLength).trim();
}

export interface PlaylistEntry {
  /** Nome como aparece no OLED e na tabela. */
  displayName: string;
  notesName: string;
  durationsName: string;
  notes: number[];
  durations: number[];
  totalMs: number;
}

export interface GeneratedPlaylist {
  entries: PlaylistEntry[];
  /** Todos os vetores N/T, um bloco por musica, separados por linha em branco. */
  arraysCode: string;
  /** O `const Musica MUSICAS[] = { ... };` */
  tableCode: string;
  totalMs: number;
}

export function generatePlaylist(
  songs: { name: string; events: SongEvent[] }[],
  nameMaxLength: number,
): GeneratedPlaylist {
  const usedBases = new Set<string>();
  const entries: PlaylistEntry[] = [];
  const blocks: string[] = [];

  songs.forEach((song, index) => {
    // Duas musicas com nomes parecidos ("Cafe" e "Café") dariam o mesmo
    // identificador e o sketch nao compilaria: o repetido ganha um numero.
    const base = toIdentifier(song.name);
    let unique = base;
    for (let n = 2; usedBases.has(unique); n++) unique = `${base}${n}`;
    usedBases.add(unique);

    const arrays = generateArrays(song.events, unique);
    const displayName = toOledText(song.name, nameMaxLength) || `Musica ${index + 1}`;
    const totalMs = arrays.durations.reduce((sum, d) => sum + d, 0);

    entries.push({
      displayName,
      notesName: arrays.notesName,
      durationsName: arrays.durationsName,
      notes: arrays.notes,
      durations: arrays.durations,
      totalMs,
    });
    blocks.push(`// ${index + 1}. ${displayName} (${arrays.notes.length} passos, ${formatSeconds(totalMs)})\n${arrays.code}`);
  });

  return {
    entries,
    arraysCode: blocks.join('\n\n'),
    tableCode: formatTable(entries),
    totalMs: entries.reduce((sum, e) => sum + e.totalMs, 0),
  };
}

/** Monta a tabela com as colunas alinhadas, para a leitura ficar tranquila. */
function formatTable(entries: PlaylistEntry[]): string {
  const rows = entries.map((e) => ({
    name: `"${e.displayName}",`,
    notes: `${e.notesName},`,
    durations: `${e.durationsName},`,
    size: `(int)TAM(${e.notesName})`,
  }));
  const width = (pick: (r: (typeof rows)[number]) => string) =>
    rows.reduce((max, r) => Math.max(max, pick(r).length), 0);
  const wName = width((r) => r.name);
  const wNotes = width((r) => r.notes);
  const wDur = width((r) => r.durations);
  const wSize = width((r) => r.size);

  const lines = rows.map((r, i) => {
    const comma = i === rows.length - 1 ? '' : ',';
    return `  { ${r.name.padEnd(wName)} ${r.notes.padEnd(wNotes)} ${r.durations.padEnd(wDur)} ${r.size.padEnd(wSize)} }${comma}`;
  });
  return `const Musica MUSICAS[] = {\n${lines.join('\n')}\n};`;
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
