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

Única dependência extra: **`firebase`** (perfis na nuvem, ver seção 22),
carregada sob demanda. Não adicione bibliotecas de áudio, de estado ou de UI
sem necessidade real.

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
│   ├── PianoRoll.tsx    modo "Grade": segunda forma de editar o mesmo SongEvent[]
│   ├── PlaylistModal.tsx lista, ordem e nomes das músicas que vão juntas para o ESP32
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
│   ├── quantize.ts      "Ajustar tempos"
│   └── gridEdit.ts      operações do Piano Roll (criar/mover/redimensionar/apagar na grade)
│
├── data/                dados e persistência
│   ├── examples.ts      melodias prontas
│   ├── songLists.ts     operações PURAS nas listas de músicas (valem local e nuvem)
│   ├── customSongs.ts   "Meus exemplos" no localStorage (SongRepository)
│   ├── playlist.ts      a playlist no localStorage (a ORDEM importa)
│   ├── cloudSync.ts     perfis no Firebase, SÓ em buzzerlab_perfis/<nome>
│   ├── storage.ts       localStorage com prefixo buzzerlab.
│   ├── settings.ts      preferências
│   ├── helpTexts.ts     textos didáticos
│   ├── buildIno.ts      montagem do sketch .ino de UMA música
│   └── buildPlaylistIno.ts  sketch .ino da playlist (OLED + botão, ESP32-C3)
│
├── export/
│   ├── codeGenerator.ts SongEvent[] → vetores C++
│   └── importParser.ts  código colado → SongEvent[] (sem eval)
│
├── state/
│   ├── useHistory.ts    undo/redo genérico por snapshots
│   ├── useSong.ts       estado central da música
│   └── useLibrary.ts    músicas salvas + playlist + perfil (local ou nuvem)
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

A regra original era usar só melodias de domínio público ou sequências
didáticas. **O dono do projeto decidiu incluir também melodias conhecidas de
jogos, filmes e toques de celular** (Mario, Megalovania, Tetris, Nokia...),
convertidas das tabelas de frequência dele; mantenha as próximas na mesma linha
só se ele pedir. Ao converter frequências em notas, confira que
`round(frequência da nota)` volta ao número original (a exportação é
inteira): a Megalovania tem um `261 Hz` que sai `262`, diferença de 1 Hz.

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
| `buzzerlab.playlist`     | playlist (`StoredSong[]` em ordem) |
| `buzzerlab.profileName`  | nome do perfil (vazio = sem perfil) |

O salvamento é automático; atualizar a página não pode apagar a música.
`sanitizeEvents()` valida o que vem do storage — JSON corrompido é descartado,
não derruba o app.

"Meus exemplos" e a playlist ficam no localStorage **só quando não há perfil**
(`SongRepository` / `PlaylistRepository` só sabem `list()` e `replaceAll()`).
Com perfil, vão para a nuvem — ver seção 22.

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

## 20. Piano Roll ("Grade")

Segunda forma de editar a **mesma** música da Timeline. `App.tsx` guarda
`editMode: 'blocks' | 'grid'` (não persistido; sempre abre em "Blocos") e um
botão "Blocos / Grade" alterna qual componente aparece — `Timeline` ou
`PianoRoll` — os dois lendo e escrevendo o mesmíssimo `song` (`useSong`).
**Não existe uma segunda fonte de verdade**: o Piano Roll não guarda cópia
nenhuma da música, só descreve qual operação de `music/gridEdit.ts` deve
rodar em cima do `SongEvent[]` recebido por prop.

### O problema: posição livre sobre um modelo sem posição

`SongEvent[]` é **sequencial**: cada evento começa exatamente onde o anterior
termina (ver `songUtils.startTimes`). Não existe `x`/tempo absoluto guardado
em lugar nenhum — e isso continua valendo depois desta feature, porque a
Timeline, a exportação e a importação já confiam nesse formato. Mas o Piano
Roll precisa parecer uma grade onde o aluno arrasta notas livremente pelo
tempo. `music/gridEdit.ts` resolve isso convertendo cada gesto em uma
reescrita do array sequencial:

- **Criar** (`insertNoteAt`): acha em que evento um instante em ms cai
  (`locate`); se for um silêncio, divide esse silêncio em até três pedaços
  (sobra-antes / nota nova / sobra-depois); se cair em cima de uma nota,
  devolve o array sem alteração (o chamador reconhece isso comparando a
  referência do array de volta com `===` e não faz nada).
