// Motor das regras: mãos, apostas, potes, showdown, fim de partida e salvamento.
import { LS, SAVE_KEY, STATS_KEY, loadSave, settings, speedMul } from './armazenamento.js';
import { botAct, effId, labelOf } from './bots.js';
import { P5, best7, cardTxt, catName, makeDeck, shuffle } from './cartas.js';
import { BOT_NAMES, ORDER, PERS, PH, niceBlind, pickPers } from './config.js';
import { ui } from './estado.js';
import { ST, unlockAch } from './estatisticas.js';
import { render, show } from './interface.js';
import { sfx } from './som.js';
import { $, fmt } from './util.js';

export function saveGame(){
  if (!G) return;
  if (G.over || G.victory){ LS.del(SAVE_KEY); return; }
  LS.set(SAVE_KEY, Object.assign({}, G, {timer:null}));
}

export function resumeGame(){
  const sv = loadSave();
  if (!sv) return;
  G = sv; G.timer = null;
  ui.raising = false; ui.exiting = false;
  show('game');
  render();
  if (!G.ended) loop();
}

/* Ganchos opcionais: só os testes automáticos os usam */
export const ganchos = {};

export let G = null;

export function hlog(text){
  G.hist.push({h:G.hands, t:text});
  if (G.hist.length > 220) G.hist = G.hist.filter(x => x.h >= G.hands - 2);
}

export const totalPot = () => G.players.reduce((a,p) => a + p.total, 0);

export function commit(p, amt){
  amt = Math.max(0, Math.min(amt, p.stack));
  p.stack -= amt; p.bet += amt; p.total += amt;
  if (p.stack === 0) p.allIn = true;
}

export function later(fn, ms){
  const g = G;
  g.timer = setTimeout(() => { if (G === g) fn(); }, ms);
}

export function newGame(t){
  if (G) clearTimeout(G.timer);
  const n = t.players;
  const bots = Array.from({length: n - 1}, (_, k) => {
    const b = t.bots && t.bots[k];
    return b && b !== 'auto' ? b : pickPers(t.diff);
  });
  const sb0 = t.sb0 || t.sb, bb0 = t.bb0 || t.bb;
  const tt = Object.assign({}, t, {bots, sb:sb0, bb:bb0, sb0, bb0, rise:!!t.rise, every:t.every || 10});
  const mk = (name, human, pers) => ({name, human, pers, stack:t.buy, bet:0, total:0, folded:false, allIn:false, acted:false, cards:[], last:''});
  G = {
    t:tt,
    players:[mk('Você', true, null), ...bots.map((b, k) => mk(BOT_NAMES[k], false, b))],
    dealer:Math.floor(Math.random() * n),
    board:[], phase:'preflop', currentBet:0, minRaise:t.bb, toAct:0,
    ended:false, over:false, showdown:false, msg:'', won:null, timer:null,
    image:0, lastAggr:-1, hands:0, victory:false,
    ver:3, gid:Math.random().toString(36).slice(2), hist:[], finalAggr:-1, acts:[], notice:'', place:0, cheaters:0,
    practice:settings.practice, gs:{handsWon:0, biggest:0, bestVal:-1, minStack:t.buy},
    startPros:bots.filter(b => b === 'profissional').length, startN:n, train:null, achNew:[],
    stats:Array.from({length:n}, () => ({h:0, r:0}))
  };
  ui.exiting = false;
  show('game');
  startHand();
}

