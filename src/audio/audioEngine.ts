/* ==========================================================================
   audioEngine.ts
   Toda a conversa com a Web Audio API acontece aqui.

   Decisoes importantes:

   - O som imita um BUZZER PASSIVO, nao um piano. Por isso onda quadrada
     (oscillator.type = 'square') e nenhum sample.

   - O buzzer e MONOFONICO. Existe apenas uma voz "ao vivo": trocar de nota
     e apenas mudar a frequencia do mesmo oscilador. Nunca ha acorde.

   - O oscilador ao vivo fica ligado o tempo todo com ganho 0 e so sobe o
     ganho quando ha nota. Ligar/desligar oscilador a cada tecla causaria
     estalos e atraso.

   - Rampas curtas de ganho (poucos milissegundos) evitam o "clique" que
     aparece quando o ganho salta de 0 para 1 instantaneamente.

   - A reproducao da musica e agendada no relogio do AudioContext, nao com
     setTimeout encadeado. Assim nao existe drift audivel.
   ========================================================================== */

import type { SongEvent } from '../music/songTypes';

/** Subida do ganho no inicio da nota (s). */
const ATTACK = 0.004;
/** Descida do ganho no fim da nota (s). Tambem separa notas iguais seguidas. */
const RELEASE = 0.006;

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Handle de uma reproducao agendada, para poder ser interrompida. */
interface ScheduledPlayback {
  oscillator: OscillatorNode;
  gain: GainNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private liveOsc: OscillatorNode | null = null;
  private liveGain: GainNode | null = null;

  private playback: ScheduledPlayback | null = null;

  private volume = 0.25;
  private currentLiveFrequency = 0;

  /**
   * Cria/retoma o AudioContext. Precisa ser chamado dentro de um gesto do
   * usuario (clique, toque, tecla) porque os navegadores bloqueiam audio
   * iniciado automaticamente.
   */
  async unlock(): Promise<boolean> {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return false;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    return this.ctx.state === 'running';
  }

  get isReady(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Relogio de audio em segundos. O player usa isto como fonte de tempo. */
  get currentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.ctx) {
      // Rampa curta para nao estalar ao arrastar o controle de volume.
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  // ------------------------------------------------------------------------
  // Voz ao vivo (piano)
  // ------------------------------------------------------------------------

  private ensureLiveVoice(): void {
    if (!this.ctx || !this.master || this.liveOsc) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 440;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.liveOsc = osc;
    this.liveGain = gain;
  }

  /** Comeca (ou troca para) uma nota ao vivo. Monofonico por construcao. */
  noteOn(frequency: number): void {
    if (!this.ctx || !this.master || frequency <= 0) return;
    this.ensureLiveVoice();
    if (!this.liveOsc || !this.liveGain) return;
    const now = this.ctx.currentTime;
    this.currentLiveFrequency = frequency;
    // setValueAtTime troca a frequencia imediatamente, sem glissando.
    this.liveOsc.frequency.setValueAtTime(frequency, now);
    this.liveGain.gain.cancelScheduledValues(now);
    this.liveGain.gain.setValueAtTime(this.liveGain.gain.value, now);
    this.liveGain.gain.linearRampToValueAtTime(1, now + ATTACK);
  }

  /** Encerra a nota ao vivo. */
  noteOff(): void {
    if (!this.ctx || !this.liveGain) return;
    const now = this.ctx.currentTime;
    this.currentLiveFrequency = 0;
    this.liveGain.gain.cancelScheduledValues(now);
    this.liveGain.gain.setValueAtTime(this.liveGain.gain.value, now);
    this.liveGain.gain.linearRampToValueAtTime(0, now + RELEASE);
  }

  get liveFrequency(): number {
    return this.currentLiveFrequency;
  }

  // ------------------------------------------------------------------------
  // Reproducao da musica
  // ------------------------------------------------------------------------

  /**
   * Agenda a sequencia inteira no relogio do AudioContext.
   * Devolve o instante (em segundos do AudioContext) em que o som comeca,
   * para o player calcular o destaque visual.
   */
  scheduleSong(events: SongEvent[], startDelay = 0.06): number {
    if (!this.ctx || !this.master) return 0;
    this.stopPlayback();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.master);

    const startTime = this.ctx.currentTime + startDelay;
    let cursor = startTime;

    for (const event of events) {
      const duration = event.duration / 1000;
      const end = cursor + duration;
      if (event.type === 'note' && event.frequency > 0) {
        osc.frequency.setValueAtTime(event.frequency, cursor);
        gain.gain.setValueAtTime(0, cursor);
        gain.gain.linearRampToValueAtTime(1, cursor + Math.min(ATTACK, duration / 4));
        // A descida comeca um pouco antes do fim: e o que separa duas notas
        // iguais seguidas, senao "D4 D4" soaria como uma nota longa so.
        const releaseStart = Math.max(cursor + Math.min(ATTACK, duration / 4), end - RELEASE);
        gain.gain.setValueAtTime(1, releaseStart);
        gain.gain.linearRampToValueAtTime(0, end);
      } else {
        gain.gain.setValueAtTime(0, cursor);
      }
      cursor = end;
    }

    osc.start(startTime);
    osc.stop(cursor + 0.05);
    this.playback = { oscillator: osc, gain };
    return startTime;
  }

  stopPlayback(): void {
    if (!this.playback || !this.ctx) return;
    const now = this.ctx.currentTime;
    const { oscillator, gain } = this.playback;
    this.playback = null;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + RELEASE);
      oscillator.stop(now + RELEASE + 0.01);
    } catch {
      // O oscilador ja pode ter parado sozinho no fim da musica.
    }
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch {
        /* nada a fazer */
      }
    };
  }

  // ------------------------------------------------------------------------
  // Clique do metronomo
  // ------------------------------------------------------------------------

  /**
   * Agenda um clique curto. Fica no engine (e nao no metronomo) para toda a
   * criacao de nos de audio estar em um lugar so.
   */
  scheduleClick(time: number, accent: boolean): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1760 : 1174;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(accent ? 0.35 : 0.22, time + 0.002);
    gain.gain.linearRampToValueAtTime(0, time + 0.035);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + 0.05);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* nada a fazer */
      }
    };
  }

  /** Silencia tudo: usado no Parar e ao desmontar a aplicacao. */
  stopAll(): void {
    this.noteOff();
    this.stopPlayback();
  }

  /** Libera o AudioContext. Chamado apenas no unmount da aplicacao. */
  dispose(): void {
    this.stopAll();
    if (this.liveOsc) {
      try {
        this.liveOsc.stop();
        this.liveOsc.disconnect();
      } catch {
        /* nada a fazer */
      }
      this.liveOsc = null;
      this.liveGain = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
    }
  }
}
