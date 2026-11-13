// Baralho, avaliação das mãos e cálculo de chances (equidade).

export const RANK = {11:'J',12:'Q',13:'K',14:'A'};

export const rk = r => RANK[r] || String(r);

export const SUIT = ['\u2660\uFE0E','\u2665\uFE0E','\u2666\uFE0E','\u2663\uFE0E'];

export const CAT = ['Carta alta','Par','Dois pares','Trinca','Sequência','Flush','Full house','Quadra','Straight flush'];

export const P5 = 15 ** 5;

export function combos(n, k){
  const res = [];
  (function rec(s, cur){
    if (cur.length === k){ res.push(cur.slice()); return; }
    for (let i = s; i < n; i++){ cur.push(i); rec(i + 1, cur); cur.pop(); }
  })(0, []);
  return res;
}

export const COMB = {5: combos(5,5), 6: combos(6,5), 7: combos(7,5)};

export function score5(c){
  const rs = c.map(x => x.r).sort((a,b) => b - a);
  const flush = c.every(x => x.s === c[0].s);
  const uniq = new Set(rs);
  let straight = 0;
  if (uniq.size === 5){
    if (rs[0] - rs[4] === 4) straight = rs[0];
    else if (rs[0] === 14 && rs[1] === 5) straight = 5;
  }
  const cnt = {};
  rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
  const g = Object.entries(cnt).map(([r,n]) => [+r, n]).sort((a,b) => b[1] - a[1] || b[0] - a[0]);
  let cat, ks;
  if (straight && flush){ cat = 8; ks = [straight]; }
  else if (g[0][1] === 4){ cat = 7; ks = [g[0][0], g[1][0]]; }
  else if (g[0][1] === 3 && g[1][1] === 2){ cat = 6; ks = [g[0][0], g[1][0]]; }
  else if (flush){ cat = 5; ks = rs; }
  else if (straight){ cat = 4; ks = [straight]; }
  else if (g[0][1] === 3){ cat = 3; ks = g.map(x => x[0]); }
  else if (g[0][1] === 2 && g[1][1] === 2){ cat = 2; ks = g.map(x => x[0]); }
  else if (g[0][1] === 2){ cat = 1; ks = g.map(x => x[0]); }
  else { cat = 0; ks = rs; }
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 15 + (ks[i] || 0);
  return v;
}

export function best7(cs){
  let best = -1;
  for (const idx of COMB[cs.length]){
    const v = score5(idx.map(i => cs[i]));
    if (v > best) best = v;
  }
  return best;
}

export function catName(v){
  const cat = Math.floor(v / P5);
  if (cat === 8 && Math.floor(v / 15 ** 4) % 15 === 14) return 'Royal flush';
  return CAT[cat];
}

export function makeDeck(){
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({r, s});
  return d;
}

export function shuffle(a){
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Equidade aproximada por simulação (usada pelos adversários) */
export function equity(hole, board, nOpp, sims, peek){
  const known = new Set(hole.concat(board).map(c => c.r * 4 + c.s));
  if (peek) known.add(peek.r * 4 + peek.s);
  const rest = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!known.has(r * 4 + s)) rest.push({r, s});
  const need = (5 - board.length) + 2 * nOpp - (peek ? 1 : 0);
  let win = 0;
  for (let k = 0; k < sims; k++){
    for (let i = 0; i < need; i++){
      const j = i + Math.floor(Math.random() * (rest.length - i));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    let idx = 0;
    const b = board.slice();
    while (b.length < 5) b.push(rest[idx++]);
    const mine = best7(hole.concat(b));
    let lost = false, ties = 0;
    for (let o = 0; o < nOpp; o++){
      const oh = (peek && o === 0) ? [peek, rest[idx++]] : [rest[idx++], rest[idx++]];
      const sc = best7(oh.concat(b));
      if (sc > mine){ lost = true; break; }
      if (sc === mine) ties++;
    }
    if (!lost) win += 1 / (ties + 1);
  }
  return win / sims;
}

/* Histórico da mão */
export const cardTxt = c => rk(c.r) + SUIT[c.s];
