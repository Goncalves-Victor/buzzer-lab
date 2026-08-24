/* ==========================================================================
   songTypes.ts
   Modelo interno da musica.

   Regra importante do projeto: os vetores C++ (vetNotas/vetDuracao) NAO sao a
   fonte de verdade. Eles sao apenas uma representacao de exportacao.
   A fonte de verdade e sempre um SongEvent[].
   ========================================================================== */

/** Um evento pode ser uma nota audivel ou um silencio (pausa). */
export type SongEventType = 'note' | 'rest';

/**
 * Um passo da musica. Cada SongEvent vira exatamente uma posicao nos dois
 * vetores exportados para o Arduino.
 */
export interface SongEvent {
  /** Identificador estavel, usado como key do React e na selecao. */
  id: string;
  /** Nome legivel da nota ('D4') ou 'REST' quando for pausa. */
  note: string;
  /** Frequencia em Hz. Pode ter decimais aqui; 0 significa silencio. */
  frequency: number;
  /** Duracao em milissegundos. */
  duration: number;
  type: SongEventType;
}

/** Musica salva pelo usuario ("Meus exemplos") ou embutida ("Exemplos"). */
export interface StoredSong {
  id: string;
  name: string;
  events: SongEvent[];
  /** Timestamp de criacao, usado so para ordenar a lista. */
  createdAt: number;
}

/** Resolucoes de quantizacao oferecidas ao usuario, em ms. */
export const QUANTIZE_STEPS = [62, 125, 250, 500] as const;

/** Duracoes rapidas mostradas como botoes no editor de nota. */
export const QUICK_DURATIONS = [62, 125, 250, 375, 500, 750, 1000] as const;
