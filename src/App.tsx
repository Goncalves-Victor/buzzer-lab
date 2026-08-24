/* ==========================================================================
   App.tsx
   Coordenador da aplicacao.

   Responsabilidade unica: ligar o estado da musica (useSong) ao audio
   (AudioEngine, Player, Metronome, Recorder) e aos componentes de interface.
   Nenhuma regra de musica, de audio ou de geracao de codigo mora aqui.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AudioEngine } from './audio/audioEngine';
import { Metronome } from './audio/metronome';
import { Player } from './audio/player';
import type { PlayerState } from './audio/player';

import { DEFAULT_RECORDER_OPTIONS, Recorder } from './music/recorder';
import type { NoteInfo } from './music/notes';
import type { SongEvent, StoredSong } from './music/songTypes';
import { createRestEvent, sanitizeEvents } from './music/songUtils';

import { localSongRepository } from './data/customSongs';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './data/settings';
import type { Settings } from './data/settings';
import { STORAGE_KEYS, readJson, writeJson } from './data/storage';

import { useSong } from './state/useSong';

import { CodePanel } from './components/CodePanel';
import { ExamplePanel } from './components/ExamplePanel';
import { ExportModal } from './components/ExportModal';
import { HelpPanel } from './components/HelpPanel';
import { ImportModal } from './components/ImportModal';
import { NoteEditor } from './components/NoteEditor';
import { Piano } from './components/Piano';
import { QuantizeModal } from './components/QuantizeModal';
import { SettingsModal } from './components/SettingsModal';
import { Timeline } from './components/Timeline';
import { TransportControls } from './components/TransportControls';

const DEFAULT_SONG_NAME = 'Minha música';

type ModalName = 'examples' | 'import' | 'export' | 'settings' | 'help' | 'quantize' | null;

export default function App() {
  const song = useSong([]);

  const [songName, setSongName] = useState(DEFAULT_SONG_NAME);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [openModal, setOpenModal] = useState<ModalName>(null);

  const [playerState, setPlayerState] = useState<PlayerState>('stopped');
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [playheadMs, setPlayheadMs] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);

  const [metronomeOn, setMetronomeOn] = useState(false);
  const [customSongs, setCustomSongs] = useState<StoredSong[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // ---- Objetos de audio: criados uma vez por montagem ---------------------
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;

  const playerRef = useRef<Player | null>(null);
  if (!playerRef.current) {
    playerRef.current = new Player(engine, {
      onPosition: (index, elapsed) => {
        setPlayingIndex(index);
        setPlayheadMs(elapsed);
      },
      onStateChange: setPlayerState,
      onEnd: () => setPlayingIndex(-1),
    });
  }
  const player = playerRef.current;

  const metronomeRef = useRef<Metronome | null>(null);
  if (!metronomeRef.current) metronomeRef.current = new Metronome(engine);
  const metronome = metronomeRef.current;

  const recorderRef = useRef<Recorder | null>(null);
  if (!recorderRef.current) recorderRef.current = new Recorder(DEFAULT_RECORDER_OPTIONS);
  const recorder = recorderRef.current;

  /** Timer da previa de nota do editor; guardado para poder ser cancelado. */
  const previewTimerRef = useRef<number | null>(null);

  // ---- Carregamento inicial ---------------------------------------------
  useEffect(() => {
    const storedSettings = loadSettings();
    setSettings(storedSettings);

    const storedEvents = sanitizeEvents(readJson<unknown>(STORAGE_KEYS.song, []));
    if (storedEvents.length > 0) song.loadEvents(storedEvents);

    const storedName = readJson<string>(STORAGE_KEYS.songName, DEFAULT_SONG_NAME);
    if (typeof storedName === 'string' && storedName.trim()) setSongName(storedName);

    setCustomSongs(localSongRepository.list());
    // Executa so na montagem: e a hidratacao do trabalho salvo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Salvamento automatico --------------------------------------------
  // O primeiro disparo e ignorado, senao o estado vazio inicial apagaria a
  // musica salva antes de a hidratacao acontecer.
  const skipSongSave = useRef(true);
  useEffect(() => {
    if (skipSongSave.current) {
      skipSongSave.current = false;
      return;
    }
    writeJson(STORAGE_KEYS.song, song.events);
  }, [song.events]);

  const skipNameSave = useRef(true);
  useEffect(() => {
    if (skipNameSave.current) {
      skipNameSave.current = false;
      return;
    }
    writeJson(STORAGE_KEYS.songName, songName);
  }, [songName]);

  useEffect(() => {
    saveSettings(settings);
    engine.setVolume(settings.volume);
    recorder.setOptions({
      autoRests: settings.autoRests,
      minRestMs: settings.minRestMs,
      minNoteMs: DEFAULT_RECORDER_OPTIONS.minNoteMs,
    });
    metronome.setBpm(settings.bpm);
  }, [settings, engine, recorder, metronome]);

  // ---- Limpeza geral ao desmontar ---------------------------------------
  useEffect(() => {
    return () => {
      if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
      metronome.stop();
      player.dispose();
      engine.dispose();
    };
  }, [engine, player, metronome]);

  // ---- Cronometro da gravacao -------------------------------------------
  useEffect(() => {
    if (!isRecording) return;
    let frame = 0;
    const tick = () => {
      setRecordElapsed(recorder.elapsed(performance.now()));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isRecording, recorder]);

  // ---- Aviso temporario --------------------------------------------------
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ---- Atalhos de teclado para desfazer/refazer -------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      if (event.shiftKey) song.redo();
      else song.undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [song]);

  // ---- Piano -------------------------------------------------------------
  /** Frequencia que o usuario esta segurando agora, ou null. */
  const pendingNoteRef = useRef<number | null>(null);

  const handleNoteOn = useCallback(
    (note: NoteInfo) => {
      pendingNoteRef.current = note.frequency;
      if (engine.isReady) {
        engine.noteOn(note.frequency);
      } else {
        // Primeiro toque da sessao: o AudioContext so pode ser criado dentro do
        // gesto do usuario. Se a tecla for solta antes de o unlock terminar,
        // pendingNoteRef ja mudou e a nota nao chega a soar presa.
        void engine.unlock().then(() => {
          if (pendingNoteRef.current === note.frequency) engine.noteOn(note.frequency);
        });
      }
      if (recorder.isRecording) recorder.noteOn(note, performance.now());
    },
    [engine, recorder],
  );

  const handleNoteOff = useCallback(() => {
    pendingNoteRef.current = null;
    engine.noteOff();
    if (recorder.isRecording) recorder.noteOff(performance.now());
  }, [engine, recorder]);

  // ---- Gravacao ----------------------------------------------------------
  const startRecording = useCallback(async () => {
    await engine.unlock();
    player.stop();
    recorder.start(performance.now());
    setRecordElapsed(0);
    setIsRecording(true);
    if (metronomeOn) metronome.start();
  }, [engine, player, recorder, metronome, metronomeOn]);

  const stopRecording = useCallback(() => {
    const recorded = recorder.stop(performance.now());
    setIsRecording(false);
    metronome.stop();
    engine.noteOff();
    if (recorded.length > 0) {
      song.appendEvents(recorded);
      setToast(`${recorded.length} passos adicionados à música.`);
    } else {
      setToast('Nada foi gravado. Toque o piano enquanto o botão estiver vermelho.');
    }
  }, [recorder, metronome, engine, song]);

  const toggleRecord = useCallback(() => {
    if (isRecording) stopRecording();
    else void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ---- Reproducao --------------------------------------------------------
  const handlePlay = useCallback(async () => {
    if (isRecording || song.events.length === 0) return;
    await engine.unlock();
    player.play(song.events);
  }, [engine, player, song.events, isRecording]);

  const handlePause = useCallback(() => player.pause(), [player]);
  const handleStop = useCallback(() => player.stop(), [player]);
  const handleToStart = useCallback(() => player.toStart(), [player]);

  const handlePreview = useCallback(
    (event: SongEvent) => {
      if (event.type === 'rest') return;
      void engine.unlock().then(() => {
        engine.noteOn(event.frequency);
        if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = window.setTimeout(() => {
          engine.noteOff();
          previewTimerRef.current = null;
        }, event.duration);
      });
    },
    [engine],
  );

  // ---- Metronomo ---------------------------------------------------------
  const toggleMetronome = useCallback(() => {
    setMetronomeOn((current) => {
      const next = !current;
      if (next) {
        void engine.unlock().then(() => {
          metronome.setBpm(settings.bpm);
          metronome.start();
        });
      } else {
        metronome.stop();
      }
      return next;
    });
  }, [engine, metronome, settings.bpm]);

  useEffect(() => {
    metronome.setBpm(settings.bpm);
  }, [metronome, settings.bpm]);

  // ---- Acoes da musica ---------------------------------------------------
  const loadSong = useCallback(
    (events: SongEvent[], name: string) => {
      player.stop();
      song.resetEvents(events);
      setSongName(name);
      // resetEvents nao dispara o autosave quando o array e igual; forcamos aqui.
      writeJson(STORAGE_KEYS.song, events);
    },
    [player, song],
  );

  const handleNewSong = useCallback(() => {
    if (song.events.length > 0) {
      const confirmed = window.confirm(
        'Isso vai apagar a música atual. Você quer mesmo começar uma nova?',
      );
      if (!confirmed) return;
    }
    loadSong([], DEFAULT_SONG_NAME);
    setToast('Música nova criada.');
  }, [song.events.length, loadSong]);

  const handleClearTimeline = useCallback(() => {
    if (song.events.length === 0) return;
    const confirmed = window.confirm('Apagar todos os passos da música?');
    if (!confirmed) return;
    player.stop();
    // Usamos setEvents (e nao reset) para o Desfazer ainda trazer a musica.
    song.setEvents([]);
  }, [player, song]);

  const handleSaveCurrent = useCallback(() => {
    if (song.events.length === 0) return;
    localSongRepository.save(songName, song.events);
    setCustomSongs(localSongRepository.list());
    setToast(`"${songName}" foi salva em Meus exemplos.`);
  }, [song.events, songName]);

  const handleDeleteCustom = useCallback((id: string) => {
    localSongRepository.remove(id);
    setCustomSongs(localSongRepository.list());
  }, []);

  const handleImport = useCallback(
    (events: SongEvent[], suggestedName: string) => {
      player.stop();
      song.setEvents(events);
      setSongName(suggestedName || DEFAULT_SONG_NAME);
      setToast(`Música importada com ${events.length} passos.`);
    },
    [player, song],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  // ---- Dados derivados ---------------------------------------------------
  const playbackNote = useMemo(() => {
    if (playingIndex < 0 || playingIndex >= song.events.length) return null;
    const event = song.events[playingIndex];
    return event.type === 'note' ? event.note : null;
  }, [playingIndex, song.events]);

  const elapsedForDisplay = isRecording ? recordElapsed : playheadMs;
  const pianoDisabled = playerState === 'playing';

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-wave" aria-hidden="true">
            <svg viewBox="0 0 96 24" role="presentation">
              <path
                d="M2 18 L2 6 L14 6 L14 18 L26 18 L26 6 L38 6 L38 18 L50 18 L50 6 L62 6 L62 18 L74 18 L74 6 L94 6"
                fill="none"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h1>Buzzer Lab</h1>
            <p className="subtitle">
              Crie, teste e transforme músicas em código para seu buzzer.
            </p>
          </div>
        </div>

        <nav className="header-actions" aria-label="Ações principais">
          <button type="button" className="btn btn-small" onClick={() => setOpenModal('examples')}>
            Exemplos
          </button>
          <button type="button" className="btn btn-small" onClick={() => setOpenModal('import')}>
            Importar
          </button>
          <button type="button" className="btn btn-small" onClick={() => setOpenModal('settings')}>
            Configurações
          </button>
          <button type="button" className="btn btn-small" onClick={() => setOpenModal('help')}>
            Ajuda
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={handleNewSong}>
            Nova música
          </button>
        </nav>
      </header>

      <div className="song-bar">
        <label className="field field-inline">
          <span className="field-label">Nome da música</span>
          <input
            className="input"
            type="text"
            maxLength={40}
            value={songName}
            onChange={(event) => setSongName(event.target.value)}
            placeholder={DEFAULT_SONG_NAME}
          />
        </label>
      </div>

      <main className="layout">
        <Piano
          baseOctave={settings.baseOctave}
          onBaseOctaveChange={(octave) => updateSettings({ baseOctave: octave })}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          playbackNote={playbackNote}
          disabled={pianoDisabled}
        />

        <TransportControls
          playerState={playerState}
          isRecording={isRecording}
          elapsedMs={elapsedForDisplay}
          hasEvents={song.events.length > 0}
          onToggleRecord={toggleRecord}
          onPlay={() => void handlePlay()}
          onPause={handlePause}
          onStop={handleStop}
          onToStart={handleToStart}
          canUndo={song.canUndo}
          canRedo={song.canRedo}
          onUndo={song.undo}
          onRedo={song.redo}
          bpm={settings.bpm}
          onBpmChange={(bpm) => updateSettings({ bpm })}
          metronomeOn={metronomeOn}
          onToggleMetronome={toggleMetronome}
          volume={settings.volume}
          onVolumeChange={(volume) => updateSettings({ volume })}
        />

        <Timeline
          events={song.events}
          selectedId={song.selectedId}
          selectedIndex={song.selectedIndex}
          playingIndex={playingIndex}
          onSelect={song.select}
          onAddRest={() => song.addRest()}
          onDelete={song.deleteSelected}
          onDuplicate={song.duplicateSelected}
          onMove={song.moveSelected}
          onInsertBefore={() =>
            song.insertRelativeToSelection(createRestEvent(settings.quantizeStep), 'before')
          }
          onInsertAfter={() =>
            song.insertRelativeToSelection(createRestEvent(settings.quantizeStep), 'after')
          }
          onReorder={song.moveByDrag}
          onClear={handleClearTimeline}
          onQuantize={() => setOpenModal('quantize')}
        />

        <div className="bottom-grid">
          <NoteEditor
            event={song.selectedEvent}
            position={song.selectedIndex}
            total={song.events.length}
            onChange={song.updateSelected}
            onPreview={handlePreview}
          />
          <CodePanel
            events={song.events}
            songName={songName}
            onOpenFullCode={() => setOpenModal('export')}
          />
        </div>
      </main>

      <footer className="app-foot">
        <p>
          Eu faço a música aqui, escuto como ficaria no buzzer e depois pego o código para colocar
          no meu robô.
        </p>
      </footer>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <ExamplePanel
        open={openModal === 'examples'}
        onClose={() => setOpenModal(null)}
        customSongs={customSongs}
        hasCurrentSong={song.events.length > 0}
        onLoad={loadSong}
        onSaveCurrent={handleSaveCurrent}
        onDeleteCustom={handleDeleteCustom}
      />

      <ImportModal
        open={openModal === 'import'}
        onClose={() => setOpenModal(null)}
        onImport={handleImport}
      />

      <ExportModal
        open={openModal === 'export'}
        onClose={() => setOpenModal(null)}
        events={song.events}
        songName={songName}
        buzzerPin={settings.buzzerPin}
        onBuzzerPinChange={(pin) => updateSettings({ buzzerPin: pin })}
      />

      <SettingsModal
        open={openModal === 'settings'}
        onClose={() => setOpenModal(null)}
        settings={settings}
        onChange={updateSettings}
      />

      <QuantizeModal
        open={openModal === 'quantize'}
        onClose={() => setOpenModal(null)}
        events={song.events}
        bpm={settings.bpm}
        defaultStep={settings.quantizeStep}
        onApply={song.setEvents}
      />

      <HelpPanel open={openModal === 'help'} onClose={() => setOpenModal(null)} />
    </div>
  );
}