export function startHand(){
  clearTimeout(G.timer);
  G.hands++;
  /* Adversários sem fichas saem da mesa; o dealer passa para o próximo jogador que ficou */
  if (G.players.some(p => !p.human && p.stack <= 0)){
    const N0 = G.players.length;
    const keep = G.players.map(p => p.human || p.stack > 0);
    const map = []; let c = 0;
    keep.forEach((k, i) => { map[i] = k ? c++ : -1; });
    let d = G.dealer;
    while (map[d] < 0) d = (d - 1 + N0) % N0;
    G.dealer = map[d];
    G.players = G.players.filter((_, i) => keep[i]);
    G.stats = G.stats.filter((_, i) => keep[i]);
  }
  const N = G.players.length;
  /* Vingança dura algumas mãos; Mímicos escolhem quem imitar (trocam a cada 5 mãos ou quando o imitado sai) */
  G.players.forEach(p => {
    if (p.revenge){ p.revenge.hands--; if (p.revenge.hands <= 0) p.revenge = null; }
    if (p.pers !== 'mimico') return;
    const cands = G.players.filter(q => q !== p && !q.human && q.pers !== 'mimico');
    p.mimicHands = (p.mimicHands || 0) + 1;
    if (!cands.length){ p.mimicName = null; p.mimicOf = 'copiador'; p.mimicHands = 0; return; }
    if (!p.mimicName || !cands.some(q => q.name === p.mimicName) || p.mimicHands > 5){
      const pool = cands.filter(q => q.name !== p.mimicName);
      const from = pool.length ? pool : cands;
      const pick = from[Math.floor(Math.random() * from.length)];
      p.mimicName = pick.name; p.mimicOf = pick.pers; p.mimicHands = 1;
    }
  });
  G.dealer = (G.dealer + 1) % N;
  G.board = []; G.phase = 'preflop'; G.ended = false; G.showdown = false; G.msg = ''; G.won = null;
  G.image *= 0.85; G.lastAggr = -1; G.finalAggr = -1;
  G.stats.forEach(st => { st.h++; });
  G.notice = '';
  const addNote = t => { G.notice = G.notice ? G.notice + '\n' + t : t; };
  if (G.t.rise && G.hands > 1 && (G.hands - 1) % G.t.every === 0){
    const ratio = G.t.sb0 / G.t.bb0;
    G.t.bb = niceBlind(G.t.bb * 1.5);
    G.t.sb = Math.max(1, Math.round(G.t.bb * ratio));
    addNote('Os blinds subiram para ' + fmt(G.t.sb) + ' / ' + fmt(G.t.bb) + '.');
    sfx.blind();
  }
  ui.raising = false;
  G.deck = shuffle(makeDeck());
  G.players.forEach(p => {
    p.bet = 0; p.total = 0; p.folded = false; p.allIn = false; p.acted = false; p.last = '';
    p.show = false; p.aggr = false; p.registered = false; p.raised = false; p.locked = false;
    p.cards = [G.deck.pop(), G.deck.pop()];
  });
  G.acts = [];
  G.cheaters = 0;
  G.players.forEach((p, i) => {
    p.peek = null;
    if (p.human || !PERS[effId(p)].cheat) return;
    const others = G.players.filter((q, j) => j !== i);
    const t = others[Math.floor(Math.random() * others.length)];
    p.peek = {name:t.name, card:t.cards[Math.floor(Math.random() * 2)]};
    G.cheaters++;
  });
  if (G.cheaters) addNote(G.cheaters === 1 ? 'Um jogador trapaceou.' : G.cheaters + ' jogadores trapacearam.');
  sfx.deal();
  hlog('Botão: ' + G.players[G.dealer].name);
  if (G.notice) hlog(G.notice.replace(/\n/g, ' '));
  const sb = N === 2 ? G.dealer : (G.dealer + 1) % N;
  const bb = (sb + 1) % N;
  [[sb, G.t.sb], [bb, G.t.bb]].forEach(([i, amt]) => {
    const p = G.players[i];
    commit(p, amt);
    p.last = 'Blind ' + fmt(p.bet);
    hlog(p.name + ': Blind ' + fmt(p.bet));
  });
  G.currentBet = G.t.bb;
  G.minRaise = G.t.bb;
  G.toAct = (bb + 1) % N;
  render();
  loop();
}

export function nextToAct(start){
  const N = G.players.length;
  const can = G.players.filter(p => !p.folded && !p.allIn).length;
  for (let k = 0; k < N; k++){
    const i = (start + k) % N;
    const p = G.players[i];
    if (p.folded || p.allIn) continue;
    if (p.bet < G.currentBet) return i;
    if (can > 1 && !p.acted) return i;
  }
  return -1;
}

export function loop(){
  if (!G || G.ended) return;
  clearTimeout(G.timer);
  if (G.players.filter(p => !p.folded).length === 1) return finish();
  const i = nextToAct(G.toAct);
  if (i === -1) return advance();
  G.toAct = i;
  render();
  if (G.players[i].human){ sfx.turn(); return; }
  later(() => botAct(i), (G.players[0].folded ? 250 : 600 + Math.random() * 500) * speedMul());
}

export function next(i){
  if (ganchos.depoisDaAcao) ganchos.depoisDaAcao(i);
  ui.raising = false;
  G.toAct = (i + 1) % G.players.length;
  loop();
}

