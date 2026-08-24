/* ==========================================================================
   QuantizeModal.tsx
   "Ajustar tempos" com previa.

   O aluno ve antes/depois e so entao confirma. Nada e alterado enquanto ele
   escolhe a resolucao, e o Desfazer continua trazendo os valores originais.
   ========================================================================== */

import { useState } from 'react';
import type { SongEvent } from '../music/songTypes';
import { QUANTIZE_STEPS } from '../music/songTypes';
import { applyQuantize, countChanges, previewQuantize, stepFromBpm } from '../music/quantize';
import { HELP_TERMS } from '../data/helpTexts';
import { InfoTip } from './InfoTip';
import { Modal } from './Modal';

interface QuantizeModalProps {
  open: boolean;
  onClose: () => void;
  events: SongEvent[];
  bpm: number;
  defaultStep: number;
  onApply: (events: SongEvent[]) => void;
}

export function QuantizeModal({
  open,
  onClose,
  events,
  bpm,
  defaultStep,
  onApply,
}: QuantizeModalProps) {
  const [step, setStep] = useState(defaultStep);

  const items = previewQuantize(events, step);
  const changes = countChanges(items);
  const changed = items.filter((item) => item.changed);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar tempos"
      subtitle="Arredonda as durações gravadas para valores redondos."
      footer={
        <>
          <button type="button" className="btn btn-small btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-small btn-primary"
            onClick={() => {
              onApply(applyQuantize(events, step));
              onClose();
            }}
            disabled={changes === 0}
          >
            Aplicar
          </button>
        </>
      }
    >
      <div className="field">
        <span className="field-label">
          Arredondar para múltiplos de <InfoTip info={HELP_TERMS.quantizacao} />
        </span>
        <div className="segmented segmented-wrap">
          {QUANTIZE_STEPS.map((option) => (
            <button
              key={option}
              type="button"
              className={`segmented-btn${step === option ? ' is-on' : ''}`}
              onClick={() => setStep(option)}
            >
              {option} ms
            </button>
          ))}
          <button
            type="button"
            className={`segmented-btn${step === stepFromBpm(bpm) ? ' is-on' : ''}`}
            onClick={() => setStep(stepFromBpm(bpm))}
            title={`Semicolcheia a ${bpm} BPM`}
          >
            {stepFromBpm(bpm)} ms (BPM)
          </button>
        </div>
      </div>

      <p className="hint-text">
        {changes === 0
          ? 'Nenhuma duração precisa mudar com esta resolução.'
          : `${changes} de ${events.length} passos vão mudar de duração.`}
      </p>

      {changed.length > 0 ? (
        <ul className="diff-list">
          {changed.slice(0, 12).map((item) => (
            <li key={item.event.id}>
              <span className="diff-name">
                {item.event.type === 'rest' ? 'PAUSA' : item.event.note}
              </span>
              <span className="diff-values">
                {item.originalDuration} ms → <strong>{item.newDuration} ms</strong>
              </span>
            </li>
          ))}
          {changed.length > 12 ? <li>e mais {changed.length - 12} passo(s).</li> : null}
        </ul>
      ) : null}
    </Modal>
  );
}
