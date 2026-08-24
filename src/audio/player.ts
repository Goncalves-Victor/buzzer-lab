/* ==========================================================================
   player.ts
   Transporte da musica: tocar, pausar, parar e voltar ao inicio.

   Divisao de responsabilidades:
   - o AUDIO e agendado de uma vez no relogio do AudioContext (sem drift);
   - a INTERFACE e atualizada por requestAnimationFrame, apenas lendo esse
     mesmo relogio. O audio e sempre a fonte de tempo.

   Ao pausar, a posicao volta para o inicio do evento atual. E previsivel para
   um aluno e evita retomar no meio de uma nota.
   ========================================================================== */

import type { SongEvent } from '../music/songTypes';
import { indexAtTime, startTimes, totalDuration } from '../music/songUtils';
import { AudioEngine } from './audioEngine';

export type PlayerState = 'stopped' | 'playing' | 'paused';

export interface PlayerCallbacks {
  /** index = evento em destaque (-1 quando parado). elapsedMs = posicao atual. */
  onPosition: (index: number, elapsedMs: number) => void;
  onStateChange: (state: PlayerState) => void;
  onEnd: () => void;
}

export class Player {
  private engine: AudioEngine;
  private callbacks: PlayerCallbacks;

  private events: SongEvent[] = [];
  private state: PlayerState = 'stopped';
  /** Deslocamento em ms de onde a reproducao atual comecou dentro da musica. */
  private offsetMs = 0;
  /** Instante do AudioContext (s) em que o som agendado comeca. */
  private audioStart = 0;
  private rafId: number | null = null;

  constructor(engine: AudioEngine, callbacks: PlayerCallbacks) {
    this.engine = engine;
    this.callbacks = callbacks;
  }

  get currentState(): PlayerState {
    return this.state;
  }

  /**
   * Toca a partir da posicao atual (0 quando parado, ou o ponto da pausa).
   * O AudioContext ja precisa estar liberado por um gesto do usuario.
   */
  play(events: SongEvent[]): void {
    if (events.length === 0) return;
    this.events = events;

    const total = totalDuration(events);
    if (this.offsetMs >= total) this.offsetMs = 0;

    // Agenda apenas a parte que ainda falta tocar.
    const times = startTimes(events);
    let firstIndex = indexAtTime(events, this.offsetMs);
    if (firstIndex < 0) firstIndex = 0;
    this.offsetMs = times[firstIndex];
    const remaining = events.slice(firstIndex);

    this.audioStart = this.engine.scheduleSong(remaining);
    this.setState('playing');
    this.startLoop();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.offsetMs = this.elapsedMs();
    this.engine.stopPlayback();
    this.stopLoop();
    // Volta ao inicio do evento atual para a retomada ficar limpa.
    const index = indexAtTime(this.events, this.offsetMs);
    const times = startTimes(this.events);
    this.offsetMs = index >= 0 ? times[index] : 0;
    this.setState('paused');
    this.callbacks.onPosition(index, this.offsetMs);
  }

  stop(): void {
    this.engine.stopPlayback();
    this.stopLoop();
    this.offsetMs = 0;
    this.setState('stopped');
    this.callbacks.onPosition(-1, 0);
  }

  /** Volta ao inicio mantendo o estado (parado). */
  toStart(): void {
    this.stop();
  }

  /** Posiciona o cursor em um evento especifico (clique na timeline). */
  seekToIndex(events: SongEvent[], index: number): void {
    this.events = events;
    const times = startTimes(events);
    this.offsetMs = index >= 0 && index < times.length ? times[index] : 0;
    if (this.state === 'playing') {
      this.engine.stopPlayback();
      this.stopLoop();
      this.play(events);
    } else {
      this.callbacks.onPosition(index, this.offsetMs);
    }
  }

  /** Posicao atual em ms, contada pelo relogio do audio. */
  elapsedMs(): number {
    if (this.state !== 'playing') return this.offsetMs;
    const delta = (this.engine.currentTime - this.audioStart) * 1000;
    return this.offsetMs + Math.max(0, delta);
  }

  /** Limpa timers e som. Chamado no unmount. */
  dispose(): void {
    this.stopLoop();
    this.engine.stopPlayback();
  }

  private setState(state: PlayerState): void {
    if (this.state === state) return;
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private startLoop(): void {
    this.stopLoop();
    const total = totalDuration(this.events);
    const tick = () => {
      if (this.state !== 'playing') return;
      const elapsed = this.elapsedMs();
      if (elapsed >= total) {
        this.engine.stopPlayback();
        this.stopLoop();
        this.offsetMs = 0;
        this.setState('stopped');
        this.callbacks.onPosition(-1, 0);
        this.callbacks.onEnd();
        return;
      }
      this.callbacks.onPosition(indexAtTime(this.events, elapsed), elapsed);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
