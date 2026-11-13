// Avaliador de mãos escrito à parte (compara listas, sem a codificação numérica do jogo).
export function ind5(h) {
  const ranks = h.map(c => c.r).sort((x, y) => y - x);
  const flush = h.every(c => c.s === h[0].s);
  const counts = new Map();
  ranks.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
  const groups = [...counts.entries()].map(([r, c]) => [c, r]).sort((x, y) => y[0] - x[0] || y[1] - x[1]);
  let st = 0;
  if (new Set(ranks).size === 5) {
    if (ranks[0] - ranks[4] === 4) st = ranks[0];
    else if (ranks.join() === '14,5,4,3,2') st = 5;
  }
  const forma = groups.map(g => g[0]).join(''), rs = groups.map(g => g[1]);
  if (st && flush) return [8, st];
  if (forma === '41') return [7, ...rs];
  if (forma === '32') return [6, ...rs];
  if (flush) return [5, ...ranks];
  if (st) return [4, st];
  if (forma === '311') return [3, ...rs];
  if (forma === '221') return [2, ...rs];
  if (forma === '2111') return [1, ...rs];
  return [0, ...ranks];
}
export function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
export function ind7(cs) {
  let melhor = null;
  const n = cs.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const v = ind5([cs[a], cs[b], cs[c], cs[d], cs[e]]);
      if (!melhor || cmp(v, melhor) > 0) melhor = v;
    }
  return melhor;
}
