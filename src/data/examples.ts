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

  // ---- Melodias conhecidas (convertidas das tabelas de frequencia) ----
  {
    id: 'mario',
    name: 'Mario',
    description: 'Tema clássico de videogame. Notas curtas e rápidas, com muitas pausas.',
    score: [
      'E7:83', 'E7:83', 'REST:83', 'E7:83', 'REST:83', 'C7:83', 'E7:83', 'REST:83',
      'G7:83', 'REST:83', 'REST:83', 'REST:83', 'G6:83', 'REST:83', 'REST:83', 'REST:83',
      'C7:83', 'REST:83', 'REST:83', 'G6:83', 'REST:83', 'REST:83', 'E6:83', 'REST:83',
      'REST:83', 'A6:83', 'REST:83', 'B6:83', 'REST:83', 'A#6:83', 'A6:83', 'REST:83',
      'G6:111', 'E7:111', 'G7:111', 'A6:83', 'REST:83', 'F7:83', 'G7:83', 'REST:83',
      'E7:83', 'REST:83', 'C7:83', 'D7:83', 'B6:83', 'REST:83', 'REST:83',
    ],
  },
  {
    id: 'megalovania',
    name: 'Megalovania',
    description: 'Tema de videogame com notas repetidas e saltos de oitava.',
    score: [
      'D4:125', 'D4:125', 'D5:250', 'A4:375', 'G#4:250', 'G4:250', 'F4:250', 'D4:125',
      'F4:125', 'G4:125', 'C4:125', 'C4:125', 'D5:250', 'A4:375', 'G#4:250', 'G4:250',
      'F4:250', 'D4:125', 'F4:125', 'G4:125', 'B3:125', 'B3:125', 'D5:250', 'A4:375',
      'G#4:250', 'G4:250', 'F4:250', 'D4:125', 'F4:125', 'G4:125', 'A#3:125', 'A#3:125',
      'D5:250', 'A4:375', 'G#4:250', 'G4:250', 'F4:250', 'D4:125', 'F4:125', 'G4:125',
    ],
  },
  {
    id: 'harry-potter',
    name: 'Harry Potter',
    description: 'Melodia lenta, com notas longas. Boa para ouvir a duração.',
    score: [
      'B4:300', 'E5:450', 'G5:150', 'F#5:300', 'E5:600', 'B5:300', 'A5:900', 'F#5:900',
      'E5:450', 'G5:150', 'F#5:300', 'D#5:600', 'E5:300', 'B4:900',
    ],
  },
  {
    id: 'never-gonna',
    name: 'Never Gonna Give You Up',
    description: 'Melodia longa e animada, com notas de tamanhos bem diferentes.',
    score: [
      'A4:132', 'B4:132', 'D5:132', 'B4:132', 'F#5:395', 'F#5:395', 'E5:789', 'A4:132',
      'B4:132', 'D5:132', 'B4:132', 'E5:395', 'E5:395', 'D5:395', 'C#5:132', 'B4:395',
      'A4:132', 'B4:132', 'D5:132', 'B4:132', 'D5:526', 'E5:263', 'C#5:395', 'B4:132',
      'A4:263', 'A4:263', 'A4:263', 'E5:526', 'D5:1053', 'A4:132', 'B4:132', 'D5:132',
      'B4:132', 'F#5:395', 'F#5:395', 'E5:789', 'A4:132', 'B4:132', 'D5:132', 'B4:132',
      'A5:526', 'C#5:263', 'D5:395', 'C#5:132', 'B4:263', 'A4:132', 'B4:132', 'D5:132',
      'B4:132', 'D5:526', 'E5:263', 'C#5:395', 'B4:132', 'A4:526', 'A4:263', 'E5:526',
      'D5:1053', 'REST:526', 'REST:263',
    ],
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Tema do jogo, com ritmo marcado e uma pausa no meio.',
    score: [
      'E5:250', 'B4:125', 'C5:125', 'D5:250', 'C5:125', 'B4:125', 'A4:250', 'A4:125',
      'C5:125', 'E5:250', 'D5:125', 'C5:125', 'B4:375', 'B4:125', 'C5:125', 'D5:250',
      'E5:250', 'C5:250', 'A4:375', 'A4:250', 'REST:125', 'D5:250', 'F5:125', 'A5:250',
      'G5:125', 'F5:125', 'E5:375', 'C5:125', 'E5:250', 'D5:125', 'C5:125', 'B4:375',
      'B4:125', 'C5:125', 'D5:250', 'E5:250', 'C5:250', 'A4:375', 'A4:375',
    ],
  },
  {
    id: 'marcha-imperial',
    name: 'Marcha Imperial (Star Wars)',
    description: 'Marcha pesada, com notas longas e curtas alternadas.',
    score: [
      'G4:500', 'G4:500', 'G4:500', 'D#4:350', 'A#4:150', 'G4:500', 'D#4:350', 'A#4:150',
      'G4:800', 'D5:500', 'D5:500', 'D5:500', 'D#5:350', 'A#4:150', 'F#4:500', 'D#4:350',
      'A#4:150', 'G4:800', 'G5:500', 'G4:300', 'G4:150', 'G5:500', 'F#5:300', 'F5:150',
      'E5:150', 'D#5:150', 'E5:300', 'REST:100', 'G#4:300', 'C#5:500', 'C5:300', 'B4:150',
      'A#4:150', 'A4:150', 'A#4:300',
    ],
  },
  {
    id: 'piratas',
    name: 'Piratas do Caribe',
    description: 'Música longa, com trechos que se repetem. Boa para treinar edição.',
    score: [
      'E4:125', 'G4:125', 'A4:250', 'A4:125', 'REST:125', 'A4:125', 'B4:125', 'C5:250',
      'C5:125', 'REST:125', 'C5:125', 'D5:125', 'B4:250', 'B4:125', 'REST:125', 'A4:125',
      'G4:125', 'A4:375', 'REST:125', 'E4:125', 'G4:125', 'A4:250', 'A4:125', 'REST:125',
      'A4:125', 'B4:125', 'C5:250', 'C5:125', 'REST:125', 'C5:125', 'D5:125', 'B4:250',
      'B4:125', 'REST:125', 'A4:125', 'G4:125', 'A4:375', 'REST:125', 'E4:125', 'G4:125',
      'A4:250', 'A4:125', 'REST:125', 'A4:125', 'C5:125', 'D5:250', 'D5:125', 'REST:125',
      'D5:125', 'E5:125', 'F5:250', 'F5:125', 'REST:125', 'E5:125', 'D5:125', 'E5:125',
      'A4:250', 'REST:125', 'A4:125', 'B4:125', 'C5:250', 'C5:125', 'REST:125', 'D5:250',
      'E5:125', 'A4:250', 'REST:125', 'A4:125', 'C5:125', 'B4:250', 'B4:125', 'REST:125',
      'C5:125', 'A4:125', 'B4:375', 'REST:375', 'A4:250', 'A4:125', 'A4:125', 'B4:125',
      'C5:250', 'C5:125', 'REST:125', 'C5:125', 'D5:125', 'B4:250', 'B4:125', 'REST:125',
      'A4:125', 'G4:125', 'A4:375', 'REST:125', 'E4:125', 'G4:125', 'A4:250', 'A4:125',
      'REST:125', 'A4:125', 'B4:125', 'C5:250', 'C5:125', 'REST:125', 'C5:125', 'D5:125',
      'B4:250', 'B4:125', 'REST:125', 'A4:125', 'G4:125', 'A4:375', 'REST:125', 'E4:125',
      'G4:125', 'A4:250', 'A4:125', 'REST:125', 'A4:125', 'C5:125', 'D5:250', 'D5:125',
      'REST:125', 'D5:125', 'E5:125', 'F5:250', 'F5:125', 'REST:125', 'E5:125', 'D5:125',
      'E5:125', 'A4:250', 'REST:125', 'A4:125', 'B4:125', 'C5:250', 'C5:125', 'REST:125',
      'D5:250', 'E5:125', 'A4:250', 'REST:125', 'A4:125', 'C5:125', 'B4:250', 'B4:125',
      'REST:125', 'C5:125', 'A4:125', 'B4:375', 'REST:375',
    ],
  },
  {
    id: 'take-on-me',
    name: 'Take On Me',
    description: 'O mesmo trecho três vezes, com todas as notas do mesmo tamanho.',
    score: [
      'F#5:179', 'F#5:179', 'D5:179', 'B4:179', 'REST:179', 'B4:179', 'REST:179', 'E5:179',
      'REST:179', 'E5:179', 'REST:179', 'E5:179', 'G#5:179', 'G#5:179', 'A5:179', 'B5:179',
      'A5:179', 'A5:179', 'A5:179', 'E5:179', 'REST:179', 'D5:179', 'REST:179', 'F#5:179',
      'REST:179', 'F#5:179', 'REST:179', 'F#5:179', 'E5:179', 'E5:179', 'F#5:179', 'E5:179',
      'F#5:179', 'F#5:179', 'D5:179', 'B4:179', 'REST:179', 'B4:179', 'REST:179', 'E5:179',
      'REST:179', 'E5:179', 'REST:179', 'E5:179', 'G#5:179', 'G#5:179', 'A5:179', 'B5:179',
      'A5:179', 'A5:179', 'A5:179', 'E5:179', 'REST:179', 'D5:179', 'REST:179', 'F#5:179',
      'REST:179', 'F#5:179', 'REST:179', 'F#5:179', 'E5:179', 'E5:179', 'F#5:179', 'E5:179',
      'F#5:179', 'F#5:179', 'D5:179', 'B4:179', 'REST:179', 'B4:179', 'REST:179', 'E5:179',
      'REST:179', 'E5:179', 'REST:179', 'E5:179', 'G#5:179', 'G#5:179', 'A5:179', 'B5:179',
      'A5:179', 'A5:179', 'A5:179', 'E5:179', 'REST:179', 'D5:179', 'REST:179', 'F#5:179',
      'REST:179', 'F#5:179', 'REST:179', 'F#5:179', 'E5:179', 'E5:179', 'F#5:179', 'E5:179',
    ],
  },
  {
    id: 'nokia',
    name: 'Toque do Nokia',
    description: 'O toque clássico de celular. Curto e fácil de reconhecer.',
    score: [
      'E5:139', 'D5:139', 'F#4:278', 'G#4:278', 'C#5:139', 'B4:139', 'D4:278', 'E4:278',
      'B4:139', 'A4:139', 'C#4:278', 'E4:278', 'A4:556',
    ],
  },
  {
    id: 'pantera',
    name: 'Pantera Cor-de-Rosa',
    description: 'Melodia com muitas pausas e notas de durações variadas.',
    score: [
      'REST:833', 'REST:417', 'REST:208', 'D#4:208', 'E4:625', 'REST:208', 'F#4:208', 'G4:625',
      'REST:208', 'D#4:208', 'E4:312', 'F#4:208', 'G4:312', 'C5:208', 'B4:312', 'E4:208',
      'G4:312', 'B4:208', 'A#4:833', 'A4:157', 'G4:157', 'E4:157', 'D4:157', 'E4:833',
      'REST:417', 'REST:208', 'D#4:417', 'E4:625', 'REST:208', 'F#4:208', 'G4:625', 'REST:208',
      'D#4:208', 'E4:312', 'F#4:208', 'G4:312', 'C5:208', 'B4:312', 'G4:208', 'B4:312',
      'E5:208', 'D#5:1667', 'D5:833', 'REST:417', 'REST:208', 'D#4:208', 'E4:625', 'REST:208',
      'F#4:208', 'G4:625', 'REST:208', 'D#4:208', 'E4:312', 'F#4:208', 'G4:312', 'C5:208',
      'B4:312', 'E4:208', 'G4:312', 'B4:208', 'A#4:833', 'A4:157', 'G4:157', 'E4:157',
      'D4:157', 'E4:625', 'REST:417', 'REST:417', 'E5:312', 'D5:208', 'B4:312', 'A4:208',
      'G4:312', 'E4:312', 'A#4:104', 'A4:312', 'A#4:104', 'A4:312', 'A#4:104', 'A4:312',
      'A#4:104', 'A4:312', 'G4:157', 'E4:157', 'D4:157', 'E4:104', 'E4:104', 'E4:833',
    ],
  },
  {
    id: 'melodia-autoral',
    name: 'Melodia autoral',
    description: 'Melodia original, com frases que se repetem.',
    score: [
      'E5:160', 'G5:160', 'A5:160', 'G5:240', 'E5:160', 'D5:160', 'C5:320', 'REST:120',
      'D5:160', 'E5:160', 'G5:160', 'E5:240', 'C5:160', 'D5:160', 'E5:320', 'REST:120',
      'G5:160', 'A5:160', 'C6:160', 'A5:240', 'G5:160', 'E5:160', 'D5:320', 'REST:120',
      'C5:160', 'E5:160', 'G5:160', 'C6:240', 'B5:200', 'G5:200', 'A5:360', 'REST:120',
      'C6:160', 'B5:160', 'A5:160', 'G5:240', 'A5:160', 'G5:160', 'E5:320', 'REST:120',
      'C5:200', 'E5:200', 'G5:200', 'C6:260', 'C6:400', 'G5:200', 'C5:500', 'REST:200',
    ],
  },
];
