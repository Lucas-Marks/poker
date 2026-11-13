import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { elementos, timers, store, raiz, clique, mudar, jogo, iniciarPersonalizada, iniciarMesa, jogar } from './_ajuda.js';

const estat = () => JSON.parse(store['poker.stats.v1'] || 'null') || {games: 0, wins: 0, losses: 0, chipsWon: 0, chipsLost: 0, ach: {}};

test('temas: os 7 temas aplicam e o último fica salvo', () => {
  clique('opts');
  const ids = ['escuro', 'claro', 'verde', 'vermelha', 'azul', 'roxa', 'dark'];
  for (const id of ids) { mudar('oTheme', id); assert.equal(raiz.attrs['data-theme'], id); }
  assert.equal(JSON.parse(store['poker.settings.v1']).theme, 'dark');
  const css = fs.readFileSync(new URL('../css/temas.css', import.meta.url), 'utf8');
  for (const id of ids.slice(1)) assert.ok(css.includes(`[data-theme="${id}"]`), 'CSS do tema ' + id);
  clique('menu');
});

test('a vibração foi removida', () => {
  for (const arq of ['../index.html', '../js/interface.js', '../js/jogo.js', '../js/main.js', '../js/armazenamento.js']) {
    assert.ok(!/vibra/i.test(fs.readFileSync(new URL(arq, import.meta.url), 'utf8')), arq);
  }
});

test('confirmação antes de substituir uma partida salva', () => {
  iniciarPersonalizada(4, ['novato', 'novato', 'novato'], 200);
  for (let k = 0; k < 6 && timers.length; k++) timers.shift().f();
  clique('exit'); clique('menu');
  assert.ok(store['poker.save.v1'], 'a partida foi salva');
  clique('table', {i: 0});
  assert.equal(elementos.modal.hidden, false); assert.equal(jogo.G, null);
  clique('mno');
  assert.equal(elementos.modal.hidden, true); assert.ok(store['poker.save.v1']);
  clique('table', {i: 0}); clique('myes');
  assert.ok(jogo.G); assert.equal(elementos.modal.hidden, true);
});

test('histórico da mão', () => {
  for (let k = 0; k < 12 && timers.length; k++) timers.shift().f();
  clique('hist');
  const h = elementos.hBody.innerHTML;
  assert.equal(elementos.hist.hidden, false);
  assert.match(h, /Mão 1/); assert.match(h, /Botão:/); assert.match(h, /Blind/);
  clique('hclose'); assert.equal(elementos.hist.hidden, true);
  clique('menu');
});

test('velocidade dos bots e tela de ajuda', () => {
  clique('opts');
  const seq = [];
  for (let k = 0; k < 3; k++) { clique('ospeed'); seq.push(elementos.oSpeed.textContent); }
  assert.deepEqual(seq, ['Rápida', 'Lenta', 'Normal']);
  function atraso(vel) {
    while (elementos.oSpeed.textContent !== vel) clique('ospeed');
    clique('menu'); iniciarPersonalizada(4, ['novato', 'novato', 'novato'], 200);
    let melhor = 0;
    for (let k = 0; k < 40; k++) {
      const bots = timers.filter(t => t.ms > 100);
      if (bots.length) { melhor = Math.max(...bots.map(t => t.ms)); break; }
      if (jogo.G.toAct === 0 && timers.length === 0) clique('call'); else if (timers.length) timers.shift().f();
    }
    clique('menu'); return melhor;
  }
  const rapido = atraso('Rápida'); clique('opts'); const lento = atraso('Lenta');
  assert.ok(rapido > 0 && rapido < 700 && lento > 1000, `${rapido} / ${lento}`);
  clique('opts'); while (elementos.oSpeed.textContent !== 'Normal') clique('ospeed');
  clique('menu'); clique('help'); assert.equal(elementos.help.hidden, false); clique('mback');
});

test('estatísticas, continuar partida e modo treino', { timeout: 120000 }, () => {
  const antes = estat();
  let venceu = 0, ganhas = 0, perdidas = 0;
  for (let k = 0; k < 6; k++) {
    const G = iniciarMesa(k % 3), buy = G.t.buy, n = G.players.length;
    const r = jogar(); assert.ok(r === 'vitoria' || r === 'derrota', r);
    if (r === 'vitoria') { venceu++; ganhas += (n - 1) * buy; } else perdidas += buy;
    clique('win'); clique('menu');
  }
  const depois = estat();
  assert.equal(depois.games - antes.games, 6);
  assert.equal(depois.wins - antes.wins, venceu);
  assert.equal(depois.chipsWon - antes.chipsWon, ganhas);
  assert.equal(depois.chipsLost - antes.chipsLost, perdidas);

  // abandonar não conta; retomar continua de onde parou
  const jogosAntes = estat().games;
  iniciarMesa(4); for (let k = 0; k < 20 && timers.length; k++) { if (jogo.G.toAct === 0 && timers.length === 0) break; timers.shift().f(); }
  const maos = jogo.G.hands;
  clique('exit'); clique('menu');
  assert.equal(estat().games, jogosAntes);
  clique('resume'); assert.equal(jogo.G.hands, maos);
  const fim = jogar(); assert.ok(fim === 'vitoria' || fim === 'derrota');
  assert.equal(estat().games, jogosAntes + 1);
  assert.equal(store['poker.save.v1'], undefined, 'o salvamento some quando a partida termina');
  clique('win'); clique('menu');

  // modo treino: mostra chances e não dá conquistas
  clique('opts'); clique('otrain');
  const conquistas = Object.keys(estat().ach).length; let viuTreino = false;
  for (let k = 0; k < 3; k++) { iniciarMesa(k); jogar(60000, () => { if (/Chance \d+%/.test(elementos.me.innerHTML)) viuTreino = true; }); clique('win'); clique('menu'); }
  assert.ok(viuTreino); assert.equal(Object.keys(estat().ach).length, conquistas);
});
