import test from 'node:test';
import assert from 'node:assert/strict';
import { elementos, timers, store, clique } from './_ajuda.js';
import * as bj from '../js/blackjack.js';
import * as arc from '../js/arcade.js';

const estat = () => JSON.parse(store['poker.stats.v1'] || '{}');

test('início, menu do blackjack e listas dos dois modos', () => {
  clique('home');
  assert.equal(elementos.home.hidden, false);
  clique('gbj');
  assert.equal(elementos.bjmenu.hidden, false);
  assert.match(elementos.bjlist.innerHTML, /Mesa 50/); assert.match(elementos.bjlist.innerHTML, /Meta/);
  clique('bjtab', {t: 'arcade'});
  assert.match(elementos.bjlist.innerHTML, /Ana/); assert.match(elementos.bjlist.innerHTML, /Karen/);
  clique('bjtab', {t: 'classico'});
});

test('blackjack clássico: jogar uma partida inteira pelos botões, continuar e substituir', () => {
  clique('bjmesa', {i: 0});
  assert.equal(elementos.bj.hidden, false);
  assert.match(elementos.bjActions.innerHTML, /bjSlider/);
  let g = 0;
  while (!bj.B.fimDeJogo && g++ < 6000) {
    if (bj.B.fase === 'aposta') { clique('bjmin'); clique('bjbet'); }
    else if (bj.B.fase === 'jogo') clique(g % 3 === 0 ? 'bjhit' : 'bjstand');
    else clique('bjnext');
  }
  assert.ok(bj.B.fimDeJogo, 'a partida terminou');
  assert.match(elementos.bjActions.innerHTML, /Continuar/);
  clique('bjfim');
  assert.equal(elementos.fim21.hidden, false);
  assert.match(elementos.fimTitulo.textContent, /Vitória|Derrota/);
  clique('again21');
  assert.equal(bj.B.rodada, 0); assert.equal(bj.B.chips, bj.B.t.buy);
  clique('bjmin'); clique('bjbet');
  clique('bjexit'); assert.match(elementos.bjActions.innerHTML, /Sair da mesa/);
  clique('bjstay'); clique('bjexit'); clique('bjleave');
  assert.equal(elementos.bjmenu.hidden, false); assert.match(elementos.bjlist.innerHTML, /Continuar partida/);
  clique('bjmesa', {i: 1});
  assert.equal(elementos.modal.hidden, false, 'pergunta antes de substituir');
  clique('mno'); assert.equal(elementos.modal.hidden, true);
  clique('bjresume'); assert.equal(elementos.bj.hidden, false); assert.equal(bj.B.t.buy, 50);
  clique('bjexit'); clique('bjleave');
});

test('blackjack arcade: duelo inteiro pelos botões, com cartas especiais', () => {
  clique('bjtab', {t: 'arcade'});
  clique('arcopp', {i: 0});
  if (elementos.modal.hidden === false) clique('myes');
  assert.equal(elementos.arc.hidden, false);
  assert.match(elementos.arcEsp.innerHTML, /espgrid/);
  let g = 0;
  while (!arc.A.fim && g++ < 8000) {
    const A = arc.A;
    if (A.fase === 'resultado') clique('arcnext');
    else if (A.vez === 'p') {
      if (A.lado.p.esp.length && g % 2 === 0) clique('arcuse', {k: 0});
      if (arc.A.vez === 'p') clique(arc.soma(arc.A.lado.p.cartas) < 15 && arc.podeComprar('p') ? 'arcdraw' : 'arcstand');
    } else if (timers.length) timers.shift().f();
    else break;
  }
  assert.ok(arc.A.fim, 'o duelo terminou');
  assert.match(elementos.arcActions.innerHTML, /Continuar/);
  clique('arcfim');
  assert.equal(elementos.fim21.hidden, false);
  assert.match(elementos.fimTitulo.textContent, /Vitória|Derrota/);
  clique('menu21');
  assert.equal(elementos.bjmenu.hidden, false);
});

test('estatísticas e conquistas mostram poker, blackjack e arcade', () => {
  clique('home'); clique('stats');
  assert.match(elementos.stBJ.innerHTML, /Partidas jogadas/); assert.match(elementos.stArc.innerHTML, /Cartas especiais usadas/);
  const s = estat();
  assert.ok(s.bj.games >= 1 && s.arc.games >= 1, 'as partidas concluídas foram contadas');
  clique('mback'); clique('ach');
  assert.match(elementos.achBox.innerHTML, /Blackjack clássico/); assert.match(elementos.achBox.innerHTML, /Blackjack arcade/);
  clique('mback'); assert.equal(elementos.home.hidden, false);
});

test('modo treino no blackjack e no arcade: mostra dicas e não dá conquistas', () => {
  clique('opts'); clique('otrain');
  const antes = Object.keys(estat().ach).length;
  clique('mback'); clique('gbj'); clique('bjtab', {t: 'classico'});
  clique('bjmesa', {i: 0}); if (elementos.modal.hidden === false) clique('myes');
  clique('bjmin'); clique('bjbet');
  if (bj.B.fase === 'jogo') assert.match(elementos.bjTrain.innerHTML, /Sugestão/);
  clique('bjexit'); clique('bjleave');
  clique('bjtab', {t: 'arcade'}); clique('arcopp', {i: 3}); if (elementos.modal.hidden === false) clique('myes');
  assert.match(elementos.arcTrain.innerHTML, /Sugestão/);
  assert.match(elementos.arcOpp.innerHTML, /\(/, 'mostra a personalidade no treino');
  clique('arcexit'); clique('arcleave');
  assert.equal(Object.keys(estat().ach).length, antes);
  clique('home'); clique('opts'); clique('otrain');
});
