/* ==========================================================================
   PlaylistModal.tsx
   A playlist do aluno: as musicas que vao juntas para o ESP32, na ordem em
   que aparecem no menu do OLED.

   As musicas vem do PlaylistRepository (via App), nao do localStorage direto.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { SongEvent, StoredSong } from '../music/songTypes';
import { toOledText } from '../export/codeGenerator';
import { PLAYLIST_NAME_MAX } from '../data/playlist';
import { formatSeconds, totalDuration } from '../music/songUtils';
import { Modal } from './Modal';

interface PlaylistModalProps {
  open: boolean;
  onClose: () => void;
  playlist: StoredSong[];
  currentName: string;
  hasCurrentSong: boolean;
  onAddCurrent: () => void;
  onLoad: (events: SongEvent[], name: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onExport: () => void;
}

interface PlaylistRowProps {
  song: StoredSong;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onLoad: PlaylistModalProps['onLoad'];
  onRename: PlaylistModalProps['onRename'];
  onMove: PlaylistModalProps['onMove'];
  onRemove: PlaylistModalProps['onRemove'];
  onClose: () => void;
}

function PlaylistRow({
  song,
  index,
  isFirst,
  isLast,
  onLoad,
  onRename,
  onMove,
  onRemove,
  onClose,
}: PlaylistRowProps) {
  // Rascunho local: o nome so e gravado ao sair do campo. Gravar a cada letra
  // cortaria o espaco final e o aluno nao conseguiria digitar "Harry P".
  const [draft, setDraft] = useState(song.name);
  useEffect(() => setDraft(song.name), [song.name]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== song.name) onRename(song.id, next);
    else setDraft(song.name);
  };

  const oledName = toOledText(song.name, PLAYLIST_NAME_MAX);

  return (
    <li className="example-item">
      <div className="example-info playlist-info">
        <label className="playlist-name">
          <span className="playlist-index">{index + 1}</span>
          <input
            className="input"
            type="text"
            maxLength={PLAYLIST_NAME_MAX}
            value={draft}
            aria-label={`Nome da música ${index + 1} no OLED`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </label>
        <span className="example-meta">
          {song.events.length} passos · {formatSeconds(totalDuration(song.events))}
          {oledName !== song.name.trim() ? ` · no OLED: ${oledName}` : ''}
        </span>
      </div>
      <div className="example-actions">
        <button
          type="button"
          className="btn btn-small"
          onClick={() => onMove(song.id, -1)}
          disabled={isFirst}
          aria-label={`Subir ${song.name}`}
          title="Subir na lista"
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => onMove(song.id, 1)}
          disabled={isLast}
          aria-label={`Descer ${song.name}`}
          title="Descer na lista"
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => {
            // Copiamos os eventos para a musica aberta nao alterar a da playlist.
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
          onClick={() => onRemove(song.id)}
          aria-label={`Tirar ${song.name} da playlist`}
        >
          🗑
        </button>
      </div>
    </li>
  );
}

export function PlaylistModal({
  open,
  onClose,
  playlist,
  currentName,
  hasCurrentSong,
  onAddCurrent,
  onLoad,
  onRename,
  onMove,
  onRemove,
  onExport,
}: PlaylistModalProps) {
  const total = playlist.reduce((sum, song) => sum + totalDuration(song.events), 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title="Playlist"
      subtitle="As músicas daqui vão juntas para o ESP32, com menu no OLED e botão para navegar."
      footer={
        <>
          <button
            type="button"
            className="btn btn-small"
            onClick={onAddCurrent}
            disabled={!hasCurrentSong}
            title="Guarda uma cópia da música que está aberta. Se já houver uma com o mesmo nome, ela é atualizada."
          >
            ＋ Adicionar “{currentName.trim() || 'Minha música'}”
          </button>
          <button
            type="button"
            className="btn btn-small btn-primary"
            onClick={onExport}
            disabled={playlist.length === 0}
          >
            ⬇ Exportar playlist
          </button>
        </>
      }
    >
      {playlist.length === 0 ? (
        <p className="empty-state">
          Sua playlist está vazia. Abra ou grave uma música e use <strong>＋ Adicionar</strong>.
        </p>
      ) : (
        <>
          <p className="hint-text">
            {playlist.length} {playlist.length === 1 ? 'música' : 'músicas'} · {formatSeconds(total)}{' '}
            no total. A ordem daqui é a ordem do menu no OLED.
          </p>
          <ul className="example-list">
            {playlist.map((song, index) => (
              <PlaylistRow
                key={song.id}
                song={song}
                index={index}
                isFirst={index === 0}
                isLast={index === playlist.length - 1}
                onLoad={onLoad}
                onRename={onRename}
                onMove={onMove}
                onRemove={onRemove}
                onClose={onClose}
              />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
