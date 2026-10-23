/* ==========================================================================
   buildPlaylistIno.ts
   Monta o .ino da PLAYLIST: varias musicas + menu no OLED + botao unico.

   Fica separado de buildIno.ts (musica unica) porque o sketch e bem maior e
   tem outra logica: em vez de delay(), usa uma maquina de estados com
   millis(), senao o botao nao responderia enquanto a musica toca.

   Regra do projeto: nenhum componente React monta strings grandes de Arduino.

   Cuidados com o codigo gerado (nao "limpar" sem ler):
   - sem acentos nem emojis: o Arduino IDE antigo nao e confiavel com UTF-8;
   - nenhuma funcao usa enum/struct do sketch em assinatura: o Arduino IDE
     gera os prototypes ANTES dos tipos do sketch e isso nao compilaria
     (por isso a leitura do botao devolve int, e nao um enum);
   - Wire.begin(sda, scl) vem antes de display.begin(): a biblioteca da
     Adafruit chama Wire.begin() de novo e o ESP32 reaproveita os pinos.
   ========================================================================== */

import type { StoredSong } from '../music/songTypes';
import { generatePlaylist } from '../export/codeGenerator';
import { formatSeconds } from '../music/songUtils';
import { PLAYLIST_NAME_MAX } from './playlist';

export interface PlaylistInoOptions {
  buzzerPin: number;
  buttonPin: number;
  oledSda: number;
  oledScl: number;
  oledHeight: 32 | 64;
}

export function playlistInoFileName(): string {
  return 'playlist_buzzer.ino';
}

/** Pinos usados duas vezes no mesmo sketch (nao funcionaria). Vazio = tudo certo. */
export function findPinConflicts(options: PlaylistInoOptions): string[] {
  const used: { label: string; pin: number }[] = [
    { label: 'buzzer', pin: options.buzzerPin },
    { label: 'botão', pin: options.buttonPin },
    { label: 'SDA do OLED', pin: options.oledSda },
    { label: 'SCL do OLED', pin: options.oledScl },
  ];
  const conflicts: string[] = [];
  for (let i = 0; i < used.length; i++) {
    for (let j = i + 1; j < used.length; j++) {
      if (used[i].pin === used[j].pin) {
        conflicts.push(`${used[i].label} e ${used[j].label} estão no pino ${used[i].pin}`);
      }
    }
  }
  return conflicts;
}

