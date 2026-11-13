// Blackjack clássico: baralho, apostas, dobrar, dividir, banca, metas e salvamento.
import { LS, STATS_KEY, settings } from './armazenamento.js';
import { makeDeck, shuffle } from './cartas.js';
import { niceBlind } from './config.js';
import { ST, unlockAch } from './estatisticas.js';
import { sfx } from './som.js';

export const BJ_SAVE_KEY = 'poker.bj.save.v1';
export const ganchosBJ = {};          // usados apenas pelos testes automáticos
export let B = null;

/* ---------- Cartas e mãos ---------- */
export const valorCarta = c => (c.r === 14 ? 11 : c.r >= 11 ? 10 : c.r);
export function valorMao(cartas){
  let total = 0, ases = 0;
  cartas.forEach(c => { total += valorCarta(c); if (c.r === 14) ases++; });
  while (total > 21 && ases > 0){ total -= 10; ases--; }
  return {total, soft: ases > 0};
}
export const ehBlackjack = (cartas, dividida) => !dividida && cartas.length === 2 && valorMao(cartas).total === 21;
const pagamentoBJ = (aposta, t) => Math.round(aposta * (t.pagamento === '6:5' ? 1.2 : 1.5));

/* ---------- Partida ---------- */
export function novaMesaBJ(t){
  const min = t.min0 || t.min;
  const tt = Object.assign({}, t, {min, min0: min, max: min * 20, goal: Math.round(t.buy * t.meta)});
  B = {
    ver: 1, gid: Math.random().toString(36).slice(2), t: tt, practice: settings.practice,
    chips: t.buy, shoe: [], fase: 'aposta', apostaAtual: min, ultimaAposta: min, antes: t.buy,
    maos: [], ativa: 0, banca: {cartas: [], oculta: true}, rodada: 0, msg: '', aviso: '',
    fimDeJogo: null, novasConquistas: [],
    gs: {rounds: 0, roundsWon: 0, blackjacks: 0, biggest: 0, streak: 0, bestStreak: 0}
  };
  embaralhar();
  B.aviso = '';
  salvarBJ();
  return B;
}
function embaralhar(){
  B.shoe = [];
  for (let d = 0; d < B.t.decks; d++) B.shoe.push(...makeDeck());
  shuffle(B.shoe);
  B.aviso = 'Baralho embaralhado.';
}
function comprar(){
  if (!B.shoe.length) embaralhar();
  return B.shoe.pop();
}
export const maoAtiva = () => (B ? B.maos[B.ativa] : null);

/* ---------- Apostar e distribuir ---------- */
export function apostaMaxima(){ return Math.min(B.t.max, B.chips); }
export function apostarBJ(valor){
  if (!B || B.fase !== 'aposta') return false;
  valor = Math.floor(valor);
  if (valor < B.t.min || valor > apostaMaxima()) return false;
  B.rodada++; B.gs.rounds++;
  B.antes = B.chips;
  B.chips -= valor; B.ultimaAposta = valor; B.aviso = ''; B.msg = '';
  const jogador = [comprar(), comprar()], banca = [comprar(), comprar()];   // a 1ª carta da banca fica aberta
  B.maos = [novaMao(jogador, valor, false)];
  B.banca = {cartas: banca, oculta: true};
  B.ativa = 0; B.fase = 'jogo';
  sfx.deal();
  const abertaValor = valorCarta(banca[0]);
  const bancaBJ = ehBlackjack(banca, false);
  if ((abertaValor >= 10) && bancaBJ){ fecharRodada(); return true; }       // a banca confere se tem blackjack
  if (ehBlackjack(jogador, false)){ B.maos[0].feita = true; fecharRodada(); return true; }
  salvarBJ();
  return true;
}
const novaMao = (cartas, aposta, dividida) => ({cartas, aposta, dobrou: false, feita: false, dividida, ases: false, resultado: null, retorno: 0});