export function advance(){
  if (ganchos.fimDeRodada) ganchos.fimDeRodada();
  G.players.forEach(p => { p.bet = 0; p.acted = false; p.locked = false; if (!p.folded && !p.allIn) p.last = ''; });
  G.finalAggr = G.lastAggr;
  G.currentBet = 0; G.minRaise = G.t.bb; G.lastAggr = -1; G.acts = [];
  if (G.phase === 'river') return showdown();
  G.phase = ORDER[ORDER.indexOf(G.phase) + 1];
  const n = G.phase === 'flop' ? 3 : 1;
  for (let k = 0; k < n; k++) G.board.push(G.deck.pop());
  sfx.deal();
  hlog(PH[G.phase] + ': ' + G.board.map(cardTxt).join(' '));
  G.toAct = (G.dealer + 1) % G.players.length;
  const can = G.players.filter(p => !p.folded && !p.allIn).length;
  render();
  if (can < 2){ G.runout = true; later(advance, 1100 * speedMul()); }
  else { G.runout = false; loop(); }
}

export function doFold(i){
  const p = G.players[i];
  p.folded = true; p.acted = true; p.last = 'Desistiu';
  G.acts.push({i, t:'fold'}); sfx.fold();
  hlog(p.name + ': ' + p.last);
  next(i);
}

export function doCall(i){
  const p = G.players[i];
  const amt = Math.min(G.currentBet - p.bet, p.stack);
  commit(p, amt);
  p.acted = true;
  p.last = amt === 0 ? 'Passou' : (p.allIn ? 'All-in ' + fmt(p.bet) : 'Pagou ' + fmt(amt));
  G.acts.push({i, t:amt === 0 ? 'check' : 'call'}); if (amt > 0) sfx.chip();
  hlog(p.name + ': ' + p.last);
  next(i);
}

export function doRaise(i, to){
  if (ganchos.antesDeAumentar) ganchos.antesDeAumentar(i, to);
  const p = G.players[i];
  const wasBet = G.currentBet === 0;
  to = Math.min(Math.round(to), p.bet + p.stack);
  const raiseBy = to - G.currentBet;
  commit(p, to - p.bet);
  if (raiseBy >= G.minRaise){
    G.minRaise = raiseBy;
    G.players.forEach((q, j) => { if (j !== i && !q.folded && !q.allIn) q.acted = false; q.locked = false; });
  } else if (raiseBy > 0){
    /* all-in menor que o aumento mínimo: quem já tinha agido só pode pagar ou desistir */
    G.players.forEach((q, j) => { if (j !== i && !q.folded && !q.allIn && q.acted) q.locked = true; });
  }
  if (to > G.currentBet) G.currentBet = to;
  p.acted = true;
  G.lastAggr = i;
  if (!p.raised){ p.raised = true; G.stats[i].r++; }
  if (p.human) p.aggr = true;
  p.last = p.allIn ? 'All-in ' + fmt(p.bet) : (wasBet ? 'Apostou ' + fmt(to) : 'Aumentou para ' + fmt(to));
  G.acts.push({i, t:'raise'}); sfx.chip();
  hlog(p.name + ': ' + p.last);
  next(i);
}

export function weakHand(){
  const me = G.players[0];
  if (G.board.length >= 3) return Math.floor(best7(me.cards.concat(G.board)) / P5) === 0;
  return me.cards[0].r !== me.cards[1].r && Math.max(me.cards[0].r, me.cards[1].r) < 11;
}

/* Registra a partida concluída (vitória ou derrota). Partidas abandonadas nunca chegam aqui. */
export function commitGame(win){
  const gs = G.gs, buy = G.t.buy, final = G.players[0].stack;
  ST.games++;
  if (win){ ST.wins++; ST.streak++; ST.bestStreak = Math.max(ST.bestStreak, ST.streak); }
  else { ST.losses++; ST.streak = 0; }
  ST.chipsWon += Math.max(0, final - buy);
  ST.chipsLost += Math.max(0, buy - final);
  ST.hands += G.hands; ST.handsWon += gs.handsWon;
  ST.biggest = Math.max(ST.biggest, gs.biggest);
  if (gs.bestVal > ST.bestVal) ST.bestVal = gs.bestVal;
  const d = ST.byDiff[G.t.diff]; d.g++; if (win) d.w++;
  ST.placeSum += G.place; ST.placeGames++;
  let names = [];
  if (!G.practice) names = unlockAch('game', {win, diff:G.t.diff, pros:G.startPros, startN:G.startN, minStack:gs.minStack, buy});
  LS.set(STATS_KEY, ST);
  return names;
}

