/* ==========================================================================
   buildIno.ts
   Monta o arquivo .ino completo.

   Regra do projeto: nenhum componente React monta strings grandes de Arduino.
   Toda a formatacao do sketch mora aqui, em um lugar so.
   ========================================================================== */

import type { SongEvent } from '../music/songTypes';
import { generateArrays, songStats, toIdentifier } from '../export/codeGenerator';

export interface InoOptions {
  songName: string;
  buzzerPin: number;
  /** Pausa entre repeticoes da musica, em ms. */
  loopPauseMs: number;
}

export const DEFAULT_BUZZER_PIN = 5;
export const DEFAULT_LOOP_PAUSE_MS = 2000;

/** Nome de arquivo seguro: 'Mega Man' -> 'mega_man.ino'. */
export function inoFileName(songName: string): string {
  const identifier = toIdentifier(songName);
  const snake = identifier.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return `${snake || 'minha_musica'}.ino`;
}

export function buildIno(events: SongEvent[], options: InoOptions): string {
  const { songName, buzzerPin, loopPauseMs } = options;
  const arrays = generateArrays(events, songName);
  const stats = songStats(events);
  const base = toIdentifier(songName);
  const countName = `${base}Tamanho`;

  return `/*
  ${songName}
  Gerado pelo Buzzer Lab.

  ${stats.eventCount} passos (${stats.noteCount} ${stats.noteCount === 1 ? 'nota' : 'notas'} e ${stats.restCount} ${stats.restCount === 1 ? 'pausa' : 'pausas'}).
  Duracao total: ${stats.totalLabel}.

  Ligacao: o buzzer passivo vai no pino ${buzzerPin} e no GND.

  Como funciona:
  - ${arrays.notesName} guarda a frequencia de cada passo, em Hz;
  - ${arrays.durationsName} guarda quanto tempo cada passo dura, em ms;
  - frequencia igual a 0 significa silencio (pausa).
*/

const int buzzerPin = ${buzzerPin};

${arrays.code}

const int ${countName} = sizeof(${arrays.notesName}) / sizeof(${arrays.notesName}[0]);

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  for (int i = 0; i < ${countName}; i++) {
    if (${arrays.notesName}[i] > 0) {
      tone(buzzerPin, ${arrays.notesName}[i]);
    } else {
      noTone(buzzerPin);
    }

    delay(${arrays.durationsName}[i]);
    noTone(buzzerPin);
  }

  delay(${loopPauseMs});
}
`;
}
