import test from 'node:test';
import assert from 'node:assert/strict';
import { elementos, timers, clique, jogo, iniciarPersonalizada, limparTimers } from './_ajuda.js';

const carta = (r, s) => ({r, s});
function preparar(jogadores, bots, fichas = 1000) {
  const G = iniciarPersonalizada(jogadores, bots, fichas);
  limparTimers();
  G.ended = false;
  return G;
}

test('blind curto: a aposta a pagar é o big blind inteiro', () => {
  let G = preparar(4, ['novato', 'novato', 'novato'], 500);
  const N = G.players.length, nd = (G.dealer + 1) % N, bb = (nd + 2) % N;
  G.ended = true;
  G.players.forEach(p => Object.assign(p, {stack: 100, bet: 0, total: 0, folded: false, allIn: false}));
  G.players[bb].stack = 3;
  clique('next');
  G = jogo.G;
  assert.equal(G.currentBet, G.t.bb);
  assert.equal(G.players[bb].bet, 3);
});

test('all-in menor que o aumento mínimo não reabre a aposta', () => {
  const G = preparar(4, ['novato', 'novato', 'novato']);
  G.phase = 'flop'; G.board = [carta(2, 0), carta(7, 1), carta(11, 2)];
  G.players.forEach(p => Object.assign(p, {folded: false, allIn: false, acted: false, locked: false, bet: 0, total: 0, stack: 500}));
  Object.assign(G.players[0], {bet: 20, total: 20, stack: 980, acted: true});
  G.players[1].stack = 30; G.players[3].folded = true;
  Object.assign(G, {currentBet: 20, minRaise: 20, toAct: 1, lastAggr: -1, acts: []});
  jogo.doRaise(1, 30); timers.length = 0;
  assert.equal(G.players[0].locked, true, 'quem já agiu fica travado');
  assert.equal(G.players[2].locked, false, 'quem ainda não agiu pode aumentar');
  G.toAct = 0; clique('cancel');
  assert.ok(!/data-a="open"/.test(elementos.actions.innerHTML), 'sem botão Aumentar para o travado');
  G.players[2].acted = false; jogo.doRaise(2, 90); timers.length = 0;
  assert.equal(G.players[0].locked, false, 'um aumento cheio destrava');
  assert.equal(G.players[0].acted, false);
});

function fichaImpar(botao) {
  const G = preparar(3, ['novato', 'novato']);
  Object.assign(G, {phase: 'river', board: [carta(14, 1), carta(13, 1), carta(12, 1), carta(11, 1), carta(10, 1)], dealer: botao, currentBet: 0, lastAggr: -1});
  G.players.forEach(p => Object.assign(p, {folded: false, allIn: false, bet: 0, stack: 100, show: false}));
  Object.assign(G.players[0], {folded: true, total: 1, cards: [carta(2, 0), carta(3, 1)]});
  Object.assign(G.players[1], {total: 3, cards: [carta(2, 2), carta(3, 3)]});
  Object.assign(G.players[2], {total: 3, cards: [carta(2, 1), carta(4, 0)]});
  jogo.advance();
  return G.players.map(p => p.stack);
}
test('ficha ímpar vai para o primeiro à esquerda do botão', () => {
  assert.deepEqual(fichaImpar(0).slice(1), [104, 103]);
  assert.deepEqual(fichaImpar(1).slice(1), [103, 104]);
});

function showdown(ajuste) {
  const G = preparar(4, ['novato', 'novato', 'novato']);
  Object.assign(G, {phase: 'river', board: [carta(2, 0), carta(5, 1), carta(9, 2), carta(11, 3), carta(3, 0)], currentBet: 0});
  G.players.forEach(p => Object.assign(p, {folded: false, allIn: false, bet: 0, total: 20, stack: 200, show: false, locked: false}));
  G.players[0].folded = true;
  G.players[1].cards = [carta(13, 1), carta(8, 0)];   // carta alta (fraca)
  G.players[2].cards = [carta(14, 0), carta(14, 1)];  // par de ases (forte)
  G.players[3].cards = [carta(5, 2), carta(7, 3)];    // par de 5 (média)
  ajuste(G); jogo.advance();
  return G;
}
test('showdown com all-in: todos mostram as cartas', () => {
  const G = showdown(g => { [2, 3].forEach(i => { g.players[i].allIn = true; g.players[i].stack = 0; }); });
  assert.ok([1, 2, 3].every(i => G.players[i].show));
  assert.match(G.msg, /All-in: as cartas foram reveladas/);
});
test('showdown: o último agressor mostra; quem é pior que a melhor mão já vista pode dar muck', () => {
  const G = showdown(g => { g.lastAggr = 1; g.dealer = 0; });
  assert.deepEqual([1, 2, 3].map(i => G.players[i].show), [true, true, false]);
});
test('showdown sem aposta final: começa à esquerda do botão', () => {
  const G = showdown(g => { g.lastAggr = -1; g.dealer = 2; });
  assert.deepEqual([1, 2, 3].map(i => G.players[i].show), [false, true, true]);
});
