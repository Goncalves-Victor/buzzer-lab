/* ==========================================================================
   HelpPanel.tsx
   Ajuda didatica. Os textos vem de data/helpTexts.ts, os mesmos usados nos
   tooltips espalhados pela interface.
   ========================================================================== */

import { HELP_SECTIONS, HELP_STEPS } from '../data/helpTexts';
import { Modal } from './Modal';

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

export function HelpPanel({ open, onClose }: HelpPanelProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title="Como usar o Buzzer Lab"
      subtitle="Você faz a música aqui, escuta como ficaria no buzzer e leva o código para o seu robô."
    >
      <ol className="help-steps">
        {HELP_STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      {HELP_SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="section-title">{section.title}</h3>
          <dl className="help-terms">
            {section.items.map((item) => (
              <div key={item.term} className="help-term">
                <dt>{item.term}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <h3 className="section-title">Ligação no Arduino</h3>
      <p className="help-paragraph">
        Um fio do buzzer vai no pino escolhido e o outro no GND. O comando{' '}
        <code>tone(pino, frequência)</code> faz o som começar e{' '}
        <code>noTone(pino)</code> faz o som parar. O <code>delay</code> entre eles decide a
        duração de cada nota.
      </p>
    </Modal>
  );
}