export function buildPlaylistIno(songs: StoredSong[], options: PlaylistInoOptions): string {
  const { buzzerPin, buttonPin, oledSda, oledScl, oledHeight } = options;
  const playlist = generatePlaylist(songs, PLAYLIST_NAME_MAX);
  const count = playlist.entries.length;

  return `/*
  Playlist do Buzzer Lab
  Gerado pelo Buzzer Lab.

  ${count} ${count === 1 ? 'musica' : 'musicas'}. Duracao total: ${formatSeconds(playlist.totalMs)}.

  Placa: ESP32-C3 (ex.: ESP32-C3 SuperMini / Mini).

  Ligacoes:
  - Buzzer passivo: um fio no pino ${buzzerPin} e o outro no GND.
  - Botao: um lado no pino ${buttonPin} e o outro no GND (nao precisa de resistor).
  - OLED I2C: SDA no pino ${oledSda}, SCL no pino ${oledScl}, VCC no 3V3 e GND no GND.

  Como usar o botao:
  - 1 clique ........... proxima musica
  - 2 cliques rapidos .. musica anterior
  - segurar ............ tocar a musica que esta na tela
  - tocando: um clique para a musica

  Bibliotecas (Ferramentas > Gerenciar Bibliotecas):
  - Adafruit GFX Library
  - Adafruit SSD1306
*/

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------- Pinos e tela ----------
const int PINO_BUZZER = ${buzzerPin};
const int PINO_BOTAO = ${buttonPin};
const int PINO_SDA = ${oledSda};
const int PINO_SCL = ${oledScl};

#define LARGURA_TELA 128
#define ALTURA_TELA ${oledHeight}
#define ENDERECO_OLED 0x3C

Adafruit_SSD1306 display(LARGURA_TELA, ALTURA_TELA, &Wire, -1);

// ---------- Musicas ----------
// Cada musica tem dois vetores: frequencia (Hz, 0 = silencio) e duracao (ms).

${playlist.arraysCode}

struct Musica {
  const char* nome;
  const int* notas;
  const int* tempos;
  int tam;
};

#define TAM(v) (sizeof(v) / sizeof((v)[0]))

// A ordem desta lista e a ordem do menu no OLED.
${playlist.tableCode}

const int NUM_MUSICAS = sizeof(MUSICAS) / sizeof(MUSICAS[0]);

// ---------- Ajustes ----------
const unsigned long TEMPO_ANTITREPIDACAO = 30;   // ignora o "tremido" do botao (ms)
const unsigned long TEMPO_SEGURAR = 600;         // quanto tempo segurar para tocar (ms)
const unsigned long TEMPO_CLIQUE_DUPLO = 350;    // janela entre os dois cliques (ms)
const unsigned long SEPARACAO_NOTAS = 8;         // silencio no fim da nota, para notas iguais nao grudarem (ms)
const bool TOCAR_PROXIMA_SOZINHA = false;        // true = ao acabar, ja toca a proxima musica

// O que lerBotao() devolve.
const int ACAO_NENHUMA = 0;
const int ACAO_CLIQUE = 1;
const int ACAO_CLIQUE_DUPLO = 2;
const int ACAO_SEGURAR = 3;

// ---------- Estado ----------
int musicaAtual = 0;
bool tocando = false;
int passo = 0;                    // qual nota da musica esta tocando
unsigned long inicioPasso = 0;    // quando essa nota deveria ter comecado
unsigned long tempoPassado = 0;   // soma das notas que ja terminaram
unsigned long tempoTotal = 0;     // duracao da musica escolhida
bool passoSolto = false;
bool oledOk = false;
bool telaSuja = true;
unsigned long ultimoDesenho = 0;
long ultimaAssinatura = -1;

// ---------- Som ----------
// Usamos o LEDC do ESP32 porque tone() nao existe em todas as versoes do core.
#if ESP_ARDUINO_VERSION_MAJOR >= 3
void iniciarSom() {
  ledcAttach(PINO_BUZZER, 2000, 8);
}
void ligarSom(int frequencia) {
  ledcWriteTone(PINO_BUZZER, frequencia);
}
void desligarSom() {
  ledcWriteTone(PINO_BUZZER, 0);
}
#else
const int CANAL_BUZZER = 0;
void iniciarSom() {
  ledcSetup(CANAL_BUZZER, 2000, 8);
  ledcAttachPin(PINO_BUZZER, CANAL_BUZZER);
}
void ligarSom(int frequencia) {
  ledcWriteTone(CANAL_BUZZER, frequencia);
}
void desligarSom() {
  ledcWriteTone(CANAL_BUZZER, 0);
}
#endif

// ---------- Musica ----------
unsigned long somarTempos(int indice) {
  unsigned long total = 0;
  for (int i = 0; i < MUSICAS[indice].tam; i++) {
    total += MUSICAS[indice].tempos[i];
  }
  return total;
}

void trocarMusica(int indice) {
  musicaAtual = (indice + NUM_MUSICAS) % NUM_MUSICAS;
  tempoTotal = somarTempos(musicaAtual);
  telaSuja = true;
}

void tocarPasso() {
  int frequencia = MUSICAS[musicaAtual].notas[passo];
  if (frequencia > 0) {
    ligarSom(frequencia);
  } else {
    desligarSom();
  }
  passoSolto = false;
}

void iniciarMusica() {
  if (MUSICAS[musicaAtual].tam <= 0) return;
  passo = 0;
  tempoPassado = 0;
  inicioPasso = millis();
  tocando = true;
  tocarPasso();
  telaSuja = true;
}

void pararMusica() {
  desligarSom();
  tocando = false;
  telaSuja = true;
}

void terminouMusica() {
  pararMusica();
  if (TOCAR_PROXIMA_SOZINHA) {
    trocarMusica(musicaAtual + 1);
    iniciarMusica();
  }
}

void atualizarMusica() {
  if (!tocando) return;
  unsigned long agora = millis();
  unsigned long duracao = MUSICAS[musicaAtual].tempos[passo];
  bool mudouDePasso = false;

  // "while" e nao "if": se o loop atrasar (ex.: desenhando no OLED), alcanca
  // o tempo certo em vez de arrastar a musica inteira para tras.
  while (agora - inicioPasso >= duracao) {
    inicioPasso += duracao;
    tempoPassado += duracao;
    passo++;
    mudouDePasso = true;
    if (passo >= MUSICAS[musicaAtual].tam) {
      terminouMusica();
      return;
    }
    duracao = MUSICAS[musicaAtual].tempos[passo];
  }

  if (mudouDePasso) {
    tocarPasso();
  } else if (!passoSolto && duracao > 3 * SEPARACAO_NOTAS &&
             (agora - inicioPasso) >= duracao - SEPARACAO_NOTAS) {
    desligarSom();
    passoSolto = true;
  }
}

unsigned long tempoDecorrido() {
  if (!tocando) return 0;
  unsigned long total = tempoPassado + (millis() - inicioPasso);
  return total > tempoTotal ? tempoTotal : total;
}

// ---------- Botao ----------
// Devolve uma das ACAO_*. Com aceitaDuplo = false o clique sai na hora
// (usado enquanto toca, para parar sem esperar a janela do clique duplo).
int lerBotao(bool aceitaDuplo) {
  static bool estavaApertado = false;
  static bool segurouLongo = false;
  static bool esperandoSegundoClique = false;
  static unsigned long inicioPressao = 0;
  static unsigned long ultimaMudanca = 0;
  static unsigned long ultimoClique = 0;

  unsigned long agora = millis();
  bool apertado = digitalRead(PINO_BOTAO) == LOW;  // pull-up: apertado = LOW

  if (apertado != estavaApertado && agora - ultimaMudanca > TEMPO_ANTITREPIDACAO) {
    ultimaMudanca = agora;
    estavaApertado = apertado;

    if (apertado) {
      inicioPressao = agora;
      segurouLongo = false;
    } else if (!segurouLongo) {
      // Soltou depois de um aperto curto: e um clique.
      if (!aceitaDuplo) {
        esperandoSegundoClique = false;
        return ACAO_CLIQUE;
      }
      if (esperandoSegundoClique && agora - ultimoClique <= TEMPO_CLIQUE_DUPLO) {
        esperandoSegundoClique = false;
        return ACAO_CLIQUE_DUPLO;
      }
      esperandoSegundoClique = true;
      ultimoClique = agora;
    }
  }

  if (estavaApertado && !segurouLongo && agora - inicioPressao >= TEMPO_SEGURAR) {
    segurouLongo = true;
    esperandoSegundoClique = false;
    return ACAO_SEGURAR;
  }

  // Passou a janela e nao veio o segundo clique: era um clique simples.
  if (esperandoSegundoClique && !estavaApertado && agora - ultimoClique > TEMPO_CLIQUE_DUPLO) {
    esperandoSegundoClique = false;
    return ACAO_CLIQUE;
  }

  return ACAO_NENHUMA;
}

void tratarBotao(int acao) {
  if (tocando) {
    pararMusica();  // tocando, qualquer toque no botao para
    return;
  }
  if (acao == ACAO_CLIQUE) {
    trocarMusica(musicaAtual + 1);
  } else if (acao == ACAO_CLIQUE_DUPLO) {
    trocarMusica(musicaAtual - 1);
  } else if (acao == ACAO_SEGURAR) {
    iniciarMusica();
  }
}

// ---------- Tela ----------
void textoCentralizado(const char* texto, int y, int tamanho) {
  int16_t x1, y1;
  uint16_t w, h;
  display.setTextSize(tamanho);
  display.getTextBounds(texto, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((LARGURA_TELA - (int)w) / 2, y);
  display.print(texto);
}

int larguraBarra() {
  if (tempoTotal == 0) return 0;
  return (int)((unsigned long)(LARGURA_TELA - 4) * tempoDecorrido() / tempoTotal);
}

void desenharTela() {
  if (!oledOk) return;
  const char* nome = MUSICAS[musicaAtual].nome;
  char posicao[12];

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  // Canto de cima: so a posicao na lista e, se estiver tocando, um "play".
  display.setTextSize(1);
  display.setCursor(0, 0);
  snprintf(posicao, sizeof(posicao), "%d/%d", musicaAtual + 1, NUM_MUSICAS);
  display.print(posicao);
  if (tocando) {
    display.fillTriangle(LARGURA_TELA - 8, 0, LARGURA_TELA - 8, 8, LARGURA_TELA - 1, 4, SSD1306_WHITE);
  }

#if ALTURA_TELA >= 64
  // O nome e o protagonista: letra grande no meio da tela. Nome longo vai em
  // letra pequena para nao ser cortado.
  if (strlen(nome) <= 10) {
    textoCentralizado(nome, 24, 2);
  } else {
    textoCentralizado(nome, 28, 1);
  }

  // Embaixo: a barra de progresso enquanto toca, ou a dica de como tocar.
  if (tocando) {
    display.drawRect(0, 58, LARGURA_TELA, 6, SSD1306_WHITE);
    display.fillRect(2, 60, larguraBarra(), 2, SSD1306_WHITE);
  } else {
    textoCentralizado("segure: tocar", 56, 1);
  }
#else
  textoCentralizado(nome, 12, 1);
  if (tocando) {
    display.drawRect(0, 24, LARGURA_TELA, 6, SSD1306_WHITE);
    display.fillRect(2, 26, larguraBarra(), 2, SSD1306_WHITE);
  } else {
    textoCentralizado("segure: tocar", 24, 1);
  }
#endif

  display.display();
}

// O que esta na tela mudou sozinho? Parado, nada muda; tocando, so a barra.
long assinaturaTela() {
  return tocando ? larguraBarra() : 0;
}

void atualizarTela() {
  if (!oledOk) return;
  unsigned long agora = millis();
  long assinatura = assinaturaTela();
  if (!telaSuja && assinatura == ultimaAssinatura) return;

  // Desenhar leva alguns milissegundos (I2C) e atrasaria a nota. Enquanto
  // toca, so redesenha de tempos em tempos.
  if (tocando && !telaSuja && agora - ultimoDesenho < 250) return;

  desenharTela();
  ultimaAssinatura = assinatura;
  ultimoDesenho = agora;
  telaSuja = false;
}

// ---------- Programa ----------
void setup() {
  Serial.begin(115200);
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  iniciarSom();
  desligarSom();

  Wire.begin(PINO_SDA, PINO_SCL);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, ENDERECO_OLED);
  if (!oledOk) {
    Serial.println("OLED nao encontrado: confira SDA, SCL e o endereco 0x3C. O botao e o som continuam funcionando.");
  }

  trocarMusica(0);
}

void loop() {
  int acao = lerBotao(!tocando);
  if (acao != ACAO_NENHUMA) tratarBotao(acao);

  atualizarMusica();
  atualizarTela();
}
`;
}
