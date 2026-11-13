import './_dom.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as bj from '../js/blackjack.js';
import { BJ_TABLES } from '../js/config.js';

const C = s => ({r: {A: 14, K: 13, Q: 12, J: 11}[s] || Number(s), s: 0});
/* Mesa com baralho combinado. Ordem de saída: jogador, jogador, banca (aberta), banca (fechada), depois as compras. */
function cena(tabela, ordem, fichas) {
  bj.novaMesaBJ(tabela);
  if (fichas !== undefined) bj.B.chips = fichas;
  bj.B.shoe = ordem.map(C).reverse();
  return bj.B;
}
const MEDIO = BJ_TABLES[3], DIFICIL = BJ_TABLES[6];   // medio: 3:2, banca para no 17 mole | dificil: 6:5, banca compra no 17 mole

test('valor das mãos (ás vale 1 ou 11)', () => {
  assert.deepEqual(bj.valorMao([C('A'), C('K')]), {total: 21, soft: true});
  assert.deepEqual(bj.valorMao([C('A'), C('A'), C('9')]), {total: 21, soft: true});
  assert.deepEqual(bj.valorMao([C('A'), C('6'), C('K')]), {total: 17, soft: false});
  assert.equal(bj.valorMao([C('10'), C('6'), C('9')]).total, 25);
});

test('blackjack do jogador paga 3 para 2', () => {
  const B = cena(MEDIO, ['A', 'K', '9', '7'], 500);
  bj.apostarBJ(10);
  assert.equal(B.maos[0].resultado, 'blackjack');
  assert.equal(B.chips, 500 - 10 + 10 + 15);
  assert.equal(B.fase, 'resultado');
});

test('blackjack paga 6 para 5 nas mesas difíceis', () => {
  const B = cena(DIFICIL, ['A', 'K', '9', '7'], 5000);
  bj.apostarBJ(100);
  assert.equal(B.chips, 5000 + 120);
});

test('banca com blackjack leva a aposta; blackjack dos dois é empate', () => {
  let B = cena(MEDIO, ['K', 'Q', 'A', 'K'], 500);
  bj.apostarBJ(10);
  assert.equal(B.maos[0].resultado, 'perdeu'); assert.equal(B.chips, 490);
  B = cena(MEDIO, ['A', 'K', 'A', 'K'], 500);
  bj.apostarBJ(10);
  assert.equal(B.maos[0].resultado, 'empate'); assert.equal(B.chips, 500);
});

test('jogador que estoura perde e a banca nem compra', () => {
  const B = cena(MEDIO, ['10', '6', '9', '8', 'K'], 500);
  bj.apostarBJ(10); bj.pedirBJ();
  assert.equal(B.maos[0].resultado, 'estourou');
  assert.equal(B.banca.cartas.length, 2);
  assert.equal(B.chips, 490);
});

test('dobrar: uma carta só e aposta em dobro', () => {
  const B = cena(MEDIO, ['5', '6', '6', '10', '10', '8'], 500);   // 5+6=11, dobra e recebe 10 = 21; banca 16 compra 8 e estoura
  bj.apostarBJ(10);
  assert.ok(bj.acoesBJ().dobrar);
  bj.dobrarBJ();
  assert.equal(B.maos[0].aposta, 20);
  assert.equal(B.maos[0].cartas.length, 3);
  assert.equal(B.maos[0].resultado, 'ganhou');
  assert.equal(B.chips, 500 - 10 - 10 + 40);
});

test('dividir um par cria duas mãos com a mesma aposta', () => {
  const B = cena(MEDIO, ['8', '8', '6', 'K', '3', '2', '10', '9'], 500);
  bj.apostarBJ(10);
  assert.ok(bj.acoesBJ().dividir);
  bj.dividirBJ();
  assert.equal(B.maos.length, 2);
  assert.equal(B.chips, 500 - 20);
  assert.deepEqual(B.maos.map(h => h.cartas.length), [2, 2]);
  bj.ficarBJ(); bj.ficarBJ();     // 8+3=11 e 8+2=10; banca 16 compra 10 e estoura
  assert.equal(B.fase, 'resultado');
  assert.equal(B.maos.every(h => h.resultado === 'ganhou'), true);
  assert.equal(B.chips, 500 - 20 + 40);
});