- **Mover** (`moveNote`): primeiro **libera** o espaço antigo da nota (vira
  silêncio e se funde com os vizinhos, `removeAsRest` +
  `mergeAdjacentRests`), depois **insere de novo** a mesma nota (mesmo `id`,
  para a seleção não se perder no meio do arrasto) no novo instante, dividindo
  o silêncio que estiver lá. Se o destino estiver ocupado ou não couber nem o
  mínimo (`MIN_GRID_DURATION`), a inserção falha e a função devolve a música
  **original** sem a liberação: o arrasto é cancelado, a nota volta pro
  lugar.
- **Redimensionar** (`resizeNote`): muda só a duração da própria nota,
  comendo (ou devolvendo) tempo do silêncio que vem logo depois dela. Nunca
  ultrapassa a duração desse silêncio — ou seja, nunca alcança a próxima
  nota. **É isso que garante o buzzer monofônico sem nenhuma verificação de
  sobreposição à parte**: mover e redimensionar simplesmente não têm como
  produzir uma sobreposição, dado como são escritos.

Como não existe posição absoluta, "arrastar livremente" é sempre, por baixo
dos panos, uma sequência de "vira silêncio aqui" + "encaixa ali" — a ilusão
de grade livre é só a soma dessas duas operações sobre a lista sequencial.

### Apagar: dois comportamentos

- **"🗑 Apagar (vira silêncio)"** — `removeAsRest`: troca a nota por um
  silêncio do mesmo tamanho no mesmo lugar; o resto da música não se move.
  É o padrão, porque é o que um piano roll normalmente faz.
- **"⇤ Apagar e puxar o resto"** — reaproveita `song.deleteById`
  (`songUtils.removeEvent`), a mesma remoção "de verdade" que a Timeline já
  usa: some com o evento e desloca tudo que vem depois para mais cedo.
  Também acessível por **duplo clique** na nota, para ser rápido sem exigir
  precisão em cima do botão.

### Arrasto sem poluir o desfazer

Durante o arrasto (mover ou redimensionar), o Piano Roll mantém uma cópia de
trabalho num `useRef` (`draftRef`) e só chama `onCommit` (que vira um ponto
no histórico de desfazer) no `pointerup`. Cada `pointermove` só atualiza o
ref e força um re-render local (`forceRender`) para o retângulo acompanhar o
ponteiro — nenhum commit no meio do caminho, senão um arrasto de meio
segundo geraria dezenas de passos de desfazer.

### Piano vertical e o eixo do tempo

As linhas da grade são `PIANO_NOTES` (mesma faixa C3–C6 do piano horizontal)
**invertidas**, para o grave ficar embaixo e o agudo em cima, como a maioria
das ferramentas de piano roll. O eixo horizontal é `tempo em ms × PX_PER_MS`
(pixels por milissegundo); o "Encaixe" reaproveita os mesmos
`QUANTIZE_STEPS` de `songTypes.ts`. Não há campo de "duração total da
música": a duração continua sendo simplesmente a soma dos eventos, calculada
onde já era (`songUtils.totalDuration`), a mesma conta que a Timeline e o
`CodePanel` usam.

## 21. Playlist e sketch do ESP32-C3 (OLED + botão)

O aluno monta uma **playlist** e exporta **um único `.ino`** com todas as
músicas, um menu no OLED e navegação por um botão só.

### Fluxo e estado

- "＋ Playlist" (ao lado do nome da música, em cada item de "Exemplos" e no
  rodapé do `PlaylistModal`) guarda uma **cópia** da música. Se já existe uma
  com o mesmo nome (sem diferenciar maiúsculas), ela é **atualizada no mesmo
  lugar**, não duplicada — assim "editar e adicionar de novo" funciona.
- A playlist vive em `data/playlist.ts` (`PlaylistRepository`; como em
  `customSongs.ts`, nuvem seria uma nova implementação da interface).
  **Diferente de "Meus exemplos", a ordem é a do array** (vira a ordem do menu);
  nunca ordene por data. `sanitize()` passa os eventos por `sanitizeEvents()` e
  descarta músicas vazias.
- `PlaylistModal` renomeia com **rascunho local** gravado ao sair do campo: se
  gravasse a cada letra, `cleanName` cortaria o espaço final e não daria para
  digitar "Harry P".
