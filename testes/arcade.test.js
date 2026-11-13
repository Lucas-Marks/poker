import './_dom.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as arc from '../js/arcade.js';
import { ARC_OPPS } from '../js/config.js';

const DIEGO = ARC_OPPS[3];
/* Rodada montada à mão. O baralho sai pelo FIM da lista (o último número é a próxima carta). */
function preparar({p = [5, 6], o = [4, 7], baralho = [1, 2, 3, 8, 9, 10, 11], espP = [], espO = [], vez = 'p'} = {}) {
  arc.novaPartidaArc(DIEGO);
  const A = arc.A;
  Object.assign(A.lado.p, {cartas: [...p], esp: [...espP], parou: false, congelado: false, viu: null});
  Object.assign(A.lado.o, {cartas: [...o], esp: [...espO], parou: false, congelado: false, viu: null});
  Object.assign(A, {baralho: [...baralho], vez, fase: 'jogo', passes: 0, alvo: 21, aposta: 1, escudo: {p: 0, o: 0}, aviso: '', ult: {}, log: []});
  return A;
}

test('cada rodada começa com baralho de 1 a 11 sem repetição', () => {
  for (let i = 0; i < 200; i++) {
    arc.novaPartidaArc(DIEGO);
    const A = arc.A, todas = [...A.baralho, ...A.lado.p.cartas, ...A.lado.o.cartas].sort((a, b) => a - b);
    assert.deepEqual(todas, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.equal(A.lado.p.esp.length, 1); assert.equal(A.lado.o.esp.length, 1);
  }
});

test('Escudo e Escudo+ reduzem a perda; nunca abaixo de zero', () => {
  let A = preparar({p: [10, 10], o: [10, 8], espP: ['escudo']});   // eu 20, ele 18: ganho, ele perde. Eu uso escudo e perco o contrário
  arc.usarEsp('p', 0); assert.equal(A.escudo.p, 1);
  A = preparar({p: [10, 10], o: [10, 9], espP: ['escudo2']});     // 20 contra 19: ganho
  arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, 'p'); assert.equal(A.hp.o, 9);
  A = preparar({p: [5, 6], o: [10, 9], espP: ['escudo2'], baralho: [1]});   // 11 contra 19: perco, mas Escudo+ cobre 2
  A.aposta = 2; arc.usarEsp('p', 0); arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, 'o'); assert.equal(A.resultado.perda, 0); assert.equal(A.hp.p, 10);
});

test('Aposta +2 e +3 aumentam o valor em jogo', () => {
  let A = preparar({espP: ['aposta2']}); arc.usarEsp('p', 0); assert.equal(A.aposta, 3);
  A = preparar({espP: ['aposta3']}); arc.usarEsp('p', 0); assert.equal(A.aposta, 4);
});

test('Quebra destrói uma carta especial do adversário (e não vale sem alvo)', () => {
  let A = preparar({espP: ['quebra'], espO: ['escudo', 'aposta2']});
  assert.ok(arc.usarEsp('p', 0)); assert.equal(A.lado.o.esp.length, 1);
  A = preparar({espP: ['quebra'], espO: []});
  assert.equal(arc.usarEsp('p', 0), false); assert.equal(A.lado.p.esp.length, 1, 'a carta não é gasta');
});

test('Retorno devolve a última carta ao baralho (precisa ter 2 ou mais cartas)', () => {
  let A = preparar({p: [5, 6, 9], baralho: [1, 2, 3], espP: ['retorno']});
  arc.usarEsp('p', 0);
  assert.deepEqual(A.lado.p.cartas, [5, 6]); assert.equal(A.baralho.length, 4); assert.ok(A.baralho.includes(9));
  A = preparar({p: [5], espP: ['retorno']});
  assert.equal(arc.usarEsp('p', 0), false);
});

test('Troca troca as últimas cartas abertas', () => {
  const A = preparar({p: [5, 6, 9], o: [4, 7], espP: ['troca']});
  arc.usarEsp('p', 0);
  assert.deepEqual(A.lado.p.cartas, [5, 6, 7]); assert.deepEqual(A.lado.o.cartas, [4, 9]);
});

