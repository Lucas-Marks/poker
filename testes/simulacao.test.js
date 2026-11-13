import test from 'node:test';
import assert from 'node:assert/strict';
import { timers, clique, jogo, iniciarPersonalizada, jogar } from './_ajuda.js';
import { ind7, cmp } from './_avaliador.js';

const PERS = ['novato', 'intermediario', 'profissional', 'enganador', 'medroso', 'agressivo', 'copiador', 'mimico', 'trapaceiro', 'cacador', 'vingativo', 'caotico'];

test('dezenas de partidas completas respeitam as regras em cada ação', { timeout: 200000 }, () => {
  const viol = {}, exemplo = {};
  const v = (k, m = '') => { viol[k] = (viol[k] || 0) + 1; if (!exemplo[k]) exemplo[k] = m; };
  let fichasIniciais = 0, showdowns = 0, maos = 0;

  jogo.ganchos.depoisDaAcao = i => {
    const G = jogo.G;
    if (G.toAct !== i) v('ordem_da_vez');
    const maior = Math.max(...G.players.map(p => p.bet));
    if (!(G.currentBet === maior || G.currentBet === G.t.bb)) v('aposta_atual_errada', `atual ${G.currentBet} maior ${maior}`);
    G.players.forEach(p => {
      if (p.stack < 0) v('ficha_negativa');
      if (p.bet > G.currentBet) v('aposta_acima_da_atual');
      if (p.stack === 0 && !p.allIn) v('all-in_nao_marcado');
      if (p.allIn && p.stack !== 0) v('all-in_com_fichas');
    });
    if (G.players.reduce((a, p) => a + p.stack + p.total, 0) !== fichasIniciais) v('fichas_nao_conservadas');
  };
  jogo.ganchos.antesDeAumentar = (i, para) => {
    const G = jogo.G, p = G.players[i], allin = para >= p.bet + p.stack;
    if (p.locked) v('aumento_de_jogador_travado', p.name);
    if (para <= G.currentBet) v('aumento_nao_maior_que_a_aposta');
    else if (!allin && para - G.currentBet < G.minRaise) v('aumento_menor_que_o_minimo', `para ${para} atual ${G.currentBet} mín ${G.minRaise}`);
  };
  jogo.ganchos.fimDeRodada = () => {
    const G = jogo.G;
    G.players.forEach(p => { if (!p.folded && !p.allIn && p.bet !== G.currentBet) v('rodada_fechou_sem_igualar', p.name); });
  };
  jogo.ganchos.fimDeMao = won => {
    const G = jogo.G; maos++;
    if (G.players.reduce((a, p) => a + p.total, 0) !== won.reduce((a, b) => a + b, 0)) v('pote_mal_distribuido');
    if (!G.showdown) return;
    showdowns++;
    const ps = G.players, N = ps.length;
    const vivos = ps.map((p, i) => i).filter(i => !ps[i].folded), val = {};
    vivos.forEach(i => { val[i] = ind7(ps[i].cards.concat(G.board)); });
    let melhor = vivos[0];
    vivos.forEach(i => { if (cmp(val[i], val[melhor]) > 0) melhor = i; });
    if (!vivos.filter(i => cmp(val[i], val[melhor]) === 0).some(i => won[i] > 0)) v('melhor_mao_nao_ganhou');
    const allIn = vivos.some(i => ps[i].allIn);
    const inicio = G.finalAggr >= 0 && !ps[G.finalAggr].folded ? G.finalAggr : (G.dealer + 1) % N;
    const obrigados = new Set(); let visto = null;
    for (let k = 0; k < N; k++) {
      const i = (inicio + k) % N;
      if (ps[i].folded) continue;
      if (allIn || visto === null || cmp(val[i], visto) >= 0) { obrigados.add(i); if (visto === null || cmp(val[i], visto) > 0) visto = val[i]; }
    }
    vivos.forEach(i => { if (ps[i].show !== (won[i] > 0 || obrigados.has(i))) v('regra_de_revelacao_errada', ps[i].name); });
  };

  const inicio = Date.now();
  let partidas = 0;
  while (Date.now() - inicio < 70000 && partidas < 60) {
    const n = 2 + Math.floor(Math.random() * 7), fichas = [100, 250, 500, 1000][Math.floor(Math.random() * 4)];
    const bots = Array.from({length: n - 1}, () => PERS[Math.floor(Math.random() * PERS.length)]);
    const G = iniciarPersonalizada(n, bots, fichas, ['novato', 'intermediario', 'profissional', 'agressivo'][Math.floor(Math.random() * 4)]);
    fichasIniciais = G.players.reduce((a, p) => a + p.stack + p.total, 0);
    const fim = jogar();
    assert.ok(fim === 'vitoria' || fim === 'derrota', 'a partida terminou (' + fim + ')');
    partidas++;
    clique('menu');
  }
  jogo.ganchos.depoisDaAcao = jogo.ganchos.antesDeAumentar = jogo.ganchos.fimDeRodada = jogo.ganchos.fimDeMao = undefined;
  console.log(`  ${partidas} partidas, ${maos} mãos, ${showdowns} showdowns`);
  assert.deepEqual(viol, {}, JSON.stringify(exemplo));
});
