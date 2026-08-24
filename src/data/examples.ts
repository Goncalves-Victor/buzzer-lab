/* ==========================================================================
   examples.ts
   Melodias prontas para o aluno abrir, ouvir e editar.

   Notacao compacta: 'C4:250' e uma nota, 'REST:125' e uma pausa.
   Ela existe so para deixar este arquivo legivel; ao carregar, tudo vira
   SongEvent[] normal e pode ser editado como qualquer musica gravada.

   Para adicionar um exemplo novo, basta acrescentar um item em EXAMPLES.
   ========================================================================== */

import { getNote } from '../music/notes';
import type { SongEvent } from '../music/songTypes';
import { createNoteEvent, createRestEvent } from '../music/songUtils';

export interface ExampleSong {
  id: string;
  name: string;
  /** Frase curta explicando o que o exemplo ensina. */
  description: string;
  score: string[];
}

/** Converte a notacao compacta em eventos. Notas desconhecidas viram pausa. */
export function scoreToEvents(score: string[]): SongEvent[] {
  const events: SongEvent[] = [];
  for (const item of score) {
    const [rawName, rawDuration] = item.split(':');
    const duration = Number(rawDuration);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const name = rawName.trim().toUpperCase();
    if (name === 'REST') {
      events.push(createRestEvent(duration));
      continue;
    }
    const note = getNote(name);
    events.push(note ? createNoteEvent(note, duration) : createRestEvent(duration));
  }
  return events;
}

export const EXAMPLES: ExampleSong[] = [
  {
    id: 'escala',
    name: 'Escala de dó',
    description: 'As sete notas subindo. Bom para ouvir como a frequência muda.',
    score: ['C4:250', 'D4:250', 'E4:250', 'F4:250', 'G4:250', 'A4:250', 'B4:250', 'C5:500'],
  },
  {
    id: 'arpejo',
    name: 'Arpejo de dó',
    description: 'Sobe e desce pulando notas. Mostra saltos maiores de frequência.',
    score: ['C4:250', 'E4:250', 'G4:250', 'C5:500', 'G4:250', 'E4:250', 'C4:500'],
  },
  {
    id: 'estrelinha',
    name: 'Brilha, brilha, estrelinha',
    description: 'Melodia tradicional. Boa para treinar edição de duração.',
    score: [
      'C4:250', 'C4:250', 'G4:250', 'G4:250', 'A4:250', 'A4:250', 'G4:500',
      'REST:125',
      'F4:250', 'F4:250', 'E4:250', 'E4:250', 'D4:250', 'D4:250', 'C4:500',
    ],
  },
  {
    id: 'alegria',
    name: 'Ode à alegria',
    description: 'Trecho de Beethoven, com uma nota pontuada no fim.',
    score: [
      'E4:250', 'E4:250', 'F4:250', 'G4:250',
      'G4:250', 'F4:250', 'E4:250', 'D4:250',
      'C4:250', 'C4:250', 'D4:250', 'E4:250',
      'E4:375', 'D4:125', 'D4:500',
    ],
  },
  {
    id: 'sirene',
    name: 'Sirene de alerta',
    description: 'Duas notas alternadas. Útil como aviso em um robô.',
    score: [
      'A4:200', 'A5:200', 'A4:200', 'A5:200',
      'A4:200', 'A5:200', 'A4:200', 'A5:200',
    ],
  },
  {
    id: 'ligando',
    name: 'Bipe de partida',
    description: 'Três bipes curtos com pausas. Ideal para o robô ligar.',
    score: ['C5:80', 'REST:80', 'E5:80', 'REST:80', 'G5:160', 'REST:300', 'C6:250'],
  },
  {
    id: 'pausas',
    name: 'Estudo de pausas',
    description: 'Mesma nota com silêncios diferentes. Mostra o efeito da pausa.',
    score: [
      'G4:125', 'REST:125', 'G4:125', 'REST:250',
      'G4:125', 'REST:500', 'G4:250',
    ],
  },
];