/* ---------- Ações do jogador ---------- */
export function acoesBJ(){
  const m = maoAtiva();
  if (!B || B.fase !== 'jogo' || !m || m.feita) return {pedir: false, ficar: false, dobrar: false, dividir: false};
  const duas = m.cartas.length === 2, caixa = B.chips >= m.aposta;
  return {
    pedir: true, ficar: true,
    dobrar: duas && caixa,
    dividir: duas && caixa && B.maos.length < 4 && valorCarta(m.cartas[0]) === valorCarta(m.cartas[1])
  };
}
function proxima(){
  const i = B.maos.findIndex(h => !h.feita);
  if (i >= 0){ B.ativa = i; salvarBJ(); return; }
  jogarBanca();
}
export function pedirBJ(){
  if (!acoesBJ().pedir) return false;
  const m = maoAtiva();
  m.cartas.push(comprar()); sfx.deal();
  if (valorMao(m.cartas).total >= 21){ m.feita = true; proxima(); } else salvarBJ();
  return true;
}
export function ficarBJ(){
  if (!acoesBJ().ficar) return false;
  maoAtiva().feita = true; proxima();
  return true;
}
export function dobrarBJ(){
  if (!acoesBJ().dobrar) return false;
  const m = maoAtiva();
  B.chips -= m.aposta; m.aposta *= 2; m.dobrou = true;
  m.cartas.push(comprar()); sfx.chip(); sfx.deal();
  m.feita = true; proxima();
  return true;
}
export function dividirBJ(){
  if (!acoesBJ().dividir) return false;
  const m = maoAtiva(), [a, b] = m.cartas, ases = a.r === 14;
  B.chips -= m.aposta; sfx.chip();
  const m1 = novaMao([a, comprar()], m.aposta, true), m2 = novaMao([b, comprar()], m.aposta, true);
  m1.ases = m2.ases = ases;
  B.maos.splice(B.ativa, 1, m1, m2);
  [m1, m2].forEach(h => { if (ases || valorMao(h.cartas).total >= 21) h.feita = true; });   // ases dividido recebe uma carta só
  proxima();
  return true;
}

/* ---------- Banca e resultado ---------- */
function jogarBanca(){
  B.banca.oculta = false;
  if (B.maos.some(h => valorMao(h.cartas).total <= 21)){
    for (;;){
      const v = valorMao(B.banca.cartas);
      if (v.total < 17 || (v.total === 17 && v.soft && B.t.soft17 === 'hit')) B.banca.cartas.push(comprar()); else break;
    }
  }
  fecharRodada();
}
function fecharRodada(){
  B.banca.oculta = false;
  const bv = valorMao(B.banca.cartas).total, bBJ = ehBlackjack(B.banca.cartas, false);
  const partes = []; let blackjack = false, dobrouGanhou = false, dividiuGanhou = false;
  B.maos.forEach(h => {
    const v = valorMao(h.cartas).total, bj = ehBlackjack(h.cartas, h.dividida);
    let r, retorno = 0;
    if (v > 21) r = 'estourou';
    else if (bj && !bBJ){ r = 'blackjack'; retorno = h.aposta + pagamentoBJ(h.aposta, B.t); }
    else if (bj && bBJ){ r = 'empate'; retorno = h.aposta; }
    else if (bBJ) r = 'perdeu';
    else if (bv > 21 || v > bv){ r = 'ganhou'; retorno = h.aposta * 2; }
    else if (v === bv){ r = 'empate'; retorno = h.aposta; }
    else r = 'perdeu';
    h.resultado = r; h.retorno = retorno; B.chips += retorno;
    const liq = retorno - h.aposta;
    if (r === 'blackjack') blackjack = true;
    if (liq > 0 && h.dobrou) dobrouGanhou = true;
    if (liq > 0 && h.dividida) dividiuGanhou = true;
    const rot = {blackjack: 'Blackjack!', ganhou: 'Ganhou', empate: 'Empate', perdeu: 'Perdeu', estourou: 'Estourou'}[r];
    partes.push(rot + (liq ? ' ' + (liq > 0 ? '+' : '-') + Math.abs(liq) : ''));
  });
  const liquido = B.chips - B.antes, gs = B.gs;
  if (liquido > 0){ gs.roundsWon++; gs.streak++; gs.bestStreak = Math.max(gs.bestStreak, gs.streak); } else if (liquido < 0) gs.streak = 0;
  if (blackjack) gs.blackjacks++;
  gs.biggest = Math.max(gs.biggest, liquido);
  B.msg = partes.join(', ');
  B.fase = 'resultado';
  let fresh = [];
  if (!B.practice) fresh = unlockAch('bjhand', {blackjack, dobrouGanhou, dividiuGanhou, sequencia: gs.streak, liquido});
  if (B.chips >= B.t.goal) B.fimDeJogo = 'vitoria';
  else if (B.chips < B.t.min) B.fimDeJogo = 'derrota';
  if (B.fimDeJogo) fresh = fresh.concat(fecharPartidaBJ());
  fresh.forEach(n => { B.msg += '\nConquista desbloqueada: ' + n; });
  B.novasConquistas = B.novasConquistas.concat(fresh);
  if (liquido > 0) sfx.win();
  if (B.fimDeJogo === 'vitoria') sfx.victory(); else if (B.fimDeJogo === 'derrota') sfx.lose();
  if (ganchosBJ.fimDeRodada) ganchosBJ.fimDeRodada();
  salvarBJ();
}
function fecharPartidaBJ(){
  const win = B.fimDeJogo === 'vitoria', gs = B.gs, S = ST.bj;
  S.games++; if (win) S.wins++; else S.losses++;
  S.chipsWon += Math.max(0, B.chips - B.t.buy); S.chipsLost += Math.max(0, B.t.buy - B.chips);
  S.rounds += gs.rounds; S.roundsWon += gs.roundsWon; S.blackjacks += gs.blackjacks;
  S.biggest = Math.max(S.biggest, gs.biggest); S.bestStreak = Math.max(S.bestStreak, gs.bestStreak);
  let nomes = [];
  if (!B.practice) nomes = unlockAch('bjgame', {win, diff: B.t.diff});
  LS.set(STATS_KEY, ST);
  return nomes;
}

