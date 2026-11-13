// Blackjack arcade: duelo 1 contra 1 com baralho de 1 a 11 e cartas especiais.
// Cada rodada tem um valor em jogo; quem perde a rodada perde essa quantidade de fichas.
import { LS, STATS_KEY, settings } from './armazenamento.js';
import { shuffle } from './cartas.js';
import { ST, unlockAch } from './estatisticas.js';
import { sfx } from './som.js';

export const ARC_SAVE_KEY = 'poker.arc.save.v1';
export const ganchosArc = {};          // usados apenas pelos testes automáticos
export let A = null;

/* ---------- Cartas especiais ---------- */
export const CARTAS = {
  escudo:   {nome: 'Escudo',      desc: 'Você perde 1 ficha a menos nesta rodada.',                    peso: 6},
  escudo2:  {nome: 'Escudo+',     desc: 'Você perde 2 fichas a menos nesta rodada.',                   peso: 3},
  aposta2:  {nome: 'Aposta +2',   desc: 'Aumenta em 2 o valor em jogo.',                               peso: 6},
  aposta3:  {nome: 'Aposta +3',   desc: 'Aumenta em 3 o valor em jogo.',                               peso: 3},
  quebra:   {nome: 'Quebra',      desc: 'Destrói uma carta especial do adversário.',                   peso: 4},
  retorno:  {nome: 'Retorno',     desc: 'Devolve ao baralho a última carta que você comprou.',         peso: 4},
  troca:    {nome: 'Troca',       desc: 'Troca sua última carta aberta com a do adversário.',          peso: 3},
  meta17:   {nome: 'Meta 17',     desc: 'O alvo da rodada passa a ser 17.',                            peso: 3},
  meta24:   {nome: 'Meta 24',     desc: 'O alvo da rodada passa a ser 24.',                            peso: 3},
  carta3:   {nome: 'Carta 3',     desc: 'Compra o 3, se ele ainda estiver no baralho.',                peso: 3},
  carta5:   {nome: 'Carta 5',     desc: 'Compra o 5, se ele ainda estiver no baralho.',                peso: 3},
  carta7:   {nome: 'Carta 7',     desc: 'Compra o 7, se ele ainda estiver no baralho.',                peso: 3},
  certa:    {nome: 'Carta certa', desc: 'Compra a melhor carta possível sem passar do alvo.',          peso: 3},
  visao:    {nome: 'Visão',       desc: 'Mostra a carta escondida do adversário nesta rodada.',        peso: 3},
  congelar: {nome: 'Congelar',    desc: 'O adversário não pode mais comprar cartas nesta rodada.',     peso: 3}
};
export const MAX_ESP = 5;

/* ---------- Personalidades do adversário (fora do modo treino ficam escondidas) ---------- */
export const PERS_ARC = {
  novato:        {risco: 0.55, ruido: 0.25, habil: 0.30, ousadia: 0.2},
  medroso:       {risco: 0.18, ruido: 0.05, habil: 0.60, ousadia: 0.05},
  intermediario: {risco: 0.40, ruido: 0.10, habil: 0.70, ousadia: 0.4},
  profissional:  {exato: true, ruido: 0, habil: 1, ousadia: 0.6},
  enganador:     {risco: 0.45, ruido: 0.12, habil: 0.70, ousadia: 0.8, blefe: true},
  agressivo:     {risco: 0.55, ruido: 0.10, habil: 0.80, ousadia: 1},
  copiador:      {risco: 0.40, ruido: 0.10, habil: 0.70, ousadia: 0.4, copia: 0.7},
  mimico:        {mimico: true},
  trapaceiro:    {exato: true, ruido: 0.03, habil: 0.90, ousadia: 0.6, trapaca: 0.6},   // trapaceia em ~60% das rodadas
  cacador:       {risco: 0.40, ruido: 0.10, habil: 0.70, ousadia: 0.4, caca: true},
  vingativo:     {risco: 0.40, ruido: 0.10, habil: 0.70, ousadia: 0.4, vinganca: true},
  caotico:       {caos: true}
};