- `ExportModal` tem a alternância "Música atual / Playlist (N)".
  `App.tsx` guarda `exportMode`: "Ver código completo" abre em `song`,
  "Exportar playlist" abre em `playlist`.
- Novas preferências em `settings.ts`, com a ligação real do aluno como
  padrão: buzzer **7** (`DEFAULT_BUZZER_PIN`), `buttonPin` **10**, `oledSda`
  **5**, `oledScl` **6**, `oledHeight` (64 ou 32). (O I2C padrão do ESP32-C3
  SuperMini seria 8/9, mas não é o que o aluno usa.) Como as preferências ficam
  no `localStorage`, `loadSettings()` migra quem ainda estava com os pinos
  antigos (5/4/8/9, ou ausentes) para os novos; quem escolheu qualquer outro
  pino mantém a escolha. `findPinConflicts()` avisa quando dois itens usam o
  mesmo pino.

### Geração do código (`export/codeGenerator.ts` + `data/buildPlaylistIno.ts`)

`generatePlaylist()` devolve os vetores `xN`/`xT` de cada música e a tabela
`const Musica MUSICAS[] = { { "Nome", xN, xT, (int)TAM(xN) }, ... };` com as
colunas alinhadas. Regras:

- identificadores únicos: "Café" e "Cafe" dariam o mesmo `cafeN`; o repetido
  vira `cafe2N` (senão o sketch não compila);
- `toOledText()` tira acentos e caracteres não-ASCII (a fonte padrão da
  Adafruit_GFX só tem ASCII) e troca `"` e `\` (quebrariam a string C++); o
  nome é cortado em `PLAYLIST_NAME_MAX` (20 = cabe em 1 linha do OLED). O
  `PlaylistModal` mostra "no OLED: ..." quando o nome muda.

### O sketch gerado (decisões que NÃO devem ser "limpas" sem ler)

- **Sem `delay()`**: máquina de estados com `millis()`, senão o botão não
  responderia enquanto a música toca. `inicioPasso += duracao` (e não `=
  millis()`) para não acumular atraso, e o `while` de avanço de passo recupera
  o tempo se o loop atrasar (desenhar no OLED leva alguns ms).
- **Som pelo LEDC** (`ledcWriteTone`), com `#if ESP_ARDUINO_VERSION_MAJOR >= 3`
  escolhendo a API do core 3 (`ledcAttach(pino…)`) ou a do core 2
  (`ledcSetup` + `ledcAttachPin`), porque `tone()` não existe em todo core
  ESP32. Os últimos 8 ms de cada nota ficam em silêncio (`SEPARACAO_NOTAS`)
  para notas iguais seguidas não virarem uma só, como o player do app faz.
- **Um botão, pino com `INPUT_PULLUP`** (outro lado no GND, sem resistor):
  1 clique = próxima, 2 cliques = anterior, segurar (600 ms) = tocar; tocando,
  qualquer toque para. Com `aceitaDuplo = false` (enquanto toca) o clique sai
  na hora, sem esperar a janela do clique duplo.
- **Nenhuma assinatura de função usa `enum`/`struct` do sketch** (`lerBotao`
  devolve `int`): o Arduino IDE gera os prototypes ANTES dos tipos do sketch e
  isso não compilaria.
- `Wire.begin(sda, scl)` antes de `display.begin()` (a Adafruit chama
  `Wire.begin()` de novo e o ESP32 reaproveita os pinos). Se o OLED não for
  encontrado, `oledOk = false` e o som e o botão continuam funcionando.
- **Tela deliberadamente enxuta** (o aluno pediu menos poluição visual): parado
  mostra só "1/3" no canto, o **nome grande** no meio e a dica fixa "segure:
  tocar"; tocando troca a dica pela barra de progresso e acende um triângulo de
  "play" no canto. Sem textos de estado, sem relógio, sem dicas rotativas. Não
  reintroduza esses elementos sem pedido.
- O OLED só é redesenhado quando algo muda (parado: só ao trocar de música ou
  estado; tocando: só quando a barra anda) e no máximo a cada 250 ms tocando:
  `display.display()` bloqueia no I2C e atrasaria as notas.
- Comentários do sketch **sem acentos** (como em `buildIno.ts`).

### Como foi testado

