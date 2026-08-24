/* ==========================================================================
   TransportControls.tsx
   Barra de controles. O estado atual precisa ficar obvio a qualquer momento:
   gravando, tocando, pausado ou parado.

   Gravacao e reproducao nunca acontecem juntas: enquanto grava, os botoes de
   tocar ficam desativados, e vice-versa.
   ========================================================================== */

import { HELP_TERMS } from '../data/helpTexts';
import type { PlayerState } from '../audio/player';
import { formatTimecode } from '../music/songUtils';
import { InfoTip } from './InfoTip';

interface TransportControlsProps {
  playerState: PlayerState;
  isRecording: boolean;
  /** Tempo mostrado no cronometro: gravacao ou posicao da reproducao. */
  elapsedMs: number;
  hasEvents: boolean;

  onToggleRecord: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToStart: () => void;

  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  bpm: number;
  onBpmChange: (bpm: number) => void;
  metronomeOn: boolean;
  onToggleMetronome: () => void;

  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function TransportControls({
  playerState,
  isRecording,
  elapsedMs,
  hasEvents,
  onToggleRecord,
  onPlay,
  onPause,
  onStop,
  onToStart,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  bpm,
  onBpmChange,
  metronomeOn,
  onToggleMetronome,
  volume,
  onVolumeChange,
}: TransportControlsProps) {
  const isPlaying = playerState === 'playing';

  const statusLabel = isRecording
    ? 'GRAVANDO'
    : isPlaying
      ? 'TOCANDO'
      : playerState === 'paused'
        ? 'PAUSADO'
        : 'PARADO';

  const statusClass = isRecording
    ? 'is-recording'
    : isPlaying
      ? 'is-playing'
      : playerState === 'paused'
        ? 'is-paused'
        : 'is-stopped';

  return (
    <section className="panel transport" aria-label="Controles">
      <div className={`transport-status ${statusClass}`} role="status" aria-live="polite">
        <span className="status-dot" aria-hidden="true" />
        <span className="status-text">{statusLabel}</span>
        <span className="status-time">{formatTimecode(elapsedMs)}</span>
      </div>

      <div className="transport-buttons">
        <button
          type="button"
          className={`btn btn-record${isRecording ? ' is-on' : ''}`}
          onClick={onToggleRecord}
          disabled={isPlaying}
          aria-pressed={isRecording}
        >
          ● {isRecording ? 'Parar gravação' : 'Gravar'}
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onPlay}
          disabled={isRecording || !hasEvents || isPlaying}
        >
          ▶ Tocar
        </button>

        <button type="button" className="btn" onClick={onPause} disabled={!isPlaying}>
          ⏸ Pausar
        </button>

        <button
          type="button"
          className="btn"
          onClick={onStop}
          disabled={isRecording || playerState === 'stopped'}
        >
          ■ Parar
        </button>

        <button
          type="button"
          className="btn"
          onClick={onToStart}
          disabled={isRecording || !hasEvents}
          title="Voltar ao início"
        >
          ↺ Início
        </button>

        <span className="transport-divider" aria-hidden="true" />

        <button type="button" className="btn" onClick={onUndo} disabled={!canUndo} title="Desfazer">
          ↶ Desfazer
        </button>
        <button type="button" className="btn" onClick={onRedo} disabled={!canRedo} title="Refazer">
          ↷ Refazer
        </button>
      </div>

      <div className="transport-settings">
        <label className="field">
          <span className="field-label">
            BPM <InfoTip info={HELP_TERMS.bpm} />
          </span>
          <span className="bpm-control">
            <input
              type="range"
              min={40}
              max={240}
              step={1}
              value={bpm}
              onChange={(event) => onBpmChange(Number(event.target.value))}
              aria-label="Batidas por minuto"
            />
            <output className="bpm-value">{bpm}</output>
          </span>
        </label>

        <button
          type="button"
          className={`btn btn-toggle${metronomeOn ? ' is-on' : ''}`}
          onClick={onToggleMetronome}
          aria-pressed={metronomeOn}
          title="O metrônomo nunca entra na música"
        >
          🎵 Metrônomo
        </button>

        <label className="field">
          <span className="field-label">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
            aria-label="Volume do buzzer"
          />
        </label>
      </div>
    </section>
  );
}
