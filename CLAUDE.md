# CLAUDE.md — Buzzer Lab

Documento de referência do projeto. **Leia antes de alterar qualquer coisa.**

---

## 1. Objetivo

O Buzzer Lab permite que um aluno **crie, teste e edite músicas para um buzzer
passivo direto no navegador** e, quando terminar, gere o código para
Arduino/ESP32.

A frase que resume a ferramenta:

> "Eu faço a música aqui, escuto como ficaria no buzzer e depois pego o código
> para colocar no meu robô."

É o mesmo espírito do **OLED Lab**: experimentar um componente eletrônico
virtualmente antes de ter o hardware.

## 2. Público-alvo

Alunos iniciantes de robótica, inclusive crianças.

Consequências práticas:

- **toda a interface é em português**, incluindo erros e avisos;
- nada de jargão desnecessário; explicações curtas em tooltips;
- toda operação de arrastar tem também um **botão equivalente** (touchscreen);
- visual moderno e limpo — educacional, mas parecendo uma ferramenta real,
  não um brinquedo.

## 3. O que o Buzzer Lab **não** é

Não é uma DAW. Nunca implemente múltiplas tracks, acordes, instrumentos,
efeitos, equalização, mixer, samples, plugins ou automação de parâmetros.

O modelo mental precisa continuar sendo:

```
NOTA → FREQUÊNCIA → DURAÇÃO → BUZZER
```

Se um recurso avançado tornar a interface mais confusa para um iniciante,
prefira a solução mais simples.

## 4. Stack

- React 18
- TypeScript **estrito**
- Vite
- CSS puro (sem framework)
- Web Audio API

Sem dependências além de React/Vite/TypeScript. Não adicione bibliotecas de
áudio, de estado ou de UI sem necessidade real.

## 5. Comandos

```bash
npm install
npm run dev        # servidor de desenvolvimento (host: true, abre no celular)
npm run build      # tsc && vite build
npm run preview
npx tsc --noEmit   # obrigatório antes de considerar qualquer tarefa concluída
```

**Regra fixa: rode `npx tsc --noEmit` e corrija todos os erros antes de
finalizar qualquer alteração.** O `npm run build` também precisa passar.

## 6. Arquitetura

```
src/
├── components/          interface (React), sem regra de negócio
│   ├── Piano.tsx
│   ├── TransportControls.tsx
│   ├── Timeline.tsx
│   ├── TimelineEvent.tsx
│   ├── NoteEditor.tsx
│   ├── CodePanel.tsx
│   ├── ImportModal.tsx
│   ├── ExportModal.tsx
│   ├── SettingsModal.tsx
│   ├── QuantizeModal.tsx
│   ├── ExamplePanel.tsx
│   ├── HelpPanel.tsx
│   ├── Modal.tsx        janela base (Esc, clique no fundo, trava scroll)
│   └── InfoTip.tsx      tooltip didático "?"
│
├── audio/               tudo que fala com a Web Audio API
│   ├── audioEngine.ts
│   ├── player.ts
│   └── metronome.ts
│
├── music/               regras musicais puras (sem React, sem DOM)
│   ├── notes.ts         tabela central de notas
│   ├── songTypes.ts     SongEvent e constantes
│   ├── songUtils.ts     operações puras sobre SongEvent[]
│   ├── recorder.ts      note-on/note-off → SongEvent[]
│   └── quantize.ts      "Ajustar tempos"
│
├── data/                dados e persistência
│   ├── examples.ts      melodias prontas
│   ├── customSongs.ts   "Meus exemplos" (SongRepository)
│   ├── storage.ts       localStorage com prefixo buzzerlab.
│   ├── settings.ts      preferências
│   ├── helpTexts.ts     textos didáticos
│   └── buildIno.ts      montagem do sketch .ino completo
│
├── export/
│   ├── codeGenerator.ts SongEvent[] → vetores C++
│   └── importParser.ts  código colado → SongEvent[] (sem eval)
│
├── state/
│   ├── useHistory.ts    undo/redo genérico por snapshots
│   └── useSong.ts       estado central da música
│
├── App.tsx              apenas coordenação
├── main.tsx
└── styles/global.css
```

**Regra de separação:** a lógica do simulador (áudio, música, exportação)
nunca mora dentro de componentes React. `App.tsx` só liga as peças.

## 7. Fluxo da aplicação

