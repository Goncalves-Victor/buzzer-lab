# Buzzer Lab

**Crie, teste e transforme músicas em código para seu buzzer.**

Ferramenta didática para alunos de robótica criarem melodias para um **buzzer
passivo** direto no navegador e levarem o código pronto para o Arduino/ESP32 —
sem precisar ter o hardware por perto para começar.

Projeto irmão do **OLED Lab**, com a mesma filosofia: experimentar o componente
virtualmente antes de montar o circuito.

## Como rodar

Você precisa do **Node.js 18+**.

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite (algo como `http://localhost:5173`).
Para testar no celular, use o IP da sua máquina na mesma rede — o servidor já
está configurado para isso.

Versão de produção:

```bash
npm run build
npm run preview
```

## O que dá para fazer

**Piano virtual (C3–C6)** — toque com o mouse, com o dedo ou com o teclado do
computador (A, W, S, E, D, F, T, G, Y, H, U, J, K). O som é uma onda quadrada,
igual à do buzzer de verdade, e não um piano.

**Gravação** — clique em Gravar e toque. A duração de cada nota é medida
sozinha, e o silêncio entre elas vira pausa automaticamente.

**Linha do tempo** — cada nota ou pausa vira um bloco. A largura mostra a
duração e a barrinha interna mostra se o som é grave ou agudo. Dá para
selecionar, mover, duplicar, inserir, excluir e arrastar.

**Editor** — muda a nota, a frequência (inclusive valores personalizados) e a
duração, com atalhos de 62 a 1000 ms.

**Ajustar tempos** — arredonda durações gravadas (118 ms → 125 ms) mostrando
antes e depois, sem aplicar nada até você confirmar.

**Desfazer e refazer** — com atalho `Ctrl+Z` / `Ctrl+Shift+Z`.

**BPM e metrônomo** — guia de ritmo durante a gravação. O metrônomo nunca entra
na música.

**Código gerado** — os dois vetores aparecem e se atualizam sozinhos:

```cpp
const int minhaMusicaN[] = {
  262, 294, 330, 0, 392
};

const int minhaMusicaT[] = {
  250, 250, 500, 250, 750
};
```

Cada posição é um passo: `minhaMusicaN[0] = 262` com `minhaMusicaT[0] = 250`
significa tocar 262 Hz durante 250 ms. Frequência `0` é silêncio.

**Exportar .ino** — sketch Arduino completo, com o pino do buzzer configurável
e download do arquivo.

**Importar** — cole os vetores de volta e a música reaparece editável na linha
do tempo.

**Exemplos e Meus exemplos** — melodias prontas para abrir e editar, e espaço
para salvar as suas.

Tudo é salvo automaticamente no navegador: atualizar a página não apaga a
música.

## Ligação no Arduino

Um fio do buzzer no pino escolhido (padrão: 5) e o outro no GND. O buzzer
precisa ser **passivo** — o ativo tem frequência fixa e ignora o valor em Hz.

## Documentação técnica

A arquitetura, as regras do projeto e os cuidados com áudio estão em
[`CLAUDE.md`](./CLAUDE.md).
