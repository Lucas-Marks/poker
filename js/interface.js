// Desenho das telas e do modo treino.
import { loadSave, settings } from './armazenamento.js';
import { persLabel } from './bots.js';
import { SUIT, best7, catName, equity, rk } from './cartas.js';
import { DIFF, DIFF_IDS, PH, TABLES, THEMES } from './config.js';
import { anim, ui } from './estado.js';
import { ACH, ST } from './estatisticas.js';
import { G, next, saveGame, totalPot } from './jogo.js';
import { $, clamp, esc, fmt } from './util.js';

export function applyTheme(id){
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute('data-theme', t.id);
  const m = typeof document.querySelector === 'function' ? document.querySelector('meta[name="theme-color"]') : null;
  if (m) m.setAttribute('content', t.color);
}

/* Modo treino: chance de ganhar e sugestão para a sua jogada */
export function advise(){
  const me = G.players[0];
  const toCall = G.currentBet - me.bet;
  const nOpp = G.players.filter((q, j) => j > 0 && !q.folded).length;
  const key = [G.hands, G.phase, G.board.length, G.currentBet, me.bet, nOpp].join('|');
  if (G.train && G.train.key === key) return G.train;
  const sims = Math.max(120, Math.round(300 * Math.min(1, 5 / (nOpp + 1))));
  const eq = equity(me.cards, G.board, nOpp, sims);
  const odds = toCall / (totalPot() + toCall || 1);
  const str = eq * (nOpp + 1);
  let sug;
  if (toCall === 0) sug = str > 1.7 ? 'Apostar' : 'Passar';
  else if (eq > odds + 0.05) sug = str > 1.9 && !me.locked ? 'Aumentar' : (toCall >= me.stack ? 'Pagar tudo' : 'Pagar');
  else sug = 'Desistir';
  G.train = {key, eq, odds, toCall, sug};
  return G.train;
}

export function trainHTML(){
  if (!G.practice) return '';
  const me = G.players[0];
  if (G.ended) return '<div class="tr">&nbsp;</div>';
  if (me.folded || me.allIn || G.toAct !== 0) return '<div class="tr dim">Treino: aguarde a sua vez</div>';
  const a = advise();
  return `<div class="tr"><span>Chance ${Math.round(a.eq * 100)}%</span>${a.toCall > 0 ? `<span>Precisa ${Math.round(a.odds * 100)}%</span>` : '<span>Sem custo</span>'}<span>Sugestão: ${a.sug}</span></div>`;
}

