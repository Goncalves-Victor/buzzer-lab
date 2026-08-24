/* ==========================================================================
   helpTexts.ts
   Explicacoes curtas mostradas em tooltips e no painel de ajuda.

   Ficam centralizadas para o mesmo termo ter sempre a mesma explicacao, e
   para a interface nao virar um muro de texto permanente.
   ========================================================================== */

export interface HelpTerm {
  term: string;
  text: string;
}

export const HELP_TERMS: Record<string, HelpTerm> = {
  frequencia: {
    term: 'Frequência',
    text: 'Diz o quão grave ou agudo será o som. Quanto maior o número, mais agudo.',
  },
  hz: {
    term: 'Hz',
    text: 'Hertz indica quantas vezes o som vibra por segundo.',
  },
  duracao: {
    term: 'Duração',
    text: 'Mostra por quanto tempo a nota será tocada.',
  },
  ms: {
    term: 'ms',
    text: '1000 milissegundos equivalem a 1 segundo.',
  },
  pausa: {
    term: 'Pausa',
    text: 'Uma frequência igual a 0 significa silêncio.',
  },
  bpm: {
    term: 'BPM',
    text: 'Batidas por minuto. Serve como guia de velocidade; a música continua sendo salva em milissegundos.',
  },
  quantizacao: {
    term: 'Ajustar tempos',
    text: 'Arredonda as durações gravadas para valores redondos, como 125 ms ou 250 ms.',
  },
  buzzer: {
    term: 'Buzzer passivo',
    text: 'Um buzzer passivo precisa receber a frequência do som. Por isso usamos tone() com o valor em Hz.',
  },
  monofonico: {
    term: 'Monofônico',
    text: 'O buzzer toca uma nota por vez. Não existem acordes.',
  },
  metronomo: {
    term: 'Metrônomo',
    text: 'Cliques no ritmo do BPM para ajudar a gravar no tempo. Ele nunca entra na música.',
  },
};

export const HELP_SECTIONS: { title: string; items: HelpTerm[] }[] = [
  {
    title: 'Sobre o som',
    items: [
      HELP_TERMS.frequencia,
      HELP_TERMS.hz,
      HELP_TERMS.buzzer,
      HELP_TERMS.monofonico,
    ],
  },
  {
    title: 'Sobre o tempo',
    items: [HELP_TERMS.duracao, HELP_TERMS.ms, HELP_TERMS.pausa, HELP_TERMS.bpm],
  },
  {
    title: 'Ferramentas',
    items: [HELP_TERMS.quantizacao, HELP_TERMS.metronomo],
  },
];

/** Passo a passo mostrado na ajuda, na mesma ordem do fluxo da ferramenta. */
export const HELP_STEPS: { title: string; text: string }[] = [
  {
    title: '1. Toque o piano',
    text: 'Use o mouse, o dedo ou as teclas A, S, D, F, G, H, J do seu teclado. O som é parecido com o do buzzer de verdade.',
  },
  {
    title: '2. Grave',
    text: 'Clique em Gravar e toque a melodia. O tempo de cada nota é medido sozinho.',
  },
  {
    title: '3. Ajeite na linha do tempo',
    text: 'Cada bloco é uma nota ou uma pausa. Selecione um bloco para mudar a nota, a frequência ou a duração.',
  },
  {
    title: '4. Ouça de novo',
    text: 'Use Tocar para conferir. Se algo ficar torto, use Ajustar tempos ou Desfazer.',
  },
  {
    title: '5. Leve para o robô',
    text: 'Copie os dois vetores ou baixe o arquivo .ino e abra no Arduino IDE.',
  },
];
