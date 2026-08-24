/* ==========================================================================
   quantize.ts
   "Ajustar tempos": arredonda duracoes gravadas para valores redondos.

   A quantizacao e sempre opcional e reversivel enquanto o usuario nao confirma:
   preview() so calcula, apply() e que devolve a nova musica. Como o historico
   guarda snapshots, mesmo depois de aplicar o Desfazer traz os valores originais.
   ========================================================================== */

import type { SongEvent } from './songTypes';

export interface QuantizePreviewItem {
  event: SongEvent;
  originalDuration: number;
  newDuration: number;
  changed: boolean;
}

/** Arredonda um valor para o multiplo mais proximo do passo, com minimo de 1 passo. */
export function quantizeDuration(duration: number, step: number): number {
  if (step <= 0) return Math.round(duration);
  const steps = Math.max(1, Math.round(duration / step));
  return steps * step;
}

export function previewQuantize(events: SongEvent[], step: number): QuantizePreviewItem[] {
  return events.map((event) => {
    const newDuration = quantizeDuration(event.duration, step);
    return {
      event,
      originalDuration: event.duration,
      newDuration,
      changed: newDuration !== event.duration,
    };
  });
}

export function applyQuantize(events: SongEvent[], step: number): SongEvent[] {
  return events.map((event) => ({ ...event, duration: quantizeDuration(event.duration, step) }));
}

/**
 * Sugere um passo a partir do BPM: a semicolcheia do andamento atual.
 * Serve so como atalho; o valor final continua sendo em milissegundos.
 */
export function stepFromBpm(bpm: number): number {
  const beatMs = 60000 / Math.max(1, bpm);
  return Math.round(beatMs / 4);
}

/** Quantos eventos mudariam de duracao. Usado no texto de confirmacao. */
export function countChanges(items: QuantizePreviewItem[]): number {
  return items.filter((i) => i.changed).length;
}
