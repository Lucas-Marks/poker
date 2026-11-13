import test from 'node:test';
import assert from 'node:assert/strict';
import { jogo, iniciarPersonalizada, limparTimers } from './_ajuda.js';
import { score5, best7, P5, makeDeck, shuffle } from '../js/cartas.js';
import { ind7, cmp } from './_avaliador.js';

const baralho = makeDeck();

test('todas as 2.598.960 mãos de 5 cartas caem na categoria certa (e há 7.462 mãos distintas)', () => {
  const esperado = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40];
  const cont = new Array(9).fill(0), distintas = new Set();
  for (let a = 0; a < 48; a++) for (let b = a + 1; b < 49; b++) for (let c = b + 1; c < 50; c++)
    for (let d = c + 1; d < 51; d++) for (let e = d + 1; e < 52; e++) {
      const v = score5([baralho[a], baralho[b], baralho[c], baralho[d], baralho[e]]);
      cont[Math.floor(v / P5)]++; distintas.add(v);
    }
  assert.deepEqual(cont, esperado);
  assert.equal(distintas.size, 7462);
});

test('mãos de 7 cartas: o jogo concorda com o avaliador independente', () => {
  for (let k = 0; k < 40000; k++) {
    const d = shuffle(baralho.slice()), mesa = d.slice(0, 5);
    const A = d.slice(5, 7).concat(mesa), B = d.slice(7, 9).concat(mesa);
    assert.equal(Math.sign(best7(A) - best7(B)), cmp(ind7(A), ind7(B)));
  }
});

const C = s => s.trim().split(/\s+/).map(x => ({r: '23456789TJQKA'.indexOf(x[0]) + 2, s: 'shdc'.indexOf(x[1])}));
test('casos clássicos', () => {
  const casos = [
    ['Ah 2d 3c 4s 5h 9c Kd', '2h 3d 4c 5s 6h 9s Kc', -1],   // roda perde para sequência até 6
    ['2h 5h 9h Jh Kh 3c 4d', '5c 6d 7h 8s 9c 2d 3s', 1],    // flush > sequência
    ['Kh Kd Ks 2c 2d 9h 4s', 'Qh Qd Qs Ac Ad 9c 4d', 1],    // full house: trinca maior
    ['Ah Ad Kc Ks 9h 2d 3c', 'Ac As Kh Kd 8h 2c 3d', 1],    // dois pares: kicker
    ['9h 9d 9c 9s Ah 2d 3c', '9h 9d 9c 9s Kh 2d 3c', 1],    // quadra: kicker
    ['Ah Kh Qh Jh Th 2c 3d', 'Ah Kh Qh Jh Th 4c 5d', 0],    // jogo na mesa = empate
    ['5h 6h 7h 8h 9h 2c 2d', 'Ac Ad Ah As Kc Kd 2s', 1],    // straight flush > quadra
  ];
  for (const [a, b, esperado] of casos) assert.equal(Math.sign(best7(C(a)) - best7(C(b))), esperado, `${a} x ${b}`);
});

test('potes paralelos (side pots): 20.000 cenários aleatórios', () => {
  iniciarPersonalizada(3, ['novato', 'novato']);
  limparTimers();
  for (let k = 0; k < 20000; k++) {
    const n = 2 + Math.floor(Math.random() * 7);
    const jogadores = Array.from({length: n}, () => ({total: 1 + Math.floor(Math.random() * 30), folded: Math.random() < 0.35}));
    if (!jogadores.some(p => !p.folded)) jogadores[0].folded = false;
    jogo.G.players = jogadores;
    const potes = jogo.buildPots();
    const soma = jogadores.reduce((a, p) => a + p.total, 0);
    assert.equal(potes.reduce((a, p) => a + p.amount, 0), soma);
    // decomposição ingênua camada a camada
    const maxT = Math.max(...jogadores.map(p => p.total)), mapa = new Map();
    let morto = 0;
    for (let u = 1; u <= maxT; u++) {
      const contrib = jogadores.filter(p => p.total >= u).length;
      const el = jogadores.map((p, i) => (!p.folded && p.total >= u) ? i : -1).filter(i => i >= 0).join(',');
      if (!el) { morto += contrib; continue; }
      mapa.set(el, (mapa.get(el) || 0) + contrib);
    }
    if (morto && mapa.size) { const ult = [...mapa.keys()].pop(); mapa.set(ult, mapa.get(ult) + morto); }
    const meu = new Map(potes.map(p => [p.eligible.join(','), p.amount]));
    assert.deepEqual([...meu.entries()].sort(), [...mapa.entries()].sort());
  }
});
