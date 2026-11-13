// Funções pequenas usadas em todo o jogo.

export const $ = id => document.getElementById(id);

export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const fmt = n => Number(n).toLocaleString('pt-BR');

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
