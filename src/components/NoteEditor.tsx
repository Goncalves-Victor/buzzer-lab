/* ==========================================================================
   NoteEditor.tsx
   Edicao do evento selecionado na linha do tempo.

   Trocar a nota atualiza a frequencia automaticamente; digitar uma frequencia
   livre e permitido (o campo aceita valores fora da tabela, para experimentar).
   ========================================================================== */

import { useEffect, useState } from 'react';
import { ALL_NOTES, describeFrequency, formatHz, getNote } from '../music/notes';
import type { SongEvent } from '../music/songTypes';
import { QUICK_DURATIONS } from '../music/songTypes';
import { HELP_TERMS } from '../data/helpTexts';
import { InfoTip } from './InfoTip';

/** Faixa oferecida no seletor: um pouco maior que a do piano visivel. */
const SELECTABLE_NOTES = ALL_NOTES.filter((n) => n.midi >= 36 && n.midi <= 96);

interface NoteEditorProps {
  event: SongEvent | null;
  position: number;
  total: number;
  onChange: (patch: Partial<Omit<SongEvent, 'id'>>) => void;
  onPreview: (event: SongEvent) => void;
}

export function NoteEditor({ event, position, total, onChange, onPreview }: NoteEditorProps) {
  // Campos numericos ficam em estado local para o usuario poder apagar tudo
  // e digitar de novo sem a musica receber valores intermediarios invalidos.
  const [frequencyText, setFrequencyText] = useState('');
  const [durationText, setDurationText] = useState('');

  useEffect(() => {
    setFrequencyText(event ? String(event.frequency) : '');
    setDurationText(event ? String(event.duration) : '');
  }, [event]);

  if (!event) {
    return (
      <section className="panel editor-panel" aria-label="Editor da nota">
        <header className="panel-head">
          <h2 className="panel-title">Editor da nota</h2>
        </header>
        <p className="empty-state">
          Selecione um bloco na linha do tempo para mudar a nota, a frequência ou a duração.
        </p>
      </section>
    );
  }

  const isRest = event.type === 'rest';

  const applyNote = (name: string) => {
    const note = getNote(name);
    if (!note) return;
    onChange({ note: note.name, frequency: note.frequency, type: 'note' });
  };

  const applyFrequency = () => {
    const value = Number(frequencyText.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setFrequencyText(String(event.frequency));
      return;
    }
    onChange({ frequency: value, note: describeFrequency(value), type: 'note' });
  };

  const applyDuration = (raw: string) => {
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value <= 0) {
      setDurationText(String(event.duration));
      return;
    }
    const safe = Math.max(1, Math.min(10000, value));
    setDurationText(String(safe));
    onChange({ duration: safe });
  };

  const toggleType = () => {
    if (isRest) {
      const note = getNote('C4');
      if (note) onChange({ type: 'note', note: note.name, frequency: note.frequency });
    } else {
      onChange({ type: 'rest', note: 'REST', frequency: 0 });
    }
  };

  return (
    <section className="panel editor-panel" aria-label="Editor da nota">
      <header className="panel-head">
        <h2 className="panel-title">Editor da nota</h2>
        <span className="panel-meta">
          Passo {position + 1} de {total}
        </span>
      </header>

      <div className="editor-grid">
        <div className="field">
          <span className="field-label">Tipo</span>
          <div className="segmented" role="group" aria-label="Tipo do passo">
            <button
              type="button"
              className={`segmented-btn${!isRest ? ' is-on' : ''}`}
              onClick={() => {
                if (isRest) toggleType();
              }}
            >
              Nota
            </button>
            <button
              type="button"
              className={`segmented-btn${isRest ? ' is-on' : ''}`}
              onClick={() => {
                if (!isRest) toggleType();
              }}
            >
              Pausa
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Nota</span>
          <select
            className="input"
            value={isRest ? '' : (getNote(event.note)?.name ?? '')}
            disabled={isRest}
            onChange={(changeEvent) => applyNote(changeEvent.target.value)}
          >
            {!isRest && !getNote(event.note) ? (
              <option value="">{event.note} (personalizada)</option>
            ) : null}
            {SELECTABLE_NOTES.map((note) => (
              <option key={note.name} value={note.name}>
                {note.name} — {formatHz(note.frequency)} Hz
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            Frequência (Hz) <InfoTip info={HELP_TERMS.frequencia} />
          </span>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={isRest ? '0' : frequencyText}
            disabled={isRest}
            onChange={(changeEvent) => setFrequencyText(changeEvent.target.value)}
            onBlur={applyFrequency}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter') keyEvent.currentTarget.blur();
            }}
          />
          <span className="field-hint">
            {isRest ? 'Pausa: frequência 0 é silêncio.' : `No Arduino vira ${Math.round(event.frequency)}.`}
          </span>
        </label>

        <label className="field">
          <span className="field-label">
            Duração (ms) <InfoTip info={HELP_TERMS.ms} />
          </span>
          <input
            className="input"
            type="number"
            min={1}
            max={10000}
            step={1}
            value={durationText}
            onChange={(changeEvent) => setDurationText(changeEvent.target.value)}
            onBlur={(blurEvent) => applyDuration(blurEvent.target.value)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter') keyEvent.currentTarget.blur();
            }}
          />
        </label>
      </div>

      <div className="quick-durations" role="group" aria-label="Durações rápidas">
        {QUICK_DURATIONS.map((duration) => (
          <button
            key={duration}
            type="button"
            className={`chip${event.duration === duration ? ' is-on' : ''}`}
            onClick={() => applyDuration(String(duration))}
          >
            {duration}
          </button>
        ))}
        <span className="chip-unit">ms</span>
      </div>

      <button
        type="button"
        className="btn btn-small"
        onClick={() => onPreview(event)}
        disabled={isRest}
      >
        ▶ Ouvir este passo
      </button>
    </section>
  );
}
