/* ==========================================================================
   importParser.ts
   Caminho inverso: codigo Arduino colado -> SongEvent[].

   O texto do usuario NUNCA e executado. Nada de eval(). Fazemos uma leitura
   controlada: removemos comentarios, localizamos declaracoes de vetor por
   expressao regular e validamos numero por numero.

   Os erros sao escritos para um aluno entender o que fazer, nao para um
   programador depurar.
   ========================================================================== */

import { findNoteByFrequency } from '../music/notes';
import type { SongEvent } from '../music/songTypes';
import { createNoteEvent, createRestEvent, makeId } from '../music/songUtils';

export interface ImportSuccess {
  ok: true;
  events: SongEvent[];
  /** Nome deduzido a partir do identificador do vetor, ex.: 'megaN' -> 'mega'. */
  suggestedName: string;
  /** Avisos que nao impedem a importacao (ex.: frequencia fora da tabela). */
  warnings: string[];
}

export interface ImportFailure {
  ok: false;
  /** Titulo curto mostrado em destaque. */
  title: string;
  /** Explicacao amigavel, pode ter varias frases. */
  message: string;
}

export type ImportResult = ImportSuccess | ImportFailure;

interface ParsedArray {
  name: string;
  values: number[];
}

/** Remove comentarios // e comentarios de bloco antes de qualquer analise. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Localiza declaracoes no formato:
 *   const int nome[] = { 1, 2, 3 };
 * Aceita variacoes comuns: sem const, com PROGMEM, com tamanho entre colchetes
 * e com tipos diferentes (int, unsigned int, uint16_t, long...).
 */
function findArrays(source: string): ParsedArray[] {
  const pattern =
    /(?:const\s+)?(?:unsigned\s+)?(?:int|short|long|float|double|uint16_t|uint32_t|byte)\s+([A-Za-z_]\w*)\s*\[[^\]]*\]\s*(?:PROGMEM\s*)?=\s*\{([^}]*)\}/g;

  const found: ParsedArray[] = [];
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    const name = match[1];
    const body = match[2];
    const values = body
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => Number(part));
    found.push({ name, values });
    match = pattern.exec(source);
  }
  return found;
}

/** Heuristica simples de qual vetor e de notas e qual e de duracoes. */
function classify(arrays: ParsedArray[]): { notes: ParsedArray; durations: ParsedArray } | null {
  if (arrays.length < 2) return null;

  const isNotes = (name: string) => /(^|[^a-z])n$|nota|note|freq|som/i.test(name);
  const isDurations = (name: string) => /(^|[^a-z])t$|dur|tempo|time|delay/i.test(name);

  const notes = arrays.find((a) => isNotes(a.name));
  const durations = arrays.find((a) => isDurations(a.name) && a !== notes);

  if (notes && durations) return { notes, durations };

  // Sem pistas no nome, assumimos a ordem em que aparecem no codigo.
  return { notes: arrays[0], durations: arrays[1] };
}

function nameFromIdentifier(identifier: string): string {
  const base = identifier.replace(/(N|T|Notas|Duracao|Tempos)$/i, '');
  if (!base) return 'Música importada';
  // camelCase -> palavras separadas, com a primeira letra maiuscula.
  const spaced = base.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function parseArduinoArrays(source: string): ImportResult {
  const text = source.trim();

  if (!text) {
    return {
      ok: false,
      title: 'Nada para importar',
      message: 'Cole o código com os dois vetores da música antes de continuar.',
    };
  }

  const arrays = findArrays(stripComments(text));

  if (arrays.length === 0) {
    return {
      ok: false,
      title: 'Não foi possível importar a música.',
      message:
        'Não encontrei nenhum vetor no texto colado. ' +
        'O código precisa ter duas listas parecidas com:\n\n' +
        'const int minhaMusicaN[] = { 262, 294 };\n' +
        'const int minhaMusicaT[] = { 250, 250 };',
    };
  }

  if (arrays.length === 1) {
    return {
      ok: false,
      title: 'Não foi possível importar a música.',
      message:
        `Encontrei apenas o vetor "${arrays[0].name}". ` +
        'São necessários dois: um com as frequências e outro com as durações.',
    };
  }

  const picked = classify(arrays);
  if (!picked) {
    return {
      ok: false,
      title: 'Não foi possível importar a música.',
      message: 'Não consegui identificar qual vetor tem as notas e qual tem as durações.',
    };
  }

  const { notes, durations } = picked;

  if (notes.values.length === 0) {
    return {
      ok: false,
      title: 'Não foi possível importar a música.',
      message: `O vetor "${notes.name}" está vazio. Ele precisa ter pelo menos uma frequência.`,
    };
  }

  if (notes.values.length !== durations.values.length) {
    return {
      ok: false,
      title: 'Não foi possível importar a música.',
      message:
        `O vetor de notas possui ${notes.values.length} valores, ` +
        `mas o vetor de durações possui ${durations.values.length}.\n\n` +
        'Cada nota precisa ter uma duração correspondente.',
    };
  }

  const warnings: string[] = [];
  const events: SongEvent[] = [];

  for (let i = 0; i < notes.values.length; i++) {
    const frequency = notes.values[i];
    const duration = durations.values[i];
    const posicao = i + 1;

    if (!Number.isFinite(frequency)) {
      return {
        ok: false,
        title: 'Não foi possível importar a música.',
        message: `O valor da posição ${posicao} do vetor "${notes.name}" não é um número.`,
      };
    }
    if (!Number.isFinite(duration)) {
      return {
        ok: false,
        title: 'Não foi possível importar a música.',
        message: `O valor da posição ${posicao} do vetor "${durations.name}" não é um número.`,
      };
    }
    if (frequency < 0) {
      return {
        ok: false,
        title: 'Não foi possível importar a música.',
        message:
          `A frequência da posição ${posicao} é ${frequency}. ` +
          'Frequências não podem ser negativas. Use 0 para representar uma pausa.',
      };
    }
    if (duration <= 0) {
      return {
        ok: false,
        title: 'Não foi possível importar a música.',
        message:
          `A duração da posição ${posicao} é ${duration}. ` +
          'Toda nota precisa durar pelo menos 1 milissegundo.',
      };
    }

    if (frequency === 0) {
      events.push(createRestEvent(duration));
      continue;
    }

    const note = findNoteByFrequency(frequency);
    if (note) {
      // Mantemos a frequencia exata da tabela: assim a nota volta a ser editavel
      // pelo nome e a exportacao gera de novo o mesmo inteiro.
      events.push(createNoteEvent(note, duration));
    } else {
      warnings.push(`${frequency} Hz (posição ${posicao}) não corresponde a uma nota conhecida.`);
      events.push({
        id: makeId(),
        note: `${frequency} Hz`,
        frequency,
        duration: Math.round(duration),
        type: 'note',
      });
    }
  }

  return {
    ok: true,
    events,
    suggestedName: nameFromIdentifier(notes.name),
    warnings,
  };
}
