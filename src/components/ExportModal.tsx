/* ==========================================================================
   ExportModal.tsx
   Codigo Arduino completo: da musica atual OU da playlist inteira.

   A montagem dos sketches fica em data/buildIno.ts (musica unica) e
   data/buildPlaylistIno.ts (playlist com OLED e botao). Aqui so existe
   interface.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { SongEvent, StoredSong } from '../music/songTypes';
import { DEFAULT_LOOP_PAUSE_MS, buildIno, inoFileName } from '../data/buildIno';
import {
  buildPlaylistIno,
  findPinConflicts,
  playlistInoFileName,
} from '../data/buildPlaylistIno';
import type { Settings } from '../data/settings';
import { Modal } from './Modal';

export type ExportMode = 'song' | 'playlist';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  events: SongEvent[];
  songName: string;
  playlist: StoredSong[];
  mode: ExportMode;
  onModeChange: (mode: ExportMode) => void;
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
}

interface PinFieldProps {
  label: string;
  value: number;
  onChange: (pin: number) => void;
}

function PinField({ label, value, onChange }: PinFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input input-pin"
        type="number"
        min={0}
        max={40}
        step={1}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.max(0, Math.min(40, Math.round(next))));
        }}
      />
    </label>
  );
}

export function ExportModal({
  open,
  onClose,
  events,
  songName,
  playlist,
  mode,
  onModeChange,
  settings,
  onSettingsChange,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const isPlaylist = mode === 'playlist';
  const playlistEmpty = isPlaylist && playlist.length === 0;

  const hardware = {
    buzzerPin: settings.buzzerPin,
    buttonPin: settings.buttonPin,
    oledSda: settings.oledSda,
    oledScl: settings.oledScl,
    oledHeight: settings.oledHeight,
  };
  const pinConflicts = isPlaylist ? findPinConflicts(hardware) : [];

  // Nao geramos o sketch da playlist vazia: seria um programa sem nenhuma musica.
  const code = isPlaylist
    ? playlistEmpty
      ? '// Sua playlist está vazia. Adicione músicas para ver o código.'
      : buildPlaylistIno(playlist, hardware)
    : buildIno(events, {
        songName: songName.trim() || 'Minha música',
        buzzerPin: settings.buzzerPin,
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
    link.download = isPlaylist ? playlistInoFileName() : inoFileName(songName);
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
      title={isPlaylist ? 'Código da playlist' : 'Código Arduino completo'}
      subtitle={
        isPlaylist
          ? 'Todas as músicas da playlist, com menu no OLED e botão. Cole no Arduino IDE ou baixe o .ino.'
          : 'Cole no Arduino IDE ou baixe o arquivo .ino.'
      }
      footer={
        <>
          <button type="button" className="btn btn-small" onClick={copy} disabled={playlistEmpty}>
            {copied ? '✓ Copiado!' : '⧉ Copiar código'}
          </button>
          <button
            type="button"
            className="btn btn-small btn-primary"
            onClick={download}
            disabled={playlistEmpty}
          >
            ⬇ Exportar .ino
          </button>
        </>
      }
    >
      <div className="segmented" role="group" aria-label="O que exportar">
        <button
          type="button"
          className={`segmented-btn${!isPlaylist ? ' is-on' : ''}`}
          onClick={() => onModeChange('song')}
        >
          Música atual
        </button>
        <button
          type="button"
          className={`segmented-btn${isPlaylist ? ' is-on' : ''}`}
          onClick={() => onModeChange('playlist')}
        >
          Playlist ({playlist.length})
        </button>
      </div>

      {!isPlaylist ? (
        <div className="highlight-box">
          <PinField
            label="Pino do buzzer"
            value={settings.buzzerPin}
            onChange={(pin) => onSettingsChange({ buzzerPin: pin })}
          />
          <p className="highlight-text">
            Ligue um fio do buzzer no pino <strong>{settings.buzzerPin}</strong> e o outro no{' '}
            <strong>GND</strong>. Se o som não sair, confira se o buzzer é <em>passivo</em>.
          </p>
        </div>
      ) : playlistEmpty ? (
        <p className="empty-state">
          Sua playlist está vazia. Abra uma música e clique em <strong>＋ Playlist</strong> para
          adicioná-la.
        </p>
      ) : (
        <div className="highlight-box">
          <div className="pin-grid">
            <PinField
              label="Buzzer"
              value={settings.buzzerPin}
              onChange={(pin) => onSettingsChange({ buzzerPin: pin })}
            />
            <PinField
              label="Botão"
              value={settings.buttonPin}
              onChange={(pin) => onSettingsChange({ buttonPin: pin })}
            />
            <PinField
              label="OLED SDA"
              value={settings.oledSda}
              onChange={(pin) => onSettingsChange({ oledSda: pin })}
            />
            <PinField
              label="OLED SCL"
              value={settings.oledScl}
              onChange={(pin) => onSettingsChange({ oledScl: pin })}
            />
            <div className="field">
              <span className="field-label">Tela do OLED</span>
              <div className="segmented" role="group" aria-label="Tamanho do OLED">
                {([64, 32] as const).map((height) => (
                  <button
                    key={height}
                    type="button"
                    className={`segmented-btn${settings.oledHeight === height ? ' is-on' : ''}`}
                    onClick={() => onSettingsChange({ oledHeight: height })}
                  >
                    128×{height}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {pinConflicts.length > 0 ? (
            <div className="message message-error" role="alert">
              <strong>Dois itens no mesmo pino</strong>
              <ul className="message-list">
                {pinConflicts.map((conflict) => (
                  <li key={conflict}>{conflict}.</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="highlight-text">
            <strong>Ligações:</strong> buzzer no pino <strong>{settings.buzzerPin}</strong> e GND ·
            botão no pino <strong>{settings.buttonPin}</strong> e GND (sem resistor) · OLED com SDA
            no <strong>{settings.oledSda}</strong>, SCL no <strong>{settings.oledScl}</strong>, VCC
            no 3V3 e GND.
          </p>
          <p className="highlight-text">
            <strong>Botão:</strong> 1 clique = próxima · 2 cliques = anterior · segurar = tocar ·
            tocando, um clique para.
          </p>
          <p className="field-hint">
            Padrão: buzzer 7, botão 10, OLED com SDA 5 e SCL 6. Mude os pinos acima se a sua
            ligação for outra (o I2C padrão do ESP32-C3 SuperMini é SDA 8 e SCL 9). Na Arduino
            IDE, instale as bibliotecas <em>Adafruit GFX</em> e <em>Adafruit SSD1306</em>.
          </p>
        </div>
      )}

      <pre className="code-block code-block-tall" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </Modal>
  );
}