export const outro = k => (k === 'p' ? 'o' : 'p');
export const soma = cs => cs.reduce((a, b) => a + b, 0);
const rnd = n => Math.floor(Math.random() * n);
const novoLado = () => ({cartas: [], esp: [], parou: false, congelado: false, viu: null});
const nomeLado = k => (k === 'p' ? 'Você' : A.t.nome);

function sortearEsp(){
  const ids = Object.keys(CARTAS), tot = ids.reduce((a, i) => a + CARTAS[i].peso, 0);
  let r = Math.random() * tot;
  for (const i of ids){ r -= CARTAS[i].peso; if (r < 0) return i; }
  return ids[0];
}

/* ---------- Partida e rodadas ---------- */
export function novaPartidaArc(opp){
  const hp = opp.hp || 10;
  A = {
    ver: 1, gid: Math.random().toString(36).slice(2), practice: settings.practice,
    t: {id: opp.id, nome: opp.nome, pers: opp.pers, diff: opp.diff, hp},
    hp: {p: hp, o: hp}, rodada: 0, baralho: [], lado: {p: novoLado(), o: novoLado()},
    alvo: 21, aposta: 1, escudo: {p: 0, o: 0}, vez: 'p', passes: 0, ult: {}, fase: 'jogo', fim: null,
    resultado: null, log: [], aviso: '', msg: '', imit: null, rancor: 0, novasConquistas: [],
    gs: {rounds: 0, roundsWon: 0, usadas: 0}
  };
  iniciarRodada();
  salvarArc();
  return A;
}

export function personaEf(){
  let id = A.t.pers;
  if (id === 'mimico'){
    if (!A.imit || A.rodada - A.imit.desde >= 5){
      const lista = Object.keys(PERS_ARC).filter(x => x !== 'mimico');
      A.imit = {id: lista[rnd(lista.length)], desde: A.rodada};
    }
    id = A.imit.id;
  }
  return {id, P: PERS_ARC[id]};
}

function iniciarRodada(){
  A.rodada++; A.gs.rounds++; A.fase = 'jogo'; A.alvo = 21;
  A.aposta = 1 + Math.floor((A.rodada - 1) / 4);
  A.escudo = {p: 0, o: 0}; A.passes = 0; A.ult = {}; A.log = []; A.aviso = ''; A.resultado = null; A.msg = '';
  A.baralho = shuffle(Array.from({length: 11}, (_, i) => i + 1));
  ['p', 'o'].forEach(k => {
    const l = A.lado[k];
    l.cartas = [A.baralho.pop(), A.baralho.pop()];      // a 1ª carta fica escondida do adversário
    l.parou = false; l.congelado = false; l.viu = null;
    if (l.esp.length < MAX_ESP) l.esp.push(sortearEsp());
  });
  A.vez = A.rodada % 2 === 1 ? 'p' : 'o';
  if (A.rancor > 0) A.rancor--;
  const {P} = personaEf();
  if (P.trapaca && Math.random() < P.trapaca){ A.lado.o.viu = A.lado.p.cartas[0]; A.aviso = 'O adversário trapaceou nesta rodada.'; }
}

export function proximaRodadaArc(){
  if (!A || A.fase !== 'resultado' || A.fim) return false;
  iniciarRodada();
  salvarArc();
  return true;
}

/* ---------- Ações ---------- */
export function podeComprar(k){
  return !!A && A.fase === 'jogo' && A.vez === k && !A.lado[k].congelado && A.baralho.length > 0;
}
export function comprarArc(k){
  if (!podeComprar(k)) return false;
  const l = A.lado[k];
  l.cartas.push(A.baralho.pop()); l.parou = false; A.passes = 0; A.ult[k] = 'comprar';
  A.log.push(nomeLado(k) + ' comprou uma carta.');
  A.vez = outro(k); sfx.deal(); salvarArc();
  return true;
}
export function pararArc(k){
  if (!A || A.fase !== 'jogo' || A.vez !== k) return false;
  A.lado[k].parou = true; A.passes++; A.ult[k] = 'parar';
  A.log.push(nomeLado(k) + ' parou.');
  if (A.passes >= 2) resolver(); else A.vez = outro(k);
  salvarArc();
  return true;
}

