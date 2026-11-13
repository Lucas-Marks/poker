// Ícones em SVG (traço simples, usam a cor do texto). Elementos com data-ico="nome" recebem o ícone.
const svg = corpo => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;

/* Engrenagem: 8 dentes calculados */
function caminhoEngrenagem() {
  const dentes = 8, r1 = 6.4, r2 = 9.4, passo = (2 * Math.PI) / dentes, pts = [];
  for (let i = 0; i < dentes; i++) {
    const c = i * passo;
    [[c - 0.34 * passo, r1], [c - 0.17 * passo, r2], [c + 0.17 * passo, r2], [c + 0.34 * passo, r1]]
      .forEach(([a, r]) => pts.push((12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2)));
  }
  return 'M' + pts.join('L') + 'Z';
}

export const ICONES = {
  grafico: svg('<path d="M3 20h18M6 20v-7M12 20V5M18 20v-10"/>'),
  trofeu: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10.5 17h3"/>'),
  engrenagem: svg(`<path d="${caminhoEngrenagem()}"/><circle cx="12" cy="12" r="2.6"/>`),
  ajuda: svg('<circle cx="12" cy="12" r="9.5"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 4"/><path d="M12 17.4v.2"/>'),
  voltar: svg('<path d="M15 5l-7 7 7 7"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  sair: svg('<path d="M10 5H6v14h4"/><path d="M14 8l4 4-4 4M18 12H9"/>'),
  historico: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
};

export function aplicarIcones() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = ICONES[el.dataset.ico] || ''; });
}
