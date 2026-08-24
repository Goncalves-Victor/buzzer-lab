/* ==========================================================================
   ImportModal.tsx
   Caminho de volta: codigo colado -> musica editavel.

   O texto e analisado por importParser.ts (sem eval). Aqui apenas mostramos o
   resultado: uma previa quando da certo, ou um erro escrito em portugues
   simples quando algo nao bate.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { SongEvent } from '../music/songTypes';
import { parseArduinoArrays } from '../export/importParser';
import type { ImportResult } from '../export/importParser';
import { countNotes, countRests, formatSeconds, totalDuration } from '../music/songUtils';
import { Modal } from './Modal';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Recebe a musica importada e o nome sugerido pelo identificador do vetor. */
  onImport: (events: SongEvent[], suggestedName: string) => void;
}

const PLACEHOLDER = `const int megaN[] = {
  294, 294, 587, 440
};

const int megaT[] = {
  125, 125, 250, 375
};`;

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  // Cada abertura comeca limpa, senao o aluno ve o erro da tentativa anterior.
  useEffect(() => {
    if (open) {
      setText('');
      setResult(null);
    }
  }, [open]);

  const check = () => setResult(parseArduinoArrays(text));

  const confirm = () => {
    const parsed = result ?? parseArduinoArrays(text);
    setResult(parsed);
    if (parsed.ok) {
      onImport(parsed.events, parsed.suggestedName);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title="Importar música"
      subtitle="Cole os dois vetores gerados para o Arduino e traga a música de volta para a linha do tempo."
      footer={
        <>
          <button type="button" className="btn btn-small" onClick={check} disabled={!text.trim()}>
            Conferir
          </button>
          <button
            type="button"
            className="btn btn-small btn-primary"
            onClick={confirm}
            disabled={!text.trim()}
          >
            Importar
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Código com os vetores</span>
        <textarea
          className="input textarea"
          rows={10}
          spellCheck={false}
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setResult(null);
          }}
        />
      </label>

      {result && !result.ok ? (
        <div className="message message-error" role="alert">
          <strong>{result.title}</strong>
          <span className="message-body">{result.message}</span>
        </div>
      ) : null}

      {result && result.ok ? (
        <div className="message message-success" role="status">
          <strong>Música pronta para importar.</strong>
          <span className="message-body">
            {result.events.length} passos: {countNotes(result.events)} notas e{' '}
            {countRests(result.events)} pausas. Duração total:{' '}
            {formatSeconds(totalDuration(result.events))}.
          </span>
          {result.warnings.length > 0 ? (
            <ul className="message-list">
              {result.warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              {result.warnings.length > 4 ? (
                <li>e mais {result.warnings.length - 4} valor(es) fora da tabela de notas.</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p className="hint-text">
        A música atual será substituída pela importada. Se você se arrepender, use{' '}
        <strong>Desfazer</strong>.
      </p>
    </Modal>
  );
}