export function podeAplicar(k, id){
  const l = A.lado[k], o = A.lado[outro(k)], b = A.baralho;
  switch (id){
    case 'escudo': case 'escudo2': case 'aposta2': case 'aposta3': return true;
    case 'quebra': return o.esp.length > 0;
    case 'retorno': return l.cartas.length > 1;
    case 'troca': return l.cartas.length > 1 && o.cartas.length > 1;
    case 'meta17': return A.alvo !== 17;
    case 'meta24': return A.alvo !== 24;
    case 'carta3': return b.includes(3);
    case 'carta5': return b.includes(5);
    case 'carta7': return b.includes(7);
    case 'certa': return b.length > 0;
    case 'visao': return l.viu == null;
    case 'congelar': return !o.congelado;
    default: return false;
  }
}
function tirarDoBaralho(n){ const i = A.baralho.indexOf(n); return A.baralho.splice(i, 1)[0]; }
function aplicar(k, id){
  const l = A.lado[k], o = A.lado[outro(k)];
  switch (id){
    case 'escudo': A.escudo[k] += 1; break;
    case 'escudo2': A.escudo[k] += 2; break;
    case 'aposta2': A.aposta += 2; break;
    case 'aposta3': A.aposta += 3; break;
    case 'quebra': { const i = rnd(o.esp.length); const [c] = o.esp.splice(i, 1); A.log.push(nomeLado(outro(k)) + ' perdeu a carta ' + CARTAS[c].nome + '.'); break; }
    case 'retorno': { const c = l.cartas.pop(); A.baralho.splice(rnd(A.baralho.length + 1), 0, c); break; }
    case 'troca': { const a = l.cartas.length - 1, b = o.cartas.length - 1; [l.cartas[a], o.cartas[b]] = [o.cartas[b], l.cartas[a]]; break; }
    case 'meta17': A.alvo = 17; break;
    case 'meta24': A.alvo = 24; break;
    case 'carta3': case 'carta5': case 'carta7': l.cartas.push(tirarDoBaralho(Number(id.slice(5)))); l.parou = false; A.passes = 0; break;
    case 'certa': {
      const folga = A.alvo - soma(l.cartas);
      const cabem = A.baralho.filter(c => c <= folga);
      const n = cabem.length ? Math.max(...cabem) : Math.min(...A.baralho);
      l.cartas.push(tirarDoBaralho(n)); l.parou = false; A.passes = 0; break;
    }
    case 'visao': l.viu = o.cartas[0]; break;
    case 'congelar': o.congelado = true; break;
  }
}
export function usarEsp(k, idx){
  if (!A || A.fase !== 'jogo' || A.vez !== k) return false;
  const l = A.lado[k], id = l.esp[idx];
  if (!id || !podeAplicar(k, id)) return false;
  aplicar(k, id);
  l.esp.splice(idx, 1);
  if (k === 'p') A.gs.usadas++;
  A.log.push(nomeLado(k) + ' usou ' + CARTAS[id].nome + '.');
  sfx.chip(); salvarArc();
  return true;
}