test('ases divididos recebem uma carta só e 21 depois de dividir paga 1 para 1', () => {
  const B = cena(MEDIO, ['A', 'A', '9', '7', 'K', '5', '10'], 500);
  bj.apostarBJ(10); bj.dividirBJ();
  assert.ok(B.maos.every(h => h.feita), 'sem mais cartas');
  assert.equal(B.fase, 'resultado');
  assert.equal(B.maos[0].resultado, 'ganhou');         // A+K = 21, mas não é blackjack
  assert.equal(B.maos[0].retorno, 20);
  assert.equal(B.maos[1].resultado, 'ganhou');         // A+5 = 16; banca 16 compra 10 e estoura
});

test('banca no 17 mole: para (mesa média) ou compra (mesa difícil)', () => {
  let B = cena(MEDIO, ['10', '9', 'A', '6', 'K'], 500);
  bj.apostarBJ(10); bj.ficarBJ();
  assert.equal(B.banca.cartas.length, 2, 'para no 17 mole');
  B = cena(DIFICIL, ['10', '9', 'A', '6', 'K'], 5000);
  bj.apostarBJ(100); bj.ficarBJ();
  assert.equal(B.banca.cartas.length, 3, 'compra no 17 mole');
});

test('meta alcançada = vitória e derrota sem fichas para a aposta mínima', () => {
  let B = cena(MEDIO, ['A', 'K', '9', '7'], 1490);
  bj.apostarBJ(100);
  assert.equal(B.fimDeJogo, 'vitoria');
  B = cena(MEDIO, ['10', '6', '9', '8', 'K'], 15);
  bj.apostarBJ(10); bj.pedirBJ();      // estoura: fica com 5, menos que a mínima (10)
  assert.equal(B.fimDeJogo, 'derrota');
});

test('aposta mínima sobe com o tempo e o salvamento volta ao mesmo estado', () => {
  const B = cena(MEDIO, ['10', '9', '10', '7'], 500);
  bj.apostarBJ(10); bj.ficarBJ();
  B.rodada = MEDIO.cada;                 // completou o ciclo de rodadas
  bj.proximaRodadaBJ();
  assert.ok(B.t.min > 10, 'mínima subiu: ' + B.t.min);
  assert.equal(B.t.max, B.t.min * 20);
  assert.equal(bj.carregarBJ().t.min, B.t.min);
});

function simular(tabela, rodadas) {
  bj.novaMesaBJ(tabela);
  const B = bj.B;
  B.chips = 1e12; B.t.goal = Infinity; B.t.cada = 0; B.practice = true;
  let soma = 0;
  for (let i = 0; i < rodadas; i++) {
    const antes = B.chips;
    assert.ok(bj.apostarBJ(10));
    let guarda = 0;
    while (B.fase === 'jogo') {
      assert.ok(guarda++ < 40, 'rodada travada');
      assert.ok(B.maos.length <= 4);
      const s = bj.sugestaoBJ();
      ({pedir: bj.pedirBJ, ficar: bj.ficarBJ, dobrar: bj.dobrarBJ, dividir: bj.dividirBJ})[s]();
    }
    soma += (B.chips - antes) / 10;
    assert.ok(B.chips > 0);
    bj.proximaRodadaBJ();
  }
  return soma / rodadas;
}
test('com estratégia básica a vantagem da banca fica no esperado (sinal de regras corretas)', { timeout: 120000 }, () => {
  const medio = simular({...MEDIO, min: 10, max: 200}, 250000);
  const dificil = simular({...DIFICIL, min: 10, max: 200}, 250000);
  console.log(`  retorno por aposta inicial: mesa média ${(medio * 100).toFixed(2)}%, mesa difícil (6 para 5) ${(dificil * 100).toFixed(2)}%`);
  assert.ok(medio > -0.015 && medio < 0.005, 'média ' + medio);
  assert.ok(dificil < medio - 0.004, 'a mesa difícil precisa ser pior para o jogador');
});
