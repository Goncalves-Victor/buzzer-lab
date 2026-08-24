/* ==========================================================================
   metronome.ts
   Metronomo opcional, usado como guia durante a gravacao.

   Ele NUNCA entra na musica: o gravador so registra o que vem do piano, e o
   clique e apenas som agendado direto no AudioContext.

   Usamos o padrao de "lookahead": um setInterval leve acorda a cada 25 ms e
   agenda no relogio do audio todos os cliques dos proximos 150 ms. Assim o
   ritmo nao depende da precisao do setInterval.
   ========================================================================== */

import { AudioEngine } from './audioEngine';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.15;
/** Compassos de 4 tempos: o primeiro clique de cada grupo e acentuado. */
const BEATS_PER_BAR = 4;

export class Metronome {
  private engine: AudioEngine;
  private timer: number | null = null;
  private nextTickTime = 0;
  private beat = 0;
  private bpm = 120;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  start(): void {
    if (this.timer !== null || !this.engine.isReady) return;
    this.beat = 0;
    this.nextTickTime = this.engine.currentTime + 0.08;
    this.timer = window.setInterval(() => this.scheduleAhead(), LOOKAHEAD_MS);
    this.scheduleAhead();
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  private scheduleAhead(): void {
    const beatDuration = 60 / this.bpm;
    while (this.nextTickTime < this.engine.currentTime + SCHEDULE_AHEAD_S) {
      this.engine.scheduleClick(this.nextTickTime, this.beat % BEATS_PER_BAR === 0);
      this.nextTickTime += beatDuration;
      this.beat += 1;
    }
  }
}
