/* ==========================================================================
   settings.ts
   Preferencias do usuario, salvas em buzzerlab.settings.

   Ficam num arquivo proprio para o modal de configuracoes, o App e a
   persistencia concordarem sobre a forma dos dados.
   ========================================================================== */

import { DEFAULT_BUZZER_PIN } from './buildIno';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

export interface Settings {
  /** Volume do buzzer virtual, de 0 a 1. */
  volume: number;
  /** Oitava usada pelo teclado do computador (a tecla A toca este C). */
  baseOctave: number;
  /** Passo padrao da quantizacao, em ms. */
  quantizeStep: number;
  bpm: number;
  /** Registrar automaticamente o silencio entre notas como pausa. */
  autoRests: boolean;
  /** Silencio minimo (ms) para virar pausa durante a gravacao. */
  minRestMs: number;
  buzzerPin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.25,
  baseOctave: 4,
  quantizeStep: 125,
  bpm: 120,
  autoRests: true,
  minRestMs: 90,
  buzzerPin: DEFAULT_BUZZER_PIN,
};

/** Le as configuracoes garantindo que valores antigos ou corrompidos nao quebrem o app. */
export function loadSettings(): Settings {
  const stored = readJson<Partial<Settings>>(STORAGE_KEYS.settings, {});
  return {
    volume: clamp(stored.volume, 0, 1, DEFAULT_SETTINGS.volume),
    baseOctave: clamp(stored.baseOctave, 3, 5, DEFAULT_SETTINGS.baseOctave),
    quantizeStep: clamp(stored.quantizeStep, 1, 2000, DEFAULT_SETTINGS.quantizeStep),
    bpm: clamp(stored.bpm, 40, 240, DEFAULT_SETTINGS.bpm),
    autoRests: typeof stored.autoRests === 'boolean' ? stored.autoRests : DEFAULT_SETTINGS.autoRests,
    minRestMs: clamp(stored.minRestMs, 20, 2000, DEFAULT_SETTINGS.minRestMs),
    buzzerPin: clamp(stored.buzzerPin, 0, 40, DEFAULT_SETTINGS.buzzerPin),
  };
}

export function saveSettings(settings: Settings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
