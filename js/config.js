// Personalidades dos bots, dificuldades, mesas, temas e valores fixos.
import { noise } from './som.js';

export const SPEEDS = {lenta:1.8, normal:1, rapida:0.45};

/* Temas (a lista facilita acrescentar temas desbloqueáveis no futuro) */
export const THEMES = [
  {id:'escuro',   label:'Minimalista escuro', color:'#000000'},
  {id:'claro',    label:'Minimalista claro',  color:'#ffffff'},
  {id:'verde',    label:'Mesa verde',         color:'#0b5d34'},
  {id:'vermelha', label:'Mesa vermelha',      color:'#6e101d'},
  {id:'azul',     label:'Mesa azul',          color:'#0f3566'},
  {id:'roxa',     label:'Mesa roxa',          color:'#3f1a60'},
  {id:'dark',     label:'Mesa dark',          color:'#121617'}
];

/* Próximo valor de blind: ×1,5 arredondado para um número "redondo" */
export function niceBlind(x){
  if (x < 10) return Math.max(2, Math.round(x));
  const st = 5 * 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / st) * st;
}

/* sims: precisão do cálculo | noise: erro de avaliação | margin: exigência para pagar (negativo = paga demais)
   aggr: vontade de aumentar | bluff: chance de blefar | size: tamanho das apostas (fração do pote)
   misplay: chance de uma jogada aleatória | chase: paga com mão fraca "para ver" | fear: fração das fichas
   que assusta (acima disso desiste sem mão forte) | adapt: quanto lê o que você mostrou
   read: quanto percebe quem aumenta demais e passa a pagar mais contra essa pessoa */
export const PERS = {
  novato:        {label:'Novato',        sims:25,  noise:0.16, margin:-0.06, aggr:0.5,  bluff:0.05, size:[0.3,0.9], misplay:0.20, chase:0.45, fear:9,    adapt:0,   read:0},
  intermediario: {label:'Intermediário', sims:90,  noise:0.07, margin:0.01,  aggr:0.9,  bluff:0.06, size:[0.4,0.8], misplay:0.06, chase:0.20, fear:9,    adapt:0.5, read:0.3},
  profissional:  {label:'Profissional',  sims:220, noise:0.01, margin:0.04,  aggr:1.0,  bluff:0.05, size:[0.5,0.9], misplay:0,    chase:0,    fear:9,    adapt:1,   read:0.7},
  enganador:     {label:'Enganador',     sims:40,  noise:0.12, margin:0,     aggr:0.8,  bluff:0.30, size:[0.4,0.9], misplay:0.05, chase:0.20, fear:9,    adapt:0.2, read:0.1},
  medroso:       {label:'Medroso',       sims:70,  noise:0.06, margin:0.14,  aggr:0.25, bluff:0,    size:[0.3,0.5], misplay:0.02, chase:0.02, fear:0.10, adapt:0.3, read:0},
  agressivo:     {label:'Agressivo',     sims:90,  noise:0.06, margin:0.01,  aggr:1.3,  bluff:0.12, size:[0.6,1.1], misplay:0.02, chase:0.20, fear:9,    adapt:0.3, read:0.3},
  /* copy: chance de imitar a jogada anterior (se fizer sentido) */
  copiador:      {label:'Copiador',      sims:90,  noise:0.07, margin:0.01,  aggr:0.9,  bluff:0.06, size:[0.4,0.8], misplay:0.04, chase:0.20, fear:9,    adapt:0.3, read:0.2, copy:0.7},
  /* usa os parâmetros do bot que está imitando (ver startHand) */
  mimico:        {label:'Mímico',        sims:90,  noise:0.07, margin:0.01,  aggr:0.9,  bluff:0.06, size:[0.4,0.8], misplay:0.04, chase:0.20, fear:9,    adapt:0.3, read:0.2},
  /* cheat: no começo da mão enxerga uma carta de um jogador */
  trapaceiro:    {label:'Trapaceiro',    sims:120, noise:0.04, margin:0.02,  aggr:1.0,  bluff:0.05, size:[0.5,0.9], misplay:0.02, chase:0.10, fear:9,    adapt:0.5, read:0.4, cheat:true},
  /* hunt: pressiona quem tem 30% ou menos das fichas iniciais */
  cacador:       {label:'Caçador',       sims:90,  noise:0.07, margin:0.01,  aggr:0.9,  bluff:0.06, size:[0.4,0.8], misplay:0.06, chase:0.20, fear:9,    adapt:0.5, read:0.3, hunt:true},
  /* revenge: pressiona por 5 mãos quem lhe tirou 25% das fichas iniciais ou mais numa mão */
  vingativo:     {label:'Vingativo',     sims:90,  noise:0.07, margin:0.01,  aggr:0.9,  bluff:0.06, size:[0.4,0.8], misplay:0.06, chase:0.20, fear:9,    adapt:0.5, read:0.3, revenge:true},
  caotico:       {label:'Caótico',       chaos:true}
};