export function endHand(msg, won){
  if (ganchos.fimDeMao) ganchos.fimDeMao(won);
  G.ended = true; G.won = won; ui.raising = false;
  const ps = G.players, me = ps[0], gs = G.gs;

  /* Colocações de quem ficou sem fichas nesta mão (quem tinha mais fichas antes fica na frente) */
  const alive = ps.filter(p => p.stack > 0).length;
  const busted = ps.filter(p => p.stack <= 0).sort((a, b) => b.total - a.total);
  busted.forEach((p, k) => { p.place = alive + 1 + k; });
  const gone = busted.filter(p => !p.human);
  if (gone.length === 1) msg += '\n' + gone[0].name + ' (' + labelOf(gone[0]) + ') saiu da mesa em ' + gone[0].place + 'º lugar.';
  else if (gone.length > 1) msg += '\nSaíram da mesa: ' + gone.map(p => p.name + ' (' + labelOf(p) + ') em ' + p.place + 'º').join(', ') + '.';

  /* Vingativo: perdeu muitas fichas para alguém nesta mão */
  ps.forEach((p, idx) => {
    if (p.human || p.stack <= 0 || !PERS[effId(p)].revenge) return;
    if (p.total - won[idx] >= 0.25 * G.t.buy){
      let w = -1, best = 0;
      won.forEach((v, j) => { if (j !== idx && v > best){ best = v; w = j; } });
      if (w >= 0) p.revenge = {name:ps[w].name, hands:6};
    }
  });

  if (won[0] > 0){ gs.handsWon++; gs.biggest = Math.max(gs.biggest, won[0]); }
  gs.minStack = Math.min(gs.minStack, me.stack);
  let cat = -1;
  if (G.showdown && !me.folded){ gs.bestVal = Math.max(gs.bestVal, me.eval); cat = Math.floor(me.eval / P5); }
  let fresh = [];
  if (!G.practice){
    const bluff = !G.showdown && won[0] > 0 && me.aggr && weakHand();
    fresh = unlockAch('hand', {won:won[0] > 0, wonAmt:won[0], showdown:G.showdown, cat, allIn:me.allIn, bluff, buy:G.t.buy});
  }
  if (me.stack <= 0){ G.over = true; G.place = me.place; }
  else if (ps.every(p => p.human || p.stack <= 0)){ G.victory = true; G.place = 1; }
  if (G.over || G.victory) fresh = fresh.concat(commitGame(G.victory));
  fresh.forEach(n => { msg += '\nConquista desbloqueada: ' + n; });
  G.achNew = G.achNew.concat(fresh);
  G.msg = msg;
  msg.split('\n').forEach(l => hlog(l));
  if (G.victory){ sfx.victory(); }
  else if (G.over){ sfx.lose(); }
  else if (fresh.length){ sfx.ach(); }
  else if (won[0] > 0){ sfx.win(); }
  render();
}

export function showEnd(){
  const n = G.t.players - 1, h = G.hands;
  const maos = h + ' ' + (h === 1 ? 'mão' : 'mãos');
  if (G.victory){
    $('winTitle').textContent = 'Vitória';
    $('winText').textContent = `Você terminou em 1º lugar na Mesa ${fmt(G.t.buy)}, eliminando ${n} ${n === 1 ? 'adversário' : 'adversários'} em ${maos}.`;
  } else {
    $('winTitle').textContent = 'Derrota';
    $('winText').textContent = `Você terminou em ${G.place}º lugar de ${G.startN} na Mesa ${fmt(G.t.buy)}, depois de ${maos}.`;
  }
  $('winAch').textContent = G.achNew.length ? 'Conquistas desbloqueadas: ' + G.achNew.join(', ') + '.' : '';
  show('win');
}

export function finish(){
  const w = G.players.findIndex(p => !p.folded);
  const amt = totalPot();
  G.players[w].stack += amt;
  const won = G.players.map(() => 0); won[w] = amt;
  G.showdown = false;
  endHand((w === 0 ? 'Você ganhou ' : G.players[w].name + ' ganhou ') + fmt(amt), won);
}

