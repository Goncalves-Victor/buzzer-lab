/* ==========================================================================
   SettingsModal.tsx
   Preferencias do aluno. Tudo salvo em buzzerlab.settings.

   As mudancas valem na hora (o App aplica volume, BPM etc. imediatamente),
   entao nao existe botao "Salvar": fechar ja mantem o que foi escolhido.
   ========================================================================== */

import type { Settings } from '../data/settings';
import { DEFAULT_SETTINGS } from '../data/settings';
import { KEYBOARD_OCTAVES } from '../music/notes';
import { QUANTIZE_STEPS } from '../music/songTypes';
import { Modal } from './Modal';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações"
      subtitle="Suas escolhas ficam salvas neste navegador."
      footer={
        <>
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => onChange(DEFAULT_SETTINGS)}
          >
            Restaurar padrão
          </button>
          <button type="button" className="btn btn-small btn-primary" onClick={onClose}>
            Pronto
          </button>
        </>
      }
    >
      <div className="settings-grid">
        <label className="field">
          <span className="field-label">Volume do buzzer</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            onChange={(event) => onChange({ volume: Number(event.target.value) / 100 })}
          />
          <span className="field-hint">{Math.round(settings.volume * 100)}%</span>
        </label>

        <div className="field">
          <span className="field-label">Oitava inicial do teclado</span>
          <div className="segmented">
            {KEYBOARD_OCTAVES.map((octave) => (
              <button
                key={octave}
                type="button"
                className={`segmented-btn${settings.baseOctave === octave ? ' is-on' : ''}`}
                onClick={() => onChange({ baseOctave: octave })}
              >
                {octave}
              </button>
            ))}
          </div>
          <span className="field-hint">A tecla A toca o C desta oitava.</span>
        </div>

        <div className="field">
          <span className="field-label">Ajuste de tempos padrão</span>
          <div className="segmented">
            {QUANTIZE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                className={`segmented-btn${settings.quantizeStep === step ? ' is-on' : ''}`}
                onClick={() => onChange({ quantizeStep: step })}
              >
                {step} ms
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">BPM padrão</span>
          <input
            className="input input-small"
            type="number"
            min={40}
            max={240}
            value={settings.bpm}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) onChange({ bpm: Math.max(40, Math.min(240, value)) });
            }}
          />
        </label>

        <label className="check-field">
          <input
            type="checkbox"
            checked={settings.autoRests}
            onChange={(event) => onChange({ autoRests: event.target.checked })}
          />
          <span>
            <strong>Registrar pausas automaticamente</strong>
            <span className="field-hint">
              O silêncio entre duas notas vira uma pausa na música.
            </span>
          </span>
        </label>

        <label className="field">
          <span className="field-label">Silêncio mínimo para virar pausa</span>
          <input
            className="input input-small"
            type="number"
            min={20}
            max={2000}
            step={10}
            value={settings.minRestMs}
            disabled={!settings.autoRests}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value))
                onChange({ minRestMs: Math.max(20, Math.min(2000, Math.round(value))) });
            }}
          />
          <span className="field-hint">Em milissegundos.</span>
        </label>

        <label className="field">
          <span className="field-label">Pino padrão do buzzer</span>
          <input
            className="input input-small"
            type="number"
            min={0}
            max={40}
            value={settings.buzzerPin}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value))
                onChange({ buzzerPin: Math.max(0, Math.min(40, Math.round(value))) });
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