export const PERS_IDS = Object.keys(PERS);

export const BOT_NAMES = ['Ana','Bruno','Carla','Diego','Elisa','Fábio','Gabi'];

/* Chance (em %) de cada personalidade aparecer quando o adversário é "Automático". O Caótico só entra se você escolher. */
export const DIFF = {
  facil:   {label:'Fácil',   w:{novato:70, medroso:8,  enganador:4,  intermediario:4,  copiador:12, agressivo:2,  profissional:0,  mimico:0,  trapaceiro:0,  cacador:0,  vingativo:0}},
  medio:   {label:'Médio',   w:{novato:15, medroso:8,  enganador:12, intermediario:14, copiador:12, agressivo:8,  profissional:5,  mimico:8,  trapaceiro:2,  cacador:8,  vingativo:8}},
  dificil: {label:'Difícil', w:{novato:2,  medroso:2,  enganador:5,  intermediario:10, copiador:5,  agressivo:14, profissional:18, mimico:10, trapaceiro:10, cacador:12, vingativo:12}}
};

export const DIFF_IDS = Object.keys(DIFF);

export function pickPers(diff){
  const w = DIFF[diff].w;
  const ids = Object.keys(w);
  let r = Math.random() * ids.reduce((a, k) => a + w[k], 0);
  for (const k of ids){ r -= w[k]; if (r < 0) return k; }
  return ids[0];
}

export const EVERY = {facil:12, medio:10, dificil:8};

export const mkT = (buy, sb, bb, players, diff) => ({buy, sb, bb, players, diff, rise:true, every:EVERY[diff], bots:Array(players - 1).fill('auto')});

export const TABLES = [
  mkT(50,    1,   2,   4, 'facil'),
  mkT(100,   1,   2,   4, 'facil'),
  mkT(250,   2,   5,   4, 'facil'),
  mkT(500,   5,   10,  6, 'medio'),
  mkT(1000,  10,  20,  6, 'medio'),
  mkT(2500,  25,  50,  6, 'medio'),
  mkT(5000,  50,  100, 8, 'dificil'),
  mkT(10000, 100, 200, 8, 'dificil'),
  mkT(25000, 250, 500, 8, 'dificil')
];

export const PH = {preflop:'Pré-flop', flop:'Flop', turn:'Turn', river:'River'};

export const ORDER = ['preflop','flop','turn','river'];

export function autoBlinds(chips){
  const raw = chips * 0.02;
  const step = raw >= 10 ? 10 ** Math.floor(Math.log10(raw)) : 1;
  let bb = Math.max(2, Math.round(raw / step) * step);
  bb -= bb % 2;
  if (bb < 2) bb = 2;
  return {sb: bb / 2, bb};
}

/* Blackjack clássico: regras por dificuldade (meta = quantas vezes as fichas iniciais; cada = rodadas até subir a aposta mínima) */
export const BJ_REGRAS = {
  facil:   {decks:2, pagamento:'3:2', soft17:'stand', meta:2, cada:15},
  medio:   {decks:6, pagamento:'3:2', soft17:'stand', meta:3, cada:12},
  dificil: {decks:8, pagamento:'6:5', soft17:'hit',   meta:4, cada:10}
};
export const BJ_TABLES = TABLES.map(t => Object.assign({buy:t.buy, min:t.bb, max:t.bb * 20, diff:t.diff, goal:t.buy * BJ_REGRAS[t.diff].meta}, BJ_REGRAS[t.diff]));

/* Blackjack arcade: adversários (a personalidade fica escondida fora do modo treino) */
export const ARC_OPPS = [
  {id:'ana',   nome:'Ana',   pers:'novato',        diff:'facil',   hp:10},
  {id:'bruno', nome:'Bruno', pers:'medroso',       diff:'facil',   hp:10},
  {id:'carla', nome:'Carla', pers:'copiador',      diff:'facil',   hp:10},
  {id:'diego', nome:'Diego', pers:'intermediario', diff:'medio',   hp:10},
  {id:'elisa', nome:'Elisa', pers:'enganador',     diff:'medio',   hp:10},
  {id:'fabio', nome:'Fábio', pers:'cacador',       diff:'medio',   hp:10},
  {id:'gabi',  nome:'Gabi',  pers:'vingativo',     diff:'medio',   hp:10},
  {id:'hugo',  nome:'Hugo',  pers:'agressivo',     diff:'dificil', hp:10},
  {id:'iara',  nome:'Iara',  pers:'mimico',        diff:'dificil', hp:10},
  {id:'julio', nome:'Júlio', pers:'trapaceiro',    diff:'dificil', hp:10},
  {id:'karen', nome:'Karen', pers:'profissional',  diff:'dificil', hp:10}
];