test('Meta 17 e Meta 24 mudam o alvo da rodada', () => {
  let A = preparar({p: [9, 8], o: [10, 9], espP: ['meta17']});     // eu 17, ele 19; com alvo 17 ele estoura
  arc.usarEsp('p', 0); assert.equal(A.alvo, 17);
  arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, 'p');
  A = preparar({p: [10, 9, 4], o: [9, 8], espP: ['meta24']});      // eu 23 estouraria no 21, mas com 24 passo a ser ok
  arc.usarEsp('p', 0); arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, 'p');
  A = preparar({espP: ['meta17']}); A.alvo = 17;
  assert.equal(arc.usarEsp('p', 0), false, 'não repete o mesmo alvo');
});

test('Carta 3/5/7 só funcionam se o número ainda está no baralho', () => {
  let A = preparar({baralho: [1, 2, 3, 8], espP: ['carta3']});
  assert.ok(arc.usarEsp('p', 0)); assert.deepEqual(A.lado.p.cartas, [5, 6, 3]); assert.ok(!A.baralho.includes(3));
  A = preparar({baralho: [1, 2, 8], espP: ['carta3']});
  assert.equal(arc.usarEsp('p', 0), false);
});

test('Carta certa compra a maior carta que não estoura (ou a menor, se todas estouram)', () => {
  let A = preparar({p: [8, 5], baralho: [2, 9, 3, 11, 10], espP: ['certa']});   // soma 13, cabem até 8: só o 3 e o 2 -> 3
  arc.usarEsp('p', 0); assert.deepEqual(A.lado.p.cartas, [8, 5, 3]);
  A = preparar({p: [10, 10], baralho: [9, 5, 11], espP: ['certa']});             // 20: só cabe 1, nenhuma serve -> menor (5)
  arc.usarEsp('p', 0); assert.deepEqual(A.lado.p.cartas, [10, 10, 5]);
});

test('Visão mostra a carta escondida do adversário (uma vez por rodada)', () => {
  const A = preparar({o: [9, 7], espP: ['visao', 'visao']});
  arc.usarEsp('p', 0); assert.equal(A.lado.p.viu, 9);
  assert.equal(arc.usarEsp('p', 0), false);
});

test('Congelar impede o adversário de comprar', () => {
  const A = preparar({espP: ['congelar']});
  arc.usarEsp('p', 0);
  A.vez = 'o';
  assert.equal(arc.podeComprar('o'), false); assert.equal(arc.comprarArc('o'), false);
  const passo = arc.passoIA(); assert.equal(passo.tipo === 'comprar', false);
});

test('resultado da rodada: estouro, empate, empate duplo e fim de partida', () => {
  let A = preparar({p: [10, 9, 5], o: [10, 9]});            // eu 24, ele 19
  arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, 'o'); assert.equal(A.hp.p, 9);
  A = preparar({p: [10, 9], o: [10, 9]}); arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, null); assert.equal(A.hp.p, 10); assert.equal(A.hp.o, 10);
  A = preparar({p: [10, 9, 5], o: [10, 9, 5]}); arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.resultado.venc, null);
  A = preparar({p: [10, 9], o: [10, 5]}); A.hp.o = 1; arc.pararArc('p'); arc.pararArc('o');
  assert.equal(A.fim, 'vitoria');
});

test('fluxo de turnos: duas paradas seguidas encerram; comprar reabre a rodada', () => {
  let A = preparar();
  arc.pararArc('p'); assert.equal(A.vez, 'o'); assert.equal(A.fase, 'jogo');
  arc.comprarArc('o'); assert.equal(A.vez, 'p'); assert.equal(A.passes, 0);
  arc.pararArc('p'); arc.pararArc('o'); assert.equal(A.fase, 'resultado');
  A = preparar({baralho: []});
  assert.equal(arc.podeComprar('p'), false);
});

test('o adversário honesto não usa a carta escondida do jogador', () => {
  // Troco a carta escondida do jogador por uma carta do baralho (para quem não vê, nada muda): a jogada tem que ser a mesma.
  const antes = [];
  for (const oculta of [11, 9, 8, 3, 2]) {
    const A = preparar({p: [oculta, 6], o: [5, 7], baralho: [1, 2, 3, 4, 8, 9, 10, 11].filter(x => x !== oculta).concat([6].filter(() => false)), vez: 'o'});
    A.baralho = [1, 2, 3, 4, 8, 9, 10, 11, 5].filter(x => ![oculta, 6, 5, 7].includes(x));
    A.lado.o.cartas = [5, 7];
    A.ult = {};
    A.imit = null;
    A.t.pers = 'profissional';
    antes.push(arc.passoIA().tipo);
  }
  assert.equal(new Set(antes).size, 1, antes.join());
});