/* ---------- Resultado ---------- */
function resolver(){
  const alvo = A.alvo, tp = soma(A.lado.p.cartas), to = soma(A.lado.o.cartas);
  const ep = tp > alvo, eo = to > alvo;
  let venc = null;
  if (ep && eo) venc = null;
  else if (ep) venc = 'o'; else if (eo) venc = 'p';
  else if (tp > to) venc = 'p'; else if (to > tp) venc = 'o';
  A.resultado = {venc, tp, to, alvo, aposta: A.aposta, perda: 0};
  if (venc){
    const perd = outro(venc);
    const perda = Math.max(0, A.aposta - A.escudo[perd]);
    A.hp[perd] = Math.max(0, A.hp[perd] - perda);
    A.resultado.perda = perda;
    if (perd === 'o' && perda >= 3) A.rancor = 3;
  }
  A.fase = 'resultado';
  if (venc === 'p') A.gs.roundsWon++;
  const quem = venc === 'p' ? 'Você ganhou' : venc === 'o' ? A.t.nome + ' ganhou' : 'Empate';
  A.msg = `${quem}. Você ${tp}${ep ? ' (estourou)' : ''}, ${A.t.nome} ${to}${eo ? ' (estourou)' : ''}, alvo ${alvo}.` +
          (venc ? `\n${venc === 'p' ? A.t.nome : 'Você'} perde ${A.resultado.perda} ${A.resultado.perda === 1 ? 'ficha' : 'fichas'}.` : '');
  let fresh = [];
  if (!A.practice) fresh = unlockAch('arcround', {venceu: venc === 'p', aposta: A.aposta});
  if (A.hp.p <= 0) A.fim = 'derrota'; else if (A.hp.o <= 0) A.fim = 'vitoria';
  if (A.fim) fresh = fresh.concat(fecharPartidaArc());
  fresh.forEach(n => { A.msg += '\nConquista desbloqueada: ' + n; });
  A.novasConquistas = A.novasConquistas.concat(fresh);
  if (venc === 'p') sfx.win();
  if (A.fim === 'vitoria') sfx.victory(); else if (A.fim === 'derrota') sfx.lose();
  if (ganchosArc.fimDeRodada) ganchosArc.fimDeRodada();
}
function fecharPartidaArc(){
  const win = A.fim === 'vitoria', S = ST.arc;
  S.games++; if (win) S.wins++; else S.losses++;
  S.rounds += A.gs.rounds; S.roundsWon += A.gs.roundsWon; S.trumps += A.gs.usadas;
  let nomes = [];
  if (!A.practice) nomes = unlockAch('arcgame', {win, diff: A.t.diff, hpFinal: A.hp.p, hpMax: A.t.hp});
  LS.set(STATS_KEY, ST);
  return nomes;
}

/* ---------- Inteligência do adversário (só usa o que ele pode saber) ---------- */
function desconhecidas(k){
  const l = A.lado[k], adv = A.lado[outro(k)];
  const conhecidas = new Set(l.cartas.concat(adv.cartas.slice(1)));
  if (l.viu != null) conhecidas.add(adv.cartas[0]);
  const u = [];
  for (let n = 1; n <= 11; n++) if (!conhecidas.has(n)) u.push(n);
  return u;
}
function probGanhar(k, meu){
  const adv = A.lado[outro(k)], alvo = A.alvo, vis = soma(adv.cartas.slice(1));
  const cands = A.lado[k].viu != null ? [adv.cartas[0]] : desconhecidas(k);
  if (!cands.length) return 0.5;
  let w = 0;
  for (const h of cands){
    const t = vis + h;
    if (meu > alvo) w += t > alvo ? 0.5 : 0;
    else if (t > alvo) w += 1;
    else w += meu > t ? 1 : meu === t ? 0.5 : 0;
  }
  return w / cands.length;
}
function querComprar(k, P){
  const l = A.lado[k], tot = soma(l.cartas);
  if (!podeComprar(k) || tot >= A.alvo) return false;
  if (P.caos) return Math.random() < 0.5;
  const adv = A.lado[outro(k)], U = desconhecidas(k);
  const bust = U.filter(c => tot + c > A.alvo).length / (U.length || 1);
  if (P.copia && A.ult[outro(k)] && Math.random() < P.copia) return A.ult[outro(k)] === 'comprar' ? bust < 0.6 : false;
  let r = P.risco;
  if (P.caca && A.hp.p <= Math.ceil(A.t.hp * 0.3)) r += 0.12;
  if (P.vinganca && A.rancor > 0) r += 0.12;
  if (adv.parou && tot <= soma(adv.cartas.slice(1)) + 2) r += 0.2;
  if (P.exato){
    const parado = probGanhar(k, tot);
    const comprando = U.reduce((a, c) => a + probGanhar(k, tot + c), 0) / (U.length || 1);
    return comprando > parado + 0.01;
  }
  return bust <= r + (Math.random() * 2 - 1) * P.ruido;
}
function escolherEsp(k, P){
  const l = A.lado[k], o = A.lado[outro(k)], tot = soma(l.cartas);
  if (!l.esp.length || Math.random() > P.habil) return -1;
  const pg = probGanhar(k, tot), emJogo = A.aposta - A.escudo[k], U = desconhecidas(k);
  const estOpp = soma(o.cartas.slice(1)) + (U.length ? soma(U) / U.length : 0);
  const ousado = P.ousadia || 0;
  const util = id => {
    switch (id){
      case 'visao': return true;
      case 'escudo': return emJogo >= 1 && pg < 0.5;
      case 'escudo2': return emJogo >= 2 && pg < 0.45;
      case 'aposta2': case 'aposta3': return pg > 0.78 - 0.18 * ousado || (P.blefe && pg < 0.4 && Math.random() < 0.35);
      case 'quebra': return Math.random() < 0.4 + 0.5 * ousado;
      case 'retorno': return tot > A.alvo && tot - l.cartas[l.cartas.length - 1] <= A.alvo;
      case 'troca': { const novo = tot - l.cartas[l.cartas.length - 1] + o.cartas[o.cartas.length - 1]; return novo <= A.alvo && novo > tot; }
      case 'meta17': return tot >= 14 && tot <= 17 && estOpp > 17;
      case 'meta24': return tot > A.alvo && tot <= 24;
      case 'carta3': case 'carta5': case 'carta7': { const n = Number(id.slice(5)); return U.includes(n) && tot + n <= A.alvo && tot + n >= A.alvo - 2 && tot < A.alvo - 1; }
      case 'certa': return tot <= A.alvo - 3 && pg < 0.6;
      case 'congelar': return pg > 0.55;
      default: return false;
    }
  };
  for (let i = 0; i < l.esp.length; i++) if (podeAplicar(k, l.esp[i]) && util(l.esp[i])) return i;
  return -1;
}

