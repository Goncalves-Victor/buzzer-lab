/* ==========================================================================
   recorder.ts
   Transforma toques do piano (note-on / note-off) em SongEvent[].

   O gravador nao conhece React nem Web Audio: recebe instantes em ms e devolve
   eventos. Isso mantem a logica testavel e separada da interface.

   O buzzer e monofonico, entao o gravador tambem e: se uma nota comeca
   enquanto outra toca, a anterior e fechada no mesmo instante.
   ========================================================================== */

import type { NoteInfo } from './notes';
import type { SongEvent } from './songTypes';
import { createNoteEvent, createRestEvent } from './songUtils';

export interface RecorderOptions {
  /** Se true, o silencio entre notas vira um evento de pausa. */
  autoRests: boolean;
  /** Silencio minimo (ms) para virar pausa. Silencios menores sao ignorados. */
  minRestMs: number;
  /** Duracao minima aceita para uma nota, evita eventos de 3 ms por engano. */
  minNoteMs: number;
}

export const DEFAULT_RECORDER_OPTIONS: RecorderOptions = {
  autoRests: true,
  minRestMs: 90,
  minNoteMs: 40,
};

interface ActiveNote {
  note: NoteInfo;
  startedAt: number;
}

export class Recorder {
  private options: RecorderOptions;
  private events: SongEvent[] = [];
  private active: ActiveNote | null = null;
  private startedAt = 0;
  /** Instante em que o ultimo som terminou, base para calcular pausas. */
  private lastEndedAt = 0;
  private running = false;

  constructor(options: RecorderOptions = DEFAULT_RECORDER_OPTIONS) {
    this.options = options;
  }

  setOptions(options: RecorderOptions): void {
    this.options = options;
  }

  get isRecording(): boolean {
    return this.running;
  }

  /** Comeca uma gravacao nova. `now` normalmente vem de performance.now(). */
  start(now: number): void {
    this.events = [];
    this.active = null;
    this.startedAt = now;
    this.lastEndedAt = now;
    this.running = true;
  }

  /** Tempo decorrido desde o inicio da gravacao, em ms. */
  elapsed(now: number): number {
    return this.running ? now - this.startedAt : 0;
  }

  noteOn(note: NoteInfo, now: number): void {
    if (!this.running) return;
    // Monofonia: qualquer nota em andamento termina exatamente agora.
    if (this.active) this.noteOff(now);
    this.pushRestIfNeeded(now);
    this.active = { note, startedAt: now };
  }

  noteOff(now: number): void {
    if (!this.running || !this.active) return;
    const duration = now - this.active.startedAt;
    if (duration >= this.options.minNoteMs) {
      this.events.push(createNoteEvent(this.active.note, duration));
      this.lastEndedAt = now;
    } else {
      // Toque curto demais: descarta a nota e mantem a base de silencio anterior,
      // senao um esbarrao no teclado viraria uma nota de 10 ms na musica.
      this.lastEndedAt = Math.max(this.lastEndedAt, this.active.startedAt);
    }
    this.active = null;
  }

  /** Encerra a gravacao e devolve os eventos capturados. */
  stop(now: number): SongEvent[] {
    if (!this.running) return [];
    if (this.active) this.noteOff(now);
    this.running = false;
    const result = this.events;
    this.events = [];
    return result;
  }

  private pushRestIfNeeded(now: number): void {
    if (!this.options.autoRests) return;
    // Nao criamos pausa antes da primeira nota: a musica comeca quando o aluno toca.
    if (this.events.length === 0) return;
    const gap = now - this.lastEndedAt;
    if (gap >= this.options.minRestMs) {
      this.events.push(createRestEvent(gap));
    }
  }
}