export function renderStats(){
  const S = ST;
  const rate = S.games ? Math.round(100 * S.wins / S.games) + '%' : '—';
  const net = S.chipsWon - S.chipsLost;
  const rows = [
    ['Partidas jogadas', S.games], ['Vitórias', S.wins], ['Derrotas', S.losses], ['Taxa de vitória', rate],
    ['Fichas ganhas', fmt(S.chipsWon)], ['Fichas perdidas', fmt(S.chipsLost)], ['Saldo de fichas', (net > 0 ? '+' : '') + fmt(net)],
    ['Mãos jogadas', fmt(S.hands)], ['Mãos ganhas', fmt(S.handsWon)], ['Maior pote ganho', fmt(S.biggest)],
    ['Melhor mão', S.bestVal >= 0 ? catName(S.bestVal) : '—'], ['Sequência de vitórias', S.streak], ['Melhor sequência', S.bestStreak],
    ['Colocação média', S.placeGames ? (S.placeSum / S.placeGames).toFixed(1).replace('.', ',') + 'º' : '—']
  ];
  $('stBox').innerHTML = rows.map(r => `<div class="field stat"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
  const bj = S.bj, bjRate = bj.games ? Math.round(100 * bj.wins / bj.games) + '%' : '—', bjNet = bj.chipsWon - bj.chipsLost;
  const linhas = rs => rs.map(r => `<div class="field stat"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
  $('stBJ').innerHTML = linhas([
    ['Partidas jogadas', bj.games], ['Metas batidas', bj.wins], ['Derrotas', bj.losses], ['Taxa de vitória', bjRate],
    ['Fichas ganhas', fmt(bj.chipsWon)], ['Fichas perdidas', fmt(bj.chipsLost)], ['Saldo de fichas', (bjNet > 0 ? '+' : '') + fmt(bjNet)],
    ['Rodadas jogadas', fmt(bj.rounds)], ['Rodadas ganhas', fmt(bj.roundsWon)], ['Blackjacks', bj.blackjacks],
    ['Maior ganho numa rodada', fmt(bj.biggest)], ['Melhor sequência de rodadas', bj.bestStreak]]);
  const ar = S.arc, arRate = ar.games ? Math.round(100 * ar.wins / ar.games) + '%' : '—';
  $('stArc').innerHTML = linhas([
    ['Partidas jogadas', ar.games], ['Vitórias', ar.wins], ['Derrotas', ar.losses], ['Taxa de vitória', arRate],
    ['Rodadas jogadas', fmt(ar.rounds)], ['Rodadas ganhas', fmt(ar.roundsWon)], ['Cartas especiais usadas', fmt(ar.trumps)]]);
  $('stDiff').innerHTML = DIFF_IDS.map(d => {
    const x = S.byDiff[d];
    return `<div class="field stat"><span class="c-${d}">${DIFF[d].label}</span><span>${x.w} ${x.w === 1 ? 'vitória' : 'vitórias'} em ${x.g}</span></div>`;
  }).join('');
}

export function renderAch(){
  const n = ACH.filter(a => ST.ach[a.id]).length;
  $('achCount').textContent = n + ' de ' + ACH.length + ' conquistas';
  const linha = a => {
    const ok = !!ST.ach[a.id];
    return `<div class="field ach${ok ? '' : ' lock'}"><span class="al"><span class="an">${a.name}</span><span class="ad">${a.desc}</span></span><span class="as${ok ? '' : ' dim'}">${ok ? 'Concluída' : 'Bloqueada'}</span></div>`;
  };
  const grupos = [['poker', 'Poker'], ['bj', 'Blackjack clássico'], ['arc', 'Blackjack arcade']];
  $('achBox').innerHTML = grupos.map(([m, titulo]) => {
    const lista = ACH.filter(a => (a.modo || 'poker') === m);
    return `<p class="small dim">${titulo} (${lista.filter(a => ST.ach[a.id]).length} de ${lista.length})</p><div class="box">${lista.map(linha).join('')}</div>`;
  }).join('');
}

export function renderOpts(){
  $('oTrain').textContent = settings.practice ? 'Ligado' : 'Desligado';
  $('oTrain').className = settings.practice ? '' : 'dim';
  $('oTheme').value = settings.theme;
  $('oSpeed').textContent = {lenta:'Lenta', normal:'Normal', rapida:'Rápida'}[settings.speed] || 'Normal';
  $('oSound').textContent = settings.sound ? 'Ligado' : 'Desligado';
  $('oSound').className = settings.sound ? '' : 'dim';
  $('oResetT').textContent = ui.confirmReset ? 'Toque de novo para apagar tudo' : 'Zerar estatísticas e conquistas';
}

export function renderMenu(){
  const sv = loadSave();
  const cont = sv ? `<button class="opt" data-a="resume">
    <span class="ol"><span class="on">Continuar partida</span><span class="od c-${sv.t.diff}">${DIFF[sv.t.diff].label}${sv.practice ? ' (treino)' : ''}</span></span>
    <span class="or"><span class="ob">Mesa ${fmt(sv.t.buy)}, mão ${sv.hands}</span><span class="op">${sv.players.length} jogadores</span></span>
  </button>` : '';
  $('tables').innerHTML = cont + TABLES.map((t, i) =>
    `<button class="opt" data-a="table" data-i="${i}">
      <span class="ol"><span class="on">Mesa ${fmt(t.buy)}</span><span class="od c-${t.diff}">${DIFF[t.diff].label}</span></span>
      <span class="or"><span class="ob">Blinds ${fmt(t.sb)} / ${fmt(t.bb)}</span><span class="op">${t.players} jogadores</span></span>
    </button>`
  ).join('') + `<button class="opt" data-a="custom">
      <span class="ol"><span class="on">Personalizada</span><span class="od dim">Você escolhe tudo</span></span>
      <span class="or"><span class="ob">Presets</span><span class="op">2 a 8 jogadores</span></span>
    </button>`;
}

export function isNew(key){
  key = G.gid + '|' + key;
  if (anim.seen.has(key)) return false;
  anim.pending.add(key);
  return true;
}

export function flushAnim(){
  if (!anim.pending.size || (anim.timer && Date.now() - anim.t0 < 1000)) return;
  anim.t0 = Date.now();
  anim.timer = setTimeout(() => {
    anim.pending.forEach(k => anim.seen.add(k));
    anim.pending.clear(); anim.timer = null;
    const it = anim.seen.values();
    while (anim.seen.size > 300) anim.seen.delete(it.next().value);
  }, 450);
}

export function pulseEl(el, cls){
  if (!el || !el.classList) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}

export function renderHist(){
  const hs = [...new Set(G.hist.map(x => x.h))].sort((a, b) => b - a);
  $('hBody').innerHTML = hs.length
    ? hs.map(h => `<div class="hh"><div class="hn2">Mão ${h}</div>` + G.hist.filter(x => x.h === h).map(x => `<div class="hl">${esc(x.t)}</div>`).join('') + '</div>').join('')
    : '<div class="note">Ainda sem jogadas.</div>';
}

export function guardNew(fn){
  if (loadSave()){
    ui.pendingStart = fn;
    $('mText').textContent = 'Você tem uma partida salva. Começar outra substitui a partida salva.';
    $('modal').hidden = false;
  } else fn();
}

export function show(name){
  ['home','menu','custom','win','game','stats','ach','opts','help','bjmenu','bj','arc','fim21'].forEach(n => { $(n).hidden = n !== name; });
  if (name === 'menu') renderMenu();
}

export function cardHTML(c, size, extra, delay){
  const ex = extra ? ' ' + extra : '';
  const st = extra && delay ? ` style="animation-delay:${delay}ms"` : '';
  if (!c) return `<div class="card ${size} empty"></div>`;
  if (c === 'b') return `<div class="card ${size} back"></div>`;
  const red = (c.s === 1 || c.s === 2) ? ' red' : '';
  return `<div class="card ${size}${red}${ex}"${st}><b>${rk(c.r)}</b><i>${SUIT[c.s]}</i></div>`;
}

export function raiseRange(){
  const me = G.players[0];
  const max = me.bet + me.stack;
  let min = G.currentBet === 0 ? G.t.bb : G.currentBet + G.minRaise;
  if (min > max) min = max;
  return {min, max};
}

export function render(){
  if (!G) return;
  const ps = G.players;
  $('tinfo').innerHTML = `<span>Mesa ${fmt(G.t.buy)}</span><span class="c-${G.t.diff}">${DIFF[G.t.diff].label}</span><span class="dim">Blinds ${fmt(G.t.sb)} / ${fmt(G.t.bb)}</span>${G.practice ? '<span>Treino</span>' : ''}`;

  const opps = ps.slice(1);
  const dense = opps.length > 3;
  const oel = $('opps');
  oel.className = 'opps' + (dense ? ' dense' : '');
  oel.style.setProperty('--c', dense ? Math.ceil(opps.length / 2) : opps.length);
  oel.innerHTML = opps.map((p, k) => {
    const i = k + 1;
    const cls = ['opp'];
    if (p.folded) cls.push('fold');
    if (G.toAct === i && !G.ended) cls.push('turn');
    if (G.ended && G.won && G.won[i] > 0) cls.push('win');
    let cards = '';
    if (G.showdown && !p.folded) cards = p.show ? p.cards.map(c => cardHTML(c, 'sm')).join('') : '';
    else if (!p.folded && !dense) cards = cardHTML('b', 'sm') + cardHTML('b', 'sm');
    const cardsRow = (cards || !dense) ? `<div class="ocards">${cards}</div>` : '';
    return `<div class="${cls.join(' ')}">
      <div class="oname">${p.name}${G.dealer === i ? '<span class="dealer">D</span>' : ''}</div>
      ${G.practice ? `<div class="oper">${persLabel(p)}</div>` : ''}
      <div class="ostack">${fmt(p.stack)}</div>
      ${cardsRow}
      <div class="olast${p.last && isNew('l-' + p.name + '-' + G.hands + '-' + p.last) ? ' chg' : ''}">${p.last || '&nbsp;'}</div>
    </div>`;
  }).join('');

  $('phase').textContent = G.ended ? 'Mão encerrada' : PH[G.phase];
  const potTxt = G.ended ? '' : 'Pote ' + fmt(totalPot());
  $('pot').textContent = potTxt;
  if (anim.pot !== potTxt){ anim.pot = potTxt; if (potTxt) pulseEl($('pot'), 'pop'); }
  $('board').innerHTML = [0,1,2,3,4].map(i => cardHTML(G.board[i] || null, 'md', G.board[i] && isNew('b' + i + '-' + G.hands) ? 'new' : '', i < 3 ? i * 90 : 0)).join('');
  const msgTxt = G.ended ? G.msg : (G.notice || '');
  $('msg').textContent = msgTxt;
  if (anim.msg !== msgTxt){ anim.msg = msgTxt; if (msgTxt) pulseEl($('msg'), 'fadein'); }

  const me = ps[0];
  const meEl = $('me');
  meEl.className = 'me' + (me.folded ? ' fold' : '') + (G.ended && G.won && G.won[0] > 0 ? ' win' : '');
  let hn = '';
  if (G.board.length >= 3 && !me.folded) hn = catName(best7(me.cards.concat(G.board)));
  else if (me.last && !G.ended) hn = me.last;
  if (G.ended && !me.folded) hn = G.showdown ? (me.show ? 'Cartas mostradas' : 'Muck') : (me.show ? 'Cartas mostradas' : 'Cartas ocultas');
  meEl.innerHTML = `
    <div class="mrow"><div class="oname">Você${G.dealer === 0 ? '<span class="dealer">D</span>' : ''}</div><div class="ostack">${fmt(me.stack)}</div></div>
    <div class="mcards">${me.cards.map((c, k) => cardHTML(c, 'lg', isNew('h' + k + '-' + G.hands) ? 'new' : '', k * 120)).join('')}</div>
    <div class="hn">${hn || '&nbsp;'}</div>
    ${trainHTML()}`;

  flushAnim();
  renderActions();
  saveGame();
}

export function renderActions(){
  const el = $('actions');
  const me = G.players[0];
  if (ui.exiting && !G.over){
    el.innerHTML = `<div class="note">Sair da mesa? A partida fica salva e você pode continuar depois pelo menu.</div>
      <div class="row"><button data-a="stay">Continuar jogando</button><button data-a="menu">Sair</button></div>`;
    return;
  }
  if (G.over){
    el.innerHTML = `<div class="note">Suas fichas acabaram. Você ficou em ${G.place}º lugar.</div>
      <div class="row"><button data-a="win">Continuar</button></div>`;
    return;
  }
  if (G.ended && G.victory){
    el.innerHTML = `<div class="note">Todos os adversários foram eliminados.</div>
      <div class="row"><button data-a="win">Continuar</button></div>`;
    return;
  }
  if (G.ended){
    const canShow = !me.folded && !me.show;
    el.innerHTML = `<div class="row">${canShow ? '<button data-a="show">Mostrar cartas</button>' : ''}<button data-a="next">Próxima mão</button></div>`;
    return;
  }
  if (G.toAct !== 0 || me.folded || me.allIn){
    let t;
    if (me.folded) t = 'Você desistiu. Aguarde o fim da mão.';
    else if (me.allIn || G.runout) t = 'Distribuindo as cartas…';
    else t = 'Vez de ' + G.players[G.toAct].name + '…';
    el.innerHTML = `<div class="note">${t}</div>`;
    return;
  }
  const toCall = G.currentBet - me.bet;
  const others = G.players.some((p, j) => j !== 0 && !p.folded && !p.allIn);
  const canRaise = me.stack > toCall && others && !me.locked;
  const callLabel = toCall === 0 ? 'Passar' : (toCall >= me.stack ? `Pagar tudo (${fmt(me.stack)})` : `Pagar ${fmt(toCall)}`);

  if (ui.raising && canRaise){
    const {min, max} = raiseRange();
    ui.val = clamp(ui.val, min, max);
    el.innerHTML = `
      <div class="rz">
        <div class="rz-top"><span class="dim">${G.currentBet === 0 ? 'Apostar' : 'Aumentar para'}</span><strong id="rv">${fmt(ui.val)}</strong></div>
        <input id="slider" type="range" min="${min}" max="${max}" step="${Math.max(1, Math.min(G.t.sb, max - min))}" value="${ui.val}" ${min === max ? 'disabled' : ''} aria-label="Valor">
      </div>
      <div class="row"><button data-a="pre" data-p="0.5">½ pote</button><button data-a="pre" data-p="1">Pote</button><button data-a="allin">All-in</button></div>
      <div class="row"><button data-a="cancel">Voltar</button><button data-a="confirm">Confirmar</button></div>`;
    return;
  }
  ui.raising = false;
  el.innerHTML = `<div class="row">
    ${toCall > 0 ? '<button data-a="fold">Desistir</button>' : ''}
    <button data-a="call">${callLabel}</button>
    ${canRaise ? `<button data-a="open">${G.currentBet === 0 ? 'Apostar' : 'Aumentar'}</button>` : ''}
  </div>`;
}