/* Mostrar cartas revela a leitura do seu jogo: blefes vistos fazem os adversários pagarem mais */
export function registerShow(){
  const me = G.players[0];
  if (me.registered) return;
  me.registered = true;
  if (!me.aggr) return;
  let weak;
  if (G.board.length >= 3) weak = Math.floor(best7(me.cards.concat(G.board)) / P5) <= 1;
  else weak = me.cards[0].r !== me.cards[1].r && Math.max(me.cards[0].r, me.cards[1].r) < 11;
  G.image = weak ? Math.min(1, G.image + 0.5) : Math.max(-1, G.image - 0.3);
}

export function buildPots(){
  const ps = G.players;
  const levels = [...new Set(ps.filter(p => !p.folded && p.total > 0).map(p => p.total))].sort((a,b) => a - b);
  const pots = [];
  let prev = 0;
  for (const lvl of levels){
    let amount = 0;
    ps.forEach(p => { amount += Math.min(p.total, lvl) - Math.min(p.total, prev); });
    const eligible = [];
    ps.forEach((p, i) => { if (!p.folded && p.total >= lvl) eligible.push(i); });
    pots.push({amount, eligible});
    prev = lvl;
  }
  const sum = ps.reduce((a, p) => a + p.total, 0);
  const alloc = pots.reduce((a, p) => a + p.amount, 0);
  if (pots.length && sum > alloc) pots[pots.length - 1].amount += sum - alloc;
  return pots;
}

export function showdown(){
  const ps = G.players;
  G.showdown = true;
  ps.forEach(p => { if (!p.folded) p.eval = best7(p.cards.concat(G.board)); });
  const won = ps.map(() => 0);
  buildPots().forEach(pot => {
    let best = -1;
    pot.eligible.forEach(i => { best = Math.max(best, ps[i].eval); });
    const w = pot.eligible.filter(i => ps[i].eval === best);
    const share = Math.floor(pot.amount / w.length);
    w.forEach(i => { won[i] += share; });
    const NP = ps.length;
    const seq = w.slice().sort((a, b) => ((a - G.dealer - 1 + NP) % NP) - ((b - G.dealer - 1 + NP) % NP));
    for (let k = 0, rem = pot.amount - share * w.length; k < rem; k++) won[seq[k]]++;
  });
  won.forEach((v, i) => { ps[i].stack += v; });
  const NS = ps.length;
  const allInShow = ps.some(p => !p.folded && p.allIn);
  const startAt = G.finalAggr >= 0 && !ps[G.finalAggr].folded ? G.finalAggr : (G.dealer + 1) % NS;
  const forced = new Set();
  let bestSeen = -1;
  for (let k = 0; k < NS; k++){
    const i = (startAt + k) % NS;
    if (ps[i].folded) continue;
    if (allInShow || bestSeen < 0 || ps[i].eval >= bestSeen){ forced.add(i); bestSeen = Math.max(bestSeen, ps[i].eval); }
  }
  ps.forEach((p, i) => {
    if (p.folded) return;
    p.show = won[i] > 0 || forced.has(i);
    if (i > 0) p.last = p.show ? catName(p.eval) : 'Muck';
    hlog(p.name + ': ' + (p.show || i === 0 ? p.cards.map(cardTxt).join(' ') + ', ' + catName(p.eval) + (p.show ? '' : ' (muck)') : 'mão não revelada (muck)'));
  });
  if (ps[0].show) registerShow();
  const winners = won.map((v, i) => i).filter(i => won[i] > 0);
  const nm = i => i === 0 ? 'Você' : ps[i].name;
  let msg;
  if (winners.length === 1){
    const i = winners[0];
    msg = (i === 0 ? 'Você ganhou ' : ps[i].name + ' ganhou ') + fmt(won[i]) + ' com ' + catName(ps[i].eval);
  } else {
    msg = 'Ganhos: ' + winners.map(i => nm(i) + ' +' + fmt(won[i])).join(', ');
  }
  if (allInShow && ps.filter(p => !p.folded).length > 1) msg += '\nAll-in: as cartas foram reveladas.';
  endHand(msg, won);
}

/* Fecha a partida atual (sem apagar o salvamento) */
export function encerrarPartida(){
  if (G) clearTimeout(G.timer);
  G = null;
}