/* ---------- Próxima rodada ---------- */
export function proximaRodadaBJ(){
  if (!B || B.fase !== 'resultado' || B.fimDeJogo) return false;
  B.fase = 'aposta'; B.maos = []; B.banca = {cartas: [], oculta: true}; B.ativa = 0; B.msg = ''; B.aviso = '';
  if (B.shoe.length < B.t.decks * 52 * 0.25) embaralhar();
  if (B.t.cada && B.rodada % B.t.cada === 0){
    B.t.min = niceBlind(B.t.min * 1.5); B.t.max = B.t.min * 20;
    B.aviso = (B.aviso ? B.aviso + ' ' : '') + 'A aposta mínima subiu para ' + B.t.min + '.';
  }
  if (B.chips < B.t.min){
    B.fimDeJogo = 'derrota';
    B.msg = 'Fichas insuficientes para a aposta mínima.';
    B.fase = 'resultado';
    B.novasConquistas = B.novasConquistas.concat(fecharPartidaBJ());
    sfx.lose();
  } else B.apostaAtual = Math.max(B.t.min, Math.min(B.ultimaAposta, apostaMaxima()));
  salvarBJ();
  return true;
}

/* ---------- Modo treino: estratégia básica ---------- */
export function sugestaoBJ(){
  const a = acoesBJ(), m = maoAtiva();
  if (!m || !a.ficar) return null;
  const up = valorCarta(B.banca.cartas[0]), v = valorMao(m.cartas);
  const par = m.cartas.length === 2 && valorCarta(m.cartas[0]) === valorCarta(m.cartas[1]);
  if (a.dividir && par){
    const p = valorCarta(m.cartas[0]);
    if (p === 11 || p === 8 || (p === 9 && ![7, 10, 11].includes(up)) || (p === 7 && up <= 7) || (p === 6 && up <= 6) ||
        ((p === 2 || p === 3) && up <= 7) || (p === 4 && (up === 5 || up === 6))) return 'dividir';
  }
  const t = v.total, dobra = (cond, plano) => (cond && a.dobrar ? 'dobrar' : plano);
  if (v.soft){
    if (t >= 19) return 'ficar';
    if (t === 18) return up >= 3 && up <= 6 ? dobra(true, 'ficar') : (up === 2 || up === 7 || up === 8 ? 'ficar' : 'pedir');
    if (t === 17) return dobra(up >= 3 && up <= 6, 'pedir');
    if (t === 15 || t === 16) return dobra(up >= 4 && up <= 6, 'pedir');
    return dobra(up === 5 || up === 6, 'pedir');
  }
  if (t >= 17) return 'ficar';
  if (t >= 13) return up <= 6 ? 'ficar' : 'pedir';
  if (t === 12) return up >= 4 && up <= 6 ? 'ficar' : 'pedir';
  if (t === 11) return dobra(up <= 10, 'pedir');
  if (t === 10) return dobra(up <= 9, 'pedir');
  if (t === 9) return dobra(up >= 3 && up <= 6, 'pedir');
  return 'pedir';
}
/* Chance de estourar se pedir carta (cartas ainda não vistas, contando a carta fechada da banca) */
export function chanceEstourarBJ(){
  const m = maoAtiva();
  if (!m) return 0;
  const naoVistas = B.shoe.concat([B.banca.cartas[1]]);
  const total = valorMao(m.cartas), pior = valorMao(m.cartas).total;
  const estoura = naoVistas.filter(c => valorMao(m.cartas.concat([c])).total > 21).length;
  return naoVistas.length ? estoura / naoVistas.length : 0;
}

/* ---------- Salvamento ---------- */
export function salvarBJ(){
  if (!B) return;
  if (B.fimDeJogo) LS.del(BJ_SAVE_KEY); else LS.set(BJ_SAVE_KEY, B);
}
export function carregarBJ(){
  const sv = LS.get(BJ_SAVE_KEY, null);
  return sv && sv.ver === 1 && sv.t && Array.isArray(sv.shoe) ? sv : null;
}
export function retomarBJ(){
  const sv = carregarBJ();
  if (!sv) return false;
  B = sv;
  return true;
}
export function encerrarBJ(){ B = null; }
