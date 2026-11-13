// Simula o mínimo do navegador (DOM, timers e localStorage) para rodar o jogo no Node.
export const elementos = {};
export const timers = [];
export const store = {};
export const handlers = {};
let TID = 0;
const novo = () => ({innerHTML: '', textContent: '', hidden: false, className: '', value: '', style: {setProperty() {}}});

globalThis.setTimeout = (f, ms) => { const t = {f, ms, id: ++TID}; timers.push(t); return t.id; };
globalThis.clearTimeout = id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); };
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
export const raiz = {attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }};
globalThis.document = {
  documentElement: raiz,
  getElementById: id => elementos[id] || (elementos[id] = novo()),
  addEventListener: (tipo, f) => { handlers[tipo] = f; }
};
['modal', 'hist'].forEach(id => { elementos[id] = novo(); elementos[id].hidden = true; });

export const clique = (a, d = {}) => handlers.click({target: {closest: () => ({dataset: {a, ...d}})}});
export const digitar = (id, v) => { elementos[id].value = String(v); handlers.input({target: {id}}); };
export const mudar = (id, v, ds) => {
  if (!ds) elementos[id].value = String(v);
  handlers.change({target: {id, value: String(v), dataset: ds || {}}});
};