/* Executa UMA ação do adversário (a interface chama de novo até a vez voltar para o jogador) */
export function passoIA(){
  if (!A || A.fase !== 'jogo' || A.vez !== 'o') return null;
  const {P} = personaEf(), l = A.lado.o;
  if (P.caos){
    const ok = l.esp.map((x, i) => i).filter(i => podeAplicar('o', l.esp[i]));
    if (ok.length && Math.random() < 0.4){ const i = ok[rnd(ok.length)], id = l.esp[i]; usarEsp('o', i); return {tipo: 'esp', id}; }
    if (podeComprar('o') && Math.random() < 0.5){ comprarArc('o'); return {tipo: 'comprar'}; }
    pararArc('o'); return {tipo: 'parar'};
  }
  const i = escolherEsp('o', P);
  if (i >= 0){ const id = l.esp[i]; usarEsp('o', i); return {tipo: 'esp', id}; }
  if (querComprar('o', P)){ comprarArc('o'); return {tipo: 'comprar'}; }
  pararArc('o');
  return {tipo: 'parar'};
}

/* ---------- Modo treino ---------- */
export function dicaArc(){
  if (!A || A.fase !== 'jogo' || A.vez !== 'p') return null;
  const tot = soma(A.lado.p.cartas), U = desconhecidas('p');
  const bust = U.length ? U.filter(c => tot + c > A.alvo).length / U.length : 0;
  const parado = probGanhar('p', tot);
  const comprando = U.length ? U.reduce((a, c) => a + probGanhar('p', tot + c), 0) / U.length : 0;
  const acao = !podeComprar('p') || tot >= A.alvo ? 'parar' : (comprando > parado + 0.01 ? 'comprar' : 'parar');
  return {bust, acao, parado, comprando};
}

/* ---------- Salvamento ---------- */
export function salvarArc(){
  if (!A) return;
  if (A.fim) LS.del(ARC_SAVE_KEY); else LS.set(ARC_SAVE_KEY, A);
}
export function carregarArc(){
  const sv = LS.get(ARC_SAVE_KEY, null);
  return sv && sv.ver === 1 && sv.t && sv.lado ? sv : null;
}
export function retomarArc(){
  const sv = carregarArc();
  if (!sv) return false;
  A = sv;
  return true;
}
export function encerrarArc(){ A = null; }