Sem hardware, o sketch gerado foi **compilado com `g++ -Wall -Wextra`** contra
stubs de `Arduino.h`/`Wire.h`/`Adafruit_SSD1306.h`, nos dois cores (2 e 3) e
nas duas alturas (64 e 32), e executado com tempo e botão simulados: clique,
clique duplo, segurar, trepidação, parar tocando, tempo de cada nota (±3 ms),
fim da música, textos dentro da tela e OLED ausente. **Não** foi testado em
placa real nem com as bibliotecas Adafruit de verdade.

## 22. Perfis na nuvem (nome = gaveta)

Igual ao OLED Lab: o aluno digita o nome em "Seu nome..." (cabeçalho) e passa
a ver as **mesmas músicas salvas e a mesma playlist em qualquer computador**.
O nome é a chave de acesso; **não há senha** (quem digitar o mesmo nome vê e
altera os mesmos dados).

### ISOLAMENTO NO FIREBASE (regra de ouro)

O projeto Firebase (`educarino-45cc8`) é **compartilhado** com outras
aplicações do dono (bloco de notas em `documentos/`, OLED Lab em
`oledlab_exemplos/`), cada uma no seu caminho. O Buzzer Lab usa **apenas
`buzzerlab_perfis/<nome>`**:

- todo acesso passa por `pathFor()` em `data/cloudSync.ts`; **não crie outro
  caminho** nem leia/escreva em nó mais alto que um perfil;
- `pathFor()` **recusa nome vazio**: a chave vazia apontaria para
  `buzzerlab_perfis/` inteiro e um `set()` apagaria todos os perfis;
- `sanitizeProfileName()` tira `. # $ [ ] /` e caracteres de controle, para o
  nome nunca escapar do prefixo;
- as credenciais são chaves de **cliente** (não são segredo).

**As regras do banco precisam liberar o caminho.** Sem isso o app mostra
"❌ Erro ao sincronizar" (tooltip: `permission_denied`), mantém tudo local e não
perde nada. Regra sugerida, **acrescentada ao lado das existentes** (não
substitua as regras inteiras): liberar `buzzerlab_perfis/$perfil` com
`.read`/`.write`. Usar `$perfil` (e não `.read` no `buzzerlab_perfis`) impede
listar todos os perfis: só acessa quem sabe o nome.

### Como funciona (`state/useLibrary.ts`)

- O que vai para o perfil: **"Meus exemplos"** (`exemplos`) e a **playlist**
  (`playlist`). A música em edição NÃO vai (continua no `buzzerlab.song`).
- **Sem nome:** listas no localStorage, como sempre.
  **Com nome:** listas na nuvem; o localStorage genérico **não é tocado** (por
  isso o backup de quem usa sem nome nunca é sobrescrito pela lista de um
  perfil). Só ações do usuário SEM perfil gravam o backup local.
- **Nome novo** (nada salvo) começa **vazio**: não herda a lista local, senão
  puxaria músicas de outra pessoa. As músicas locais continuam intactas e
  voltam ao apagar o nome.
- Nome com dados substitui as listas pelo que está na nuvem, em **tempo real**
  (`onValue`). O nome é confirmado após 600 ms sem digitar.
- **Só envia depois da primeira leitura** (`cloudReadyRef`): o Firebase apaga o
  nó ao receber listas vazias; gravar o estado vazio inicial apagaria o que
  estava salvo.
- Envio com pausa de 600 ms; `lastSyncedRef` (comparando JSON) evita o loop de
  eco (gravar → o próprio listener reage → regravar). O JSON depende da **ordem
  fixa das chaves** montada em `sanitizeStoredSongs()` e `songLists.ts`; não
  reordene.
- Os dados que chegam da nuvem passam por `sanitizeStoredSongs()` (aceita
  array ou objeto de chaves numéricas, que é como o Firebase devolve listas).
- Duas pessoas editando o mesmo nome ao mesmo tempo: vale o último que salvar.
- O SDK é carregado por `import()` dinâmico: quem não usa perfil não baixa o
  Firebase.
- Os handlers de `App.tsx` só chamam o `useLibrary` e mostram avisos. As
  operações em si (`addCustomSong`, `addToPlaylist`, `moveSong`...) são funções
  puras em `data/songLists.ts`, as mesmas para o modo local e o da nuvem.

## 23. Prioridades

1. funcionamento correto + simplicidade + fidelidade ao buzzer;
2. experiência de edição;
3. recursos adicionais e acabamento visual.

---

**Mantenha este arquivo atualizado sempre que houver mudança arquitetural
relevante.**
