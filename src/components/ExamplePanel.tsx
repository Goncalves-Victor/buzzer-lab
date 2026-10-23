/* ==========================================================================
   ExamplePanel.tsx
   Exemplos prontos e "Meus exemplos".

   As musicas do aluno vem do SongRepository, nao do localStorage direto.
   Trocar por nuvem depois nao mexe neste componente.
   ========================================================================== */

import { EXAMPLES, scoreToEvents } from '../data/examples';
import type { SongEvent, StoredSong } from '../music/songTypes';
import { formatSeconds, totalDuration } from '../music/songUtils';
import { Modal } from './Modal';

interface ExamplePanelProps {
  open: boolean;
  onClose: () => void;
  customSongs: StoredSong[];
  hasCurrentSong: boolean;
  onLoad: (events: SongEvent[], name: string) => void;
  onSaveCurrent: () => void;
  onDeleteCustom: (id: string) => void;
  /** Guarda uma copia da musica na playlist sem precisar abri-la antes. */
  onAddToPlaylist: (events: SongEvent[], name: string) => void;
}

export function ExamplePanel({
  open,
  onClose,
  customSongs,
  hasCurrentSong,
  onLoad,
  onSaveCurrent,
  onDeleteCustom,
  onAddToPlaylist,
}: ExamplePanelProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title="Exemplos"
      subtitle="Abra uma música pronta, ouça e edite do jeito que quiser."
      footer={
        <button
          type="button"
          className="btn btn-small btn-primary"
          onClick={onSaveCurrent}
          disabled={!hasCurrentSong}
        >
          ★ Salvar atual como exemplo
        </button>
      }
    >
      <h3 className="section-title">Melodias prontas</h3>
      <ul className="example-list">
        {EXAMPLES.map((example) => {
          const events = scoreToEvents(example.score);
          return (
            <li key={example.id} className="example-item">
              <div className="example-info">
                <strong>{example.name}</strong>
                <span className="example-desc">{example.description}</span>
                <span className="example-meta">
                  {events.length} passos · {formatSeconds(totalDuration(events))}
                </span>
              </div>
              <div className="example-actions">
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => onAddToPlaylist(events, example.name)}
                  title="Adicionar à playlist"
                >
                  ＋ Playlist
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    onLoad(events, example.name);
                    onClose();
                  }}
                >
                  Abrir
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="section-title">Meus exemplos</h3>
      {customSongs.length === 0 ? (
        <p className="empty-state">
          Você ainda não salvou nenhuma música. Grave uma melodia e use{' '}
          <strong>Salvar atual como exemplo</strong>.
        </p>
      ) : (
        <ul className="example-list">
          {customSongs.map((song) => (
            <li key={song.id} className="example-item">
              <div className="example-info">
                <strong>{song.name}</strong>
                <span className="example-meta">
                  {song.events.length} passos · {formatSeconds(totalDuration(song.events))}
                </span>
              </div>
              <div className="example-actions">
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => onAddToPlaylist(song.events, song.name)}
                  title="Adicionar à playlist"
                >
                  ＋ Playlist
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    // Copiamos os eventos para a musica aberta nao alterar a salva.
                    onLoad(
                      song.events.map((event) => ({ ...event })),
                      song.name,
                    );
                    onClose();
                  }}
                >
                  Abrir
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => onDeleteCustom(song.id)}
                  aria-label={`Excluir ${song.name}`}
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
