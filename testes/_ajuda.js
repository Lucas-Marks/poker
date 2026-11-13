// Funções de apoio dos testes (depois de simular o navegador, carrega o jogo de verdade).
import { elementos, timers, store, raiz, clique, digitar, mudar } from './_dom.js';
import '../js/main.js';
import * as jogo from '../js/jogo.js';
import { botAct } from '../js/bots.js';

export { elementos, timers, store, raiz, clique, digitar, mudar, jogo };

export function iniciarPersonalizada(jogadores, bots, fichas = 500, heroi = 'agressivo') {
  clique('custom');
  mudar('cPlayers', jogadores);
  bots.forEach((b, k) => mudar('x', b, {bot: String(k)}));
  digitar('cChips', fichas);
  clique('cplay');
  if (elementos.modal.hidden === false) clique('myes');
  jogo.G.players[0].pers = heroi;
  return jogo.G;
}

export function iniciarMesa(i, heroi = 'agressivo', adversarios = 'novato') {
  clique('table', {i});
  if (elementos.modal.hidden === false) clique('myes');
  jogo.G.players[0].pers = heroi;
  jogo.G.players.slice(1).forEach(p => { p.pers = adversarios; });
  return jogo.G;
}

/* Joga até a partida acabar. O jogador usa a mesma lógica dos bots. */
export function jogar(max = 60000, aoTurno) {
  for (let g = 0; g < max; g++) {
    const G = jogo.G;
    if (G.ended) {
      if (G.over) return 'derrota';
      if (G.victory) return 'vitoria';
      clique('next');
      continue;
    }
    if (G.toAct === 0 && !G.players[0].folded && !G.players[0].allIn && timers.length === 0) {
      if (aoTurno) aoTurno();
      botAct(0);
      continue;
    }
    if (timers.length) timers.shift().f();
    else return 'travou';
  }
  return 'limite';
}

export function limparTimers() {
  if (jogo.G) clearTimeout(jogo.G.timer);
  timers.length = 0;
}