```
Piano → Recorder → SongEvent[] → Timeline → Player → AudioEngine

SongEvent[] → CodeGenerator → vetNotas[] + vetDuracao[] → buildIno → arquivo .ino
```

## 8. Formato de `SongEvent`

```ts
export interface SongEvent {
  id: string;              // key do React e alvo da seleção
  note: string;            // 'D4' ou 'REST'
  frequency: number;       // Hz, com decimais; 0 = silêncio
  duration: number;        // ms
  type: 'note' | 'rest';
}
```

**Os vetores C++ NÃO são a fonte de verdade.** Eles são uma representação de
exportação. A música vive como `SongEvent[]` para continuar editável.

Exemplo de exportação:

```cpp
const int megaN[] = { 294, 294, 587, 440 };
const int megaT[] = { 125, 125, 250, 375 };
```

`megaN[0] = 294` e `megaT[0] = 125` significa "tocar 294 Hz durante 125 ms".
Frequência `0` é silêncio.

Invariantes obrigatórias na exportação:

- os dois vetores têm **exatamente** o mesmo número de elementos;
- todas as frequências exportadas são **inteiras** (293.66 → 294);
- todas as durações exportadas são **inteiras** e maiores que zero.

## 9. Estado principal

`state/useSong.ts` é a única fonte de verdade. Timeline, editor, player e
gerador de código consomem o mesmo array. **Nunca crie uma cópia paralela da
música dentro de um componente.**

`state/useHistory.ts` guarda snapshots (limite: 80 entradas).

- `commit()` altera criando ponto no histórico;
- `replace()` altera sem criar ponto (hidratação do localStorage);
- `reset()` recomeça e limpa o histórico ("Nova música").

## 10. AudioEngine

`audio/audioEngine.ts` concentra 100% do contato com a Web Audio API.

- **Onda quadrada** (`oscillator.type = 'square'`) — imita buzzer passivo, não
  piano. Nunca use samples.
- **Monofônico**: uma única voz ao vivo. Trocar de nota é só mudar a frequência
  do mesmo oscilador. O oscilador fica ligado com ganho 0 quando não há nota —
  ligar/desligar a cada tecla causaria estalo e atraso.
- **Rampas curtas de ganho** (attack 4 ms, release 6 ms) evitam cliques.
- `unlock()` cria/retoma o `AudioContext` e **precisa ser chamado dentro de um
  gesto do usuário** (clique, toque, tecla).
- `scheduleSong()` agenda a música inteira no relógio do `AudioContext`.
- `scheduleClick()` é usado pelo metrônomo (fica aqui para toda criação de nós
  de áudio estar em um lugar só).

## 11. Player

`audio/player.ts` cuida de tocar / pausar / parar / voltar ao início.

- **O áudio é a fonte de tempo.** A sequência é agendada de uma vez no relógio
  do `AudioContext`; não existe cadeia de `setTimeout` tocando notas.
- `requestAnimationFrame` é usado **apenas** para atualizar o destaque visual,
  lendo esse mesmo relógio.
- Pausar volta a posição para o **início do evento atual** — previsível para um
  aluno e evita retomar no meio de uma nota.

## 12. Recorder

`music/recorder.ts` não conhece React nem áudio: recebe instantes em ms.

- `noteOn` / `noteOff` calculam a duração automaticamente;
- monofônico: uma nota nova fecha a anterior no mesmo instante;
- silêncio entre notas vira `rest` quando passa de `minRestMs`;
- toques abaixo de `minNoteMs` são descartados (esbarrão no teclado).

O metrônomo **nunca** entra na gravação.

## 13. Como adicionar notas

Edite **apenas** `music/notes.ts`. As frequências são calculadas em
temperamento igual a partir de A4 = 440 Hz, arredondadas para 2 casas.

`ALL_NOTES` cobre C1–C8; `PIANO_NOTES` é a faixa visível (C3–C6, constantes
`PIANO_FIRST_MIDI` / `PIANO_LAST_MIDI`).

**Nunca escreva uma frequência solta dentro de um componente.** Piano, editor,
reprodução, importação e exportação usam essa mesma tabela.

## 14. Como adicionar exemplos

Acrescente um item em `EXAMPLES`, em `data/examples.ts`:

```ts
{
  id: 'meu-exemplo',
  name: 'Nome visível',
  description: 'O que o exemplo ensina.',
  score: ['C4:250', 'REST:125', 'G4:500'],
}
```

A notação compacta (`NOTA:duração_ms`, `REST:duração_ms`) existe só para o
arquivo ficar legível; `scoreToEvents()` converte em `SongEvent[]` normal.

Use apenas melodias de domínio público ou sequências didáticas.

## 15. Importação e exportação

**Exportação** (`export/codeGenerator.ts` + `data/buildIno.ts`):
`toIdentifier()` gera um identificador C++ válido a partir do nome digitado —
remove acentos, espaços e caracteres inválidos:

```
'Mega Man Theme' → megaManThemeN / megaManThemeT
```

**Importação** (`export/importParser.ts`):

1. remove comentários `//` e `/* */`;
2. localiza as declarações de vetor por expressão regular;
3. converte e valida cada número;
4. confere se os tamanhos batem;
5. converte frequências conhecidas em nomes de notas (294 → D4);
6. transforma frequência `0` em pausa.

**Nunca use `eval()`** para interpretar o texto do usuário.

Os erros são escritos para um aluno entender, por exemplo:

```
Não foi possível importar a música.

O vetor de notas possui 12 valores, mas o vetor de durações possui 11.

Cada nota precisa ter uma duração correspondente.
```

## 16. localStorage

**Use exclusivamente o prefixo `buzzerlab.`** — nunca `oledlab.*`, porque os
dois projetos podem coexistir no mesmo domínio.

| Chave                    | Conteúdo                     |
| ------------------------ | ---------------------------- |
| `buzzerlab.song`         | `SongEvent[]` atual          |
| `buzzerlab.songName`     | nome da música               |
| `buzzerlab.settings`     | preferências                 |
| `buzzerlab.customSongs`  | "Meus exemplos"              |

O salvamento é automático; atualizar a página não pode apagar a música.
`sanitizeEvents()` valida o que vem do storage — JSON corrompido é descartado,
não derruba o app.

"Meus exemplos" passa por `SongRepository` (`data/customSongs.ts`).
**Sincronização na nuvem deve ser uma nova implementação dessa interface**, sem
reescrever o editor. Não use Firebase sem pedido explícito.

## 17. Cuidados obrigatórios com áudio e eventos

Ao mexer no piano, no player ou no engine, garanta que:

- `keydown` repetido não cria várias notas (`event.repeat`);
- perder o foco da janela interrompe notas presas (`blur`);
- `pointerup` fora da tecla não deixa nota tocando (listener no `window`);
- Stop interrompe todos os osciladores;
- Pause funciona e retoma corretamente;
- trocar de nota rapidamente funciona (monofonia);
- gravação e reprodução nunca acontecem ao mesmo tempo;
- o metrônomo não é gravado;
- pausas mantêm a duração correta;
- não sobram timers depois do Stop;
- componentes desmontados removem seus listeners;
- o `AudioContext` só é criado/retomado após interação do usuário;
- se o toque terminar antes de o `unlock()` resolver, a nota não fica presa
  (ver `pendingNoteRef` em `App.tsx`).

## 18. Convenções

- nomes técnicos de código podem ser em inglês quando fizer sentido;
- **comentários e documentação em português**;
- comentários explicam o **porquê**, não repetem o código;
- toda mensagem para o usuário é em português e amigável;
- responsabilidades separadas; nada de arquivos monolíticos;
- não coloque a aplicação inteira em `App.tsx`;
- não monte strings grandes de Arduino dentro de componentes React
  (isso é papel de `data/buildIno.ts`).

## 19. Teste manual do fluxo completo

Antes de considerar uma versão pronta:

```
Abrir → tocar piano → ouvir → gravar → tocar melodia → parar gravação →
ver notas na timeline → reproduzir → editar uma nota → adicionar pausa →
reproduzir de novo → gerar vetores → copiar código → exportar .ino →
copiar os vetores → limpar música → importar os mesmos vetores →
confirmar que a música reconstruída é equivalente
```

Depois:

```bash
npx tsc --noEmit
npm run build
```

## 20. Prioridades

1. funcionamento correto + simplicidade + fidelidade ao buzzer;
2. experiência de edição;
3. recursos adicionais e acabamento visual.

---

**Mantenha este arquivo atualizado sempre que houver mudança arquitetural
relevante.**
