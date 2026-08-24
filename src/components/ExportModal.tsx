/* ==========================================================================
   ExportModal.tsx
   Codigo Arduino completo, com o pino do buzzer configuravel.

   A montagem do sketch fica em data/buildIno.ts. Aqui so existe interface.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { SongEvent } from '../music/songTypes';
import { DEFAULT_LOOP_PAUSE_MS, buildIno, inoFileName } from '../data/buildIno';
import { Modal } from './Modal';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  events: SongEvent[];
  songName: string;
  buzzerPin: number;
  onBuzzerPinChange: (pin: number) => void;
}

export function ExportModal({
  open,
  onClose,
  events,
  songName,
  buzzerPin,
  onBuzzerPinChange,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const code = buildIno(events, {
    songName: songName.trim() || 'Minha música',
    buzzerPin,
    loopPauseMs: DEFAULT_LOOP_PAUSE_MS,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = inoFileName(songName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Sem o revoke o blob ficaria na memoria ate recarregar a pagina.
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title="Código Arduino completo"
      subtitle="Cole no Arduino IDE ou baixe o arquivo .ino."
      footer={
        <>
          <button type="button" className="btn btn-small" onClick={copy}>
            {copied ? '✓ Copiado!' : '⧉ Copiar código'}
          </button>
          <button type="button" className="btn btn-small btn-primary" onClick={download}>
            ⬇ Exportar .ino
          </button>
        </>
      }
    >
      <div className="highlight-box">
        <label className="field">
          <span className="field-label">Pino do buzzer</span>
          <input
            className="input input-pin"
            type="number"
            min={0}
            max={40}
            step={1}
            value={buzzerPin}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) onBuzzerPinChange(Math.max(0, Math.min(40, Math.round(value))));
            }}
          />
        </label>
        <p className="highlight-text">
          Ligue um fio do buzzer no pino <strong>{buzzerPin}</strong> e o outro no{' '}
          <strong>GND</strong>. Se o som não sair, confira se o buzzer é <em>passivo</em>.
        </p>
      </div>

      <pre className="code-block code-block-tall" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </Modal>
  );
}