test('trapaceiro vê a carta escondida do jogador e avisa que trapaceou (nem toda rodada)', () => {
  const opp = ARC_OPPS.find(o => o.pers === 'trapaceiro');
  let trapaceou = 0, honesto = 0;
  for (let i = 0; i < 300; i++) {
    arc.novaPartidaArc(opp);
    if (arc.A.lado.o.viu != null) { trapaceou++; assert.equal(arc.A.lado.o.viu, arc.A.lado.p.cartas[0]); assert.match(arc.A.aviso, /trapaceou/); }
    else { honesto++; assert.equal(arc.A.aviso, ''); }
  }
  assert.ok(trapaceou > 120 && honesto > 60, `${trapaceou} trapaças e ${honesto} rodadas honestas`);
  arc.novaPartidaArc(DIEGO);
  assert.equal(arc.A.lado.o.viu, null); assert.equal(arc.A.aviso, '');
});

test('salvar e carregar a partida', () => {
  arc.novaPartidaArc(DIEGO); arc.pararArc('p');
  const sv = arc.carregarArc();
  assert.equal(sv.rodada, arc.A.rodada); assert.deepEqual(sv.lado.p.cartas, arc.A.lado.p.cartas);
});

function jogadorAutomatico() {
  const l = arc.A.lado.p;
  if (Math.random() < 0.3) {
    const ok = l.esp.map((x, i) => i).filter(i => arc.podeAplicar('p', l.esp[i]));
    if (ok.length) { arc.usarEsp('p', ok[Math.floor(Math.random() * ok.length)]); return; }
  }
  const d = arc.dicaArc();
  if (d.acao === 'comprar' && arc.podeComprar('p')) arc.comprarArc('p'); else arc.pararArc('p');
}
function conferir(A) {
  const todas = [...A.baralho, ...A.lado.p.cartas, ...A.lado.o.cartas].sort((a, b) => a - b);
  assert.deepEqual(todas, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'o baralho sempre tem as 11 cartas');
  assert.ok(A.hp.p >= 0 && A.hp.p <= A.t.hp && A.hp.o >= 0 && A.hp.o <= A.t.hp);
  assert.ok([17, 21, 24].includes(A.alvo)); assert.ok(A.aposta >= 1);
  assert.ok(A.escudo.p >= 0 && A.escudo.o >= 0);
  assert.ok(A.lado.p.esp.length <= arc.MAX_ESP && A.lado.o.esp.length <= arc.MAX_ESP);
}
test('partidas completas contra todos os adversários terminam e respeitam as regras', { timeout: 120000 }, () => {
  const adversarios = [...ARC_OPPS, {id: 'caos', nome: 'Caos', pers: 'caotico', diff: 'dificil', hp: 10}];
  const tabela = [];
  for (const opp of adversarios) {
    let vitorias = 0, rodadas = 0;
    const N = 40;
    for (let m = 0; m < N; m++) {
      arc.novaPartidaArc(opp);
      let passos = 0;
      while (!arc.A.fim) {
        assert.ok(passos++ < 5000, 'partida travou contra ' + opp.nome);
        const A = arc.A;
        if (A.fase === 'resultado') { arc.proximaRodadaArc(); continue; }
        if (A.vez === 'p') jogadorAutomatico(); else assert.ok(arc.passoIA());
        conferir(arc.A);
      }
      if (arc.A.fim === 'vitoria') vitorias++;
      rodadas += arc.A.gs.rounds;
    }
    tabela.push(`${opp.nome.padEnd(6)} (${opp.pers.padEnd(13)}) vitórias do jogador ${String(Math.round(100 * vitorias / N)).padStart(3)}%, média ${(rodadas / N).toFixed(1)} rodadas`);
  }
  console.log('  ' + tabela.join('\n  '));
});
