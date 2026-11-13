# Cartas: Poker e Blackjack (offline)

Dois jogos de cartas para celular, que funcionam sem internet e sem fichas para comprar:

- **Poker:** Texas hold'em contra bots com personalidades diferentes.
- **Blackjack clássico:** contra a banca, em mesas com meta de fichas.
- **Blackjack arcade:** duelo 1 contra 1 com baralho de 1 a 11 e cartas especiais.

## Estrutura

```
index.html            a página (só a estrutura das telas)
manifest.webmanifest  dados do app instalável (nome, cores, ícones)
sw.js                 deixa o jogo funcionar offline e se atualizar sozinho
css/
  temas.css           todas as cores (um bloco por tema)
  base.css            reset, tipografia, botões e caixas
  telas.css           menu, personalizada, estatísticas, conquistas, opções, ajuda
  jogo.css            mesa de poker, cartas, animações, histórico
  blackjack.css       blackjack, ícones e ajustes das telas novas
js/
  main.js             ponto de entrada: liga os eventos da tela
  jogo.js             regras do poker: mãos, apostas, potes, showdown, fim de partida
  blackjack.js        regras do blackjack clássico
  arcade.js           regras do blackjack arcade, cartas especiais e adversários
  interface21.js      telas do blackjack (clássico e arcade)
  acoes21.js          botões do blackjack e navegação entre os jogos
  icones.js           ícones em SVG
  bots.js             decisões dos adversários e de cada personalidade
  cartas.js           baralho, avaliação das mãos, cálculo de chances
  config.js           personalidades, dificuldades, mesas, temas
  interface.js        desenho das telas e modo treino
  personalizada.js    mesa personalizada e presets salvos
  estatisticas.js     estatísticas e conquistas
  armazenamento.js    leitura e gravação no aparelho (localStorage)
  som.js              sons gerados pelo aparelho
  estado.js, util.js  estado da interface e funções pequenas
icones/               ícones do app
testes/               testes automáticos das regras
```

## Publicar (GitHub Pages)

1. Coloque estes arquivos na raiz do repositório.
2. Em **Settings > Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/(root)`.
3. O endereço do jogo aparece na mesma tela.

Cada alteração enviada ao repositório é publicada sozinha em alguns minutos.

## Editar direto no navegador

Abra o repositório no GitHub e aperte a tecla `.` (ponto). Abre um editor completo (VS Code online), sem instalar nada. Edite, e em **Source Control** escreva uma mensagem e clique em **Commit & Push**.

## Atualizações no celular

O `sw.js` usa "rede primeiro": com internet, o jogo sempre carrega a versão mais nova; sem internet, usa a que está guardada. Não é preciso mudar nenhum número de versão.
Se criar um arquivo `.js` ou `.css` novo, acrescente o nome dele na lista `ARQUIVOS` do `sw.js` (para ele já ficar disponível offline na primeira visita).

## Rodar no computador

Os módulos JavaScript só funcionam servidos por um site (abrir o `index.html` direto do disco não funciona). Na pasta do projeto:

```bash
python3 -m http.server 8000
```

e abra `http://localhost:8000`.

## Testes

Precisa do Node.js. Na pasta do projeto:

```bash
npm test
```

Eles conferem o valor das mãos do poker (todas as 2,6 milhões de combinações de 5 cartas), potes paralelos, as regras de aposta e de revelação das cartas e dezenas de partidas completas. No blackjack, conferem cada regra (blackjack, dobrar, dividir, banca) e simulam centenas de milhares de rodadas com estratégia básica para checar a vantagem da banca. No arcade, testam cada carta especial e jogam partidas contra todos os adversários. Também conferem que os botões e os ids da página batem com o código.

## Onde mexer

| Quero... | Arquivo |
|---|---|
| Ajustar um bot (agressividade, blefe...) | `js/config.js` (objeto `PERS`) e `js/bots.js` |
| Mudar chance de cada personalidade por dificuldade | `js/config.js` (objeto `DIFF`) |
| Criar ou ajustar mesas | `js/config.js` (lista `TABLES`) |
| Criar um tema | `js/config.js` (lista `THEMES`) e um bloco novo em `css/temas.css` |
| Conquistas | `js/estatisticas.js` (lista `ACH`) |
| Regras do poker | `js/jogo.js` |
| Regras ou mesas do blackjack clássico | `js/blackjack.js` e `js/config.js` (`BJ_REGRAS`, `BJ_TABLES`) |
| Cartas especiais, adversários e dificuldade do arcade | `js/arcade.js` (`CARTAS`, `PERS_ARC`) e `js/config.js` (`ARC_OPPS`) |
| Trocar um ícone | `js/icones.js` |
