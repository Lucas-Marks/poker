// Decisões dos adversários e de cada personalidade.
import { equity } from './cartas.js';
import { PERS } from './config.js';
import { G, doCall, doFold, doRaise, totalPot } from './jogo.js';
import { clamp } from './util.js';

export function chaosAct(i, canRaise, toCall, pot){
  const p = G.players[i];
  const r = Math.random();
  if (toCall > 0 && r < 0.22) return doFold(i);
  if (canRaise && r > 0.62){
    let to;
    if (Math.random() < 0.12) to = p.bet + p.stack;
    else to = Math.min(G.currentBet + Math.max(G.minRaise, Math.round(pot * (0.2 + Math.random() * 1.3))), p.bet + p.stack);
    return doRaise(i, to);
  }
  return doCall(i);
}

export function effId(p){ return p.pers === 'mimico' ? (p.mimicOf || 'copiador') : p.pers; }

export const labelOf = p => p.pers === 'mimico' ? 'Mímico' : PERS[p.pers].label;

export const persLabel = p => p.pers === 'mimico' ? 'Mímico (' + PERS[p.mimicOf || 'copiador'].label + ')' : PERS[p.pers].label;

/* Caçador: o jogador (ainda na mão) com 30% ou menos das fichas iniciais da mesa */
export function huntTarget(i){
  let best = -1, low = Infinity;
  G.players.forEach((q, j) => {
    if (j === i || q.folded) return;
    const start = q.stack + q.total;
    if (start > 0 && start <= 0.3 * G.t.buy && start < low){ best = j; low = start; }
  });
  return best;
}

/* Vingativo: quem lhe tirou muitas fichas, enquanto a vingança durar e a pessoa estiver na mão */
export function revengeTarget(p){
  if (!p.revenge) return -1;
  const j = G.players.findIndex(q => q.name === p.revenge.name);
  return j >= 0 && !G.players[j].folded ? j : -1;
}

export function botAct(i){
  const p = G.players[i];
  let P = PERS[effId(p)];
  const toCall = G.currentBet - p.bet;
  const pot = totalPot();
  const nOpp = G.players.filter((q, j) => j !== i && !q.folded).length;
  const others = G.players.some((q, j) => j !== i && !q.folded && !q.allIn);
  const canRaise = p.stack > toCall && others && !p.locked;
  if (P.chaos || Math.random() < P.misplay) return chaosAct(i, canRaise, toCall, pot);

  let target = -1;
  if (P.hunt) target = huntTarget(i);
  else if (P.revenge) target = revengeTarget(p);
  if (target >= 0) P = Object.assign({}, P, {aggr:P.aggr * 1.7, bluff:P.bluff + 0.2, margin:P.margin - 0.05, size:[0.65, 1.2], chase:P.chase + 0.2});

  let peek = null;
  if (P.cheat && p.peek){
    const pj = G.players.findIndex(q => q.name === p.peek.name);
    if (pj >= 0 && pj !== i && !G.players[pj].folded) peek = p.peek.card;
  }

  const sims = Math.max(20, Math.round(P.sims * Math.min(1, 5 / (nOpp + 1))));
  let eq = equity(p.cards, G.board, nOpp, sims, peek);
  eq = Math.max(0, Math.min(1, eq + (Math.random() * 2 - 1) * P.noise));
  const str = eq * (nOpp + 1);
  const odds = toCall / (pot + toCall || 1);
  const r = Math.random();
  const vsHuman = (G.lastAggr === 0 && toCall > 0 ? G.image : 0) * P.adapt;
  let exploit = 0;
  const j = G.lastAggr;
  if (P.read && j >= 0 && j !== i && toCall > 0){
    const st = G.stats[j];
    if (st.h >= 8) exploit = clamp((st.r / st.h - 0.3) * P.read * 1.5, 0, 0.14);
  }
  if (target >= 0 && G.lastAggr === target && toCall > 0) exploit += 0.08;
  const sizeTo = frac => {
    if (frac === undefined) frac = P.size[0] + Math.random() * (P.size[1] - P.size[0]);
    const to = G.currentBet + Math.max(G.minRaise, Math.round((pot + toCall) * frac));
    return Math.min(to, p.bet + p.stack);
  };

  /* Copiador: na maioria das vezes imita a jogada anterior, desde que faça sentido */
  if (P.copy && G.acts.length && Math.random() < P.copy){
    const last = G.acts[G.acts.length - 1];
    let ref = last;
    if (last.t === 'fold'){
      if (toCall > 0 && eq < odds + 0.02){ doFold(i); return; }
      ref = [...G.acts].reverse().find(a => a.t !== 'fold');
    }
    if (ref){
      if (ref.t === 'raise'){
        if (canRaise && eq > odds + 0.04 && str > 1.25){ doRaise(i, sizeTo(0.5 + Math.random() * 0.3)); return; }
        if (toCall === 0 || eq > odds * 0.85){ doCall(i); return; }
        doFold(i); return;
      }
      if (toCall === 0 || eq > odds * 0.9){ doCall(i); return; }
      doFold(i); return;
    }
  }

  if (toCall === 0){
    if (canRaise && str > 1.7 && r < Math.min(0.95, 0.75 * P.aggr)) return doRaise(i, sizeTo());
    if (canRaise && str > 1.25 && r < Math.min(0.9, 0.3 * P.aggr)) return doRaise(i, sizeTo(P.size[0]));
    if (canRaise && Math.random() < P.bluff) return doRaise(i, sizeTo());
    return doCall(i);
  }
  if (toCall / p.stack > P.fear && str < 2.2) return doFold(i);
  const need = odds + 0.03 + P.margin - vsHuman * 0.06 - exploit;
  if (eq > need){
    if (canRaise && str > 1.9 && r < Math.min(0.9, 0.5 * P.aggr)) return doRaise(i, sizeTo());
    if (canRaise && P.aggr > 1.2 && str > 1.3 && Math.random() < 0.35) return doRaise(i, sizeTo());
    return doCall(i);
  }
  if (eq > odds * 0.8 && Math.random() < P.chase + vsHuman * 0.15 + exploit) return doCall(i);
  if (canRaise && Math.random() < P.bluff * 0.5) return doRaise(i, sizeTo());
  return doFold(i);
}
