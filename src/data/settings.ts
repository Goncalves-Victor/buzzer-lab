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
  /** Pino do botao unico de navegacao da playlist (ligado ao GND, com pull-up interno). */
  buttonPin: number;
  /** Pinos I2C do OLED na exportacao da playlist (padrao: SDA 5, SCL 6). */
  oledSda: number;
  oledScl: number;
  /** Altura do OLED em pixels: 64 (128x64) ou 32 (128x32). */
  oledHeight: 32 | 64;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.25,
  baseOctave: 4,
  quantizeStep: 125,
  bpm: 120,
  autoRests: true,
  minRestMs: 90,
  buzzerPin: DEFAULT_BUZZER_PIN,
  buttonPin: 10,
  oledSda: 5,
  oledScl: 6,
  oledHeight: 64,
};

/**
 * Pinos que eram o padrao antes de mudarmos para buzzer 7 / botao 10 / SDA 5 /
 * SCL 6. Como as preferencias ficam salvas no navegador, quem nunca mexeu nos
 * pinos continuaria vendo os antigos (e o buzzer no 5 bateria com o SDA novo).
 */
const OLD_DEFAULT_PINS = { buzzerPin: 5, buttonPin: 4, oledSda: 8, oledScl: 9 } as const;

/** Verdadeiro se cada pino salvo esta ausente ou ainda e o valor antigo. */
function isUsingOldDefaultPins(stored: Partial<Settings>): boolean {
  return (Object.keys(OLD_DEFAULT_PINS) as (keyof typeof OLD_DEFAULT_PINS)[]).every(
    (key) => stored[key] === undefined || stored[key] === OLD_DEFAULT_PINS[key],
  );
}

/** Le as configuracoes garantindo que valores antigos ou corrompidos nao quebrem o app. */
export function loadSettings(): Settings {
  const stored = readJson<Partial<Settings>>(STORAGE_KEYS.settings, {});
  // Alguem que escolheu qualquer pino diferente do antigo padrao mantem a escolha.
  if (isUsingOldDefaultPins(stored)) {
    stored.buzzerPin = DEFAULT_SETTINGS.buzzerPin;
    stored.buttonPin = DEFAULT_SETTINGS.buttonPin;
    stored.oledSda = DEFAULT_SETTINGS.oledSda;
    stored.oledScl = DEFAULT_SETTINGS.oledScl;
  }
  return {
    volume: clamp(stored.volume, 0, 1, DEFAULT_SETTINGS.volume),
    baseOctave: clamp(stored.baseOctave, 3, 5, DEFAULT_SETTINGS.baseOctave),
    quantizeStep: clamp(stored.quantizeStep, 1, 2000, DEFAULT_SETTINGS.quantizeStep),
    bpm: clamp(stored.bpm, 40, 240, DEFAULT_SETTINGS.bpm),
    autoRests: typeof stored.autoRests === 'boolean' ? stored.autoRests : DEFAULT_SETTINGS.autoRests,
    minRestMs: clamp(stored.minRestMs, 20, 2000, DEFAULT_SETTINGS.minRestMs),
    buzzerPin: clamp(stored.buzzerPin, 0, 40, DEFAULT_SETTINGS.buzzerPin),
    buttonPin: clamp(stored.buttonPin, 0, 40, DEFAULT_SETTINGS.buttonPin),
    oledSda: clamp(stored.oledSda, 0, 40, DEFAULT_SETTINGS.oledSda),
    oledScl: clamp(stored.oledScl, 0, 40, DEFAULT_SETTINGS.oledScl),
    oledHeight: stored.oledHeight === 32 ? 32 : 64,
  };
}

export function saveSettings(settings: Settings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
