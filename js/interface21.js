// Desenho das telas do blackjack (clássico e arcade).
import { settings } from './armazenamento.js';
import { A, CARTAS, MAX_ESP, carregarArc, dicaArc, podeAplicar, podeComprar, soma } from './arcade.js';
import { B, acoesBJ, apostaMaxima, carregarBJ, chanceEstourarBJ, sugestaoBJ, valorMao } from './blackjack.js';
import { ARC_OPPS, BJ_TABLES, DIFF, PERS } from './config.js';
import { ui } from './estado.js';
import { cardHTML } from './interface.js';
import { $, clamp, fmt } from './util.js';

const pct = x => Math.round(x * 100) + '%';

/* Cada carta só anima na primeira vez que aparece (a tela é redesenhada a cada ação) */
const vistas = {};
function novas(chave, n){ const antes = vistas[chave] || 0; vistas[chave] = n; return antes; }

const cartaNum = (n, extra, oculta) => `<div class="card md num${oculta ? ' oculta' : ''}${extra ? ' ' + extra : ''}"><b>${n}</b></div>`;
const pips = (hp, max) => '<span class="pips">' + Array.from({length: max}, (_, i) => `<i class="pip${i < hp ? ' on' : ''}"></i>`).join('') + '</span>';

/* ---------- Ajuda: lista das cartas especiais ---------- */
export function renderAjudaEsp(){
  $('helpEsp').innerHTML = Object.values(CARTAS).map(c => `<div class="hp"><b>${c.nome}.</b> ${c.desc}</div>`).join('');
}

/* ---------- Menu do blackjack ---------- */
export function renderBJMenu(){
  const aba = ui.bjTab || 'classico';
  $('bjtC').className = aba === 'classico' ? 'on' : '';
  $('bjtA').className = aba === 'arcade' ? 'on' : '';
  $('bjdesc').textContent = aba === 'classico'
    ? 'Contra a banca. Alcance a meta de fichas antes de ficar sem apostas.'
    : 'Duelo 1 contra 1 com cartas especiais. Quem ficar sem fichas perde.';
  let html = '';
  if (aba === 'classico'){
    const sv = carregarBJ();
    if (sv) html += `<button class="opt" data-a="bjresume">
      <span class="ol"><span class="on">Continuar partida</span><span class="od c-${sv.t.diff}">${DIFF[sv.t.diff].label}${sv.practice ? ' (treino)' : ''}</span></span>
      <span class="or"><span class="ob">Mesa ${fmt(sv.t.buy)}, rodada ${sv.rodada}</span><span class="op">Fichas ${fmt(sv.chips)}</span></span></button>`;
    html += BJ_TABLES.map((t, i) => `<button class="opt" data-a="bjmesa" data-i="${i}">
      <span class="ol"><span class="on">Mesa ${fmt(t.buy)}</span><span class="od c-${t.diff}">${DIFF[t.diff].label}</span></span>
      <span class="or"><span class="ob">Apostas ${fmt(t.min)} a ${fmt(t.max)}</span><span class="op">Meta ${fmt(t.goal)}</span></span></button>`).join('');
  } else {
    const sv = carregarArc();
    if (sv) html += `<button class="opt" data-a="arcresume">
      <span class="ol"><span class="on">Continuar partida</span><span class="od c-${sv.t.diff}">${DIFF[sv.t.diff].label}${sv.practice ? ' (treino)' : ''}</span></span>
      <span class="or"><span class="ob">contra ${sv.t.nome}, rodada ${sv.rodada}</span><span class="op">Você ${sv.hp.p} x ${sv.hp.o}</span></span></button>`;
    html += ARC_OPPS.map((o, i) => `<button class="opt" data-a="arcopp" data-i="${i}">
      <span class="ol"><span class="on">${o.nome}</span><span class="od c-${o.diff}">${DIFF[o.diff].label}</span></span>
      <span class="or"><span class="ob">Duelo 1 x 1</span><span class="op">${o.hp} fichas</span></span></button>`).join('');
  }
  $('bjlist').innerHTML = html;
}

/* ---------- Blackjack clássico ---------- */
export function renderBJ(){
  if (!B) return;
  $('bjInfo').innerHTML = `<span>Mesa ${fmt(B.t.buy)}</span><span class="c-${B.t.diff}">${DIFF[B.t.diff].label}</span><span class="dim">Fichas ${fmt(B.chips)}</span>${B.practice ? '<span>Treino</span>' : ''}`;
  const chave = B.gid + '|' + B.rodada;

  const bc = B.banca.cartas, antesB = novas(chave + '|d', bc.length);
  const totalB = !bc.length ? '' : B.banca.oculta ? valorMao([bc[0]]).total + ' + ?' : valorMao(bc).total;
  $('bjDealer').innerHTML = `<div class="cab21"><span>Banca</span><b>${totalB}</b></div>
    <div class="cartas21">${bc.map((c, i) => (i === 1 && B.banca.oculta) ? cardHTML('b', 'md') : cardHTML(c, 'md', i >= antesB ? 'new' : '', (i - antesB) * 90)).join('')}</div>
    <div class="cab21"><span>Meta ${fmt(B.t.goal)}</span><span>${B.t.decks} ${B.t.decks === 1 ? 'baralho' : 'baralhos'}, blackjack paga ${B.t.pagamento.replace(':', ' para ')}</span></div>`;

  const nomes = {blackjack: 'Blackjack!', ganhou: 'Ganhou', empate: 'Empate', perdeu: 'Perdeu', estourou: 'Estourou'};
  $('bjHands').innerHTML = B.maos.map((h, i) => {
    const antes = novas(chave + '|h' + i, h.cartas.length), v = valorMao(h.cartas);
    const ativa = B.fase === 'jogo' && i === B.ativa && !h.feita;
    return `<div class="mao21${ativa ? ' ativa' : ''}">
      <div class="cab21"><span>${B.maos.length > 1 ? 'Mão ' + (i + 1) : 'Você'}</span><b>${v.total}${v.soft && v.total < 21 ? ' (com ás)' : ''}</b></div>
      <div class="cartas21">${h.cartas.map((c, k) => cardHTML(c, 'md', k >= antes ? 'new' : '', (k - antes) * 90)).join('')}</div>
      <div class="cab21"><span>Aposta ${fmt(h.aposta)}${h.dobrou ? ' (dobrada)' : ''}</span><span class="tag21">${h.resultado ? nomes[h.resultado] : ''}</span></div></div>`;
  }).join('');
  $('bjMsg').textContent = B.msg || B.aviso || (B.fase === 'aposta' ? 'Faça a sua aposta.' : '');

  let treino = '&nbsp;';
  if (B.practice && B.fase === 'jogo'){
    const s = sugestaoBJ();
    if (s) treino = `<span>Sugestão: ${{pedir: 'Pedir', ficar: 'Ficar', dobrar: 'Dobrar', dividir: 'Dividir'}[s]}</span><span>Chance de estourar: ${pct(chanceEstourarBJ())}</span>`;
  }
  $('bjTrain').innerHTML = treino;

  const el = $('bjActions');
  if (ui.exit21){
    el.innerHTML = `<div class="note">Sair da mesa? A partida fica salva e você pode continuar depois.</div>
      <div class="row"><button data-a="bjstay">Continuar jogando</button><button data-a="bjleave">Sair</button></div>`;
  } else if (B.fase === 'aposta'){
    const min = B.t.min, max = Math.max(min, apostaMaxima());
    ui.bjVal = clamp(ui.bjVal || B.apostaAtual, min, max);
    el.innerHTML = `<div class="ajusteaposta"><div class="rz-top"><span class="dim">Aposta</span><strong id="bjVal">${fmt(ui.bjVal)}</strong></div>
        <input id="bjSlider" type="range" min="${min}" max="${max}" step="${min}" value="${ui.bjVal}" ${min === max ? 'disabled' : ''} aria-label="Valor da aposta"></div>
      <div class="row"><button data-a="bjmin">Mínima</button><button data-a="bjmax">Máxima</button><button data-a="bjrep">Repetir</button></div>
      <div class="row"><button data-a="bjbet">Apostar</button></div>`;
  } else if (B.fase === 'jogo'){
    const a = acoesBJ(), b = (acao, rotulo, ok) => `<button data-a="${acao}"${ok ? '' : ' disabled'}>${rotulo}</button>`;
    el.innerHTML = `<div class="row">${b('bjhit', 'Pedir', a.pedir)}${b('bjstand', 'Ficar', a.ficar)}</div>
      <div class="row">${b('bjdouble', 'Dobrar', a.dobrar)}${b('bjsplit', 'Dividir', a.dividir)}</div>`;
  } else if (B.fimDeJogo){
    el.innerHTML = `<div class="note">${B.fimDeJogo === 'vitoria' ? 'Você alcançou a meta!' : 'Suas fichas acabaram.'}</div><div class="row"><button data-a="bjfim">Continuar</button></div>`;
  } else {
    el.innerHTML = `<div class="row"><button data-a="bjnext">Próxima rodada</button></div>`;
  }
}

/* ---------- Blackjack arcade ---------- */
export function renderArc(){
  if (!A) return;
  const persona = A.t.pers === 'mimico' ? 'Mímico (' + PERS[(A.imit || {id: 'copiador'}).id].label + ')' : PERS[A.t.pers].label;
  $('arcInfo').innerHTML = `<span>${A.t.nome}</span><span class="c-${A.t.diff}">${DIFF[A.t.diff].label}</span><span class="dim">Rodada ${A.rodada}</span>${A.practice ? '<span>Treino</span>' : ''}`;
  const chave = A.gid + '|' + A.rodada, fim = A.fase === 'resultado';
  const o = A.lado.o, p = A.lado.p;

  const antesO = novas(chave + '|o', o.cartas.length);
  const cartasO = o.cartas.map((n, i) => {
    const extra = i >= antesO ? 'new' : '';
    if (i === 0 && !fim) return p.viu != null ? cartaNum(p.viu, '', true) : cardHTML('b', 'md');
    return cartaNum(n, extra);
  }).join('');
  const visO = soma(o.cartas.slice(1));
  $('arcOpp').innerHTML = `<div class="cab21"><span>${A.t.nome}${A.practice ? ' (' + persona + ')' : ''}</span>${pips(A.hp.o, A.t.hp)}</div>
    <div class="cartas21">${cartasO}</div>
    <div class="cab21"><span>Cartas especiais: ${o.esp.length} de ${MAX_ESP}${o.congelado ? ', congelado' : ''}</span><span>${fim ? soma(o.cartas) : visO + ' + ?'}</span></div>`;

  $('arcAviso').textContent = A.aviso;
  const ultimas = A.log.slice(-2).join(' ');
  $('arcMsg').textContent = fim ? A.msg : `Alvo ${A.alvo}. Em jogo: ${A.aposta}${A.escudo.p ? ' (seu escudo: ' + A.escudo.p + ')' : ''}.` + (ultimas ? '\n' + ultimas : '');

  const antesP = novas(chave + '|p', p.cartas.length);
  $('arcMe').innerHTML = `<div class="cab21"><span>Você</span>${pips(A.hp.p, A.t.hp)}</div>
    <div class="cartas21">${p.cartas.map((n, i) => cartaNum(n, i >= antesP ? 'new' : '', i === 0)).join('')}</div>
    <div class="cab21"><span>${p.congelado ? 'Congelado: não pode comprar' : 'A 1ª carta (tracejada) só você vê'}</span><b>${soma(p.cartas)}${soma(p.cartas) > A.alvo ? ' (passou)' : ''}</b></div>`;

  const minhaVez = A.fase === 'jogo' && A.vez === 'p' && !ui.exit21;
  $('arcEsp').innerHTML = p.esp.length
    ? `<div class="espgrid">${p.esp.map((id, i) => `<button data-a="arcuse" data-k="${i}"${minhaVez && podeAplicar('p', id) ? '' : ' disabled'}><b>${CARTAS[id].nome}</b><small>${CARTAS[id].desc}</small></button>`).join('')}</div>`
    : '<div class="note">Sem cartas especiais.</div>';

  let treino = '&nbsp;';
  if (A.practice && A.fase === 'jogo' && A.vez === 'p'){
    const d = dicaArc();
    if (d) treino = `<span>Chance de estourar: ${pct(d.bust)}</span><span>Sugestão: ${d.acao === 'comprar' ? 'Comprar' : 'Parar'}</span>`;
  }
  $('arcTrain').innerHTML = treino;

  const el = $('arcActions');
  if (ui.exit21){
    el.innerHTML = `<div class="note">Sair do duelo? A partida fica salva e você pode continuar depois.</div>
      <div class="row"><button data-a="arcstay">Continuar jogando</button><button data-a="arcleave">Sair</button></div>`;
  } else if (A.fase === 'jogo' && A.vez === 'p'){
    el.innerHTML = `<div class="row"><button data-a="arcdraw"${podeComprar('p') ? '' : ' disabled'}>Comprar</button><button data-a="arcstand">Parar</button></div>`;
  } else if (A.fase === 'jogo'){
    el.innerHTML = `<div class="note">Vez de ${A.t.nome}…</div>`;
  } else if (A.fim){
    el.innerHTML = `<div class="note">${A.fim === 'vitoria' ? 'Você venceu o duelo!' : 'Suas fichas acabaram.'}</div><div class="row"><button data-a="arcfim">Continuar</button></div>`;
  } else {
    el.innerHTML = `<div class="row"><button data-a="arcnext">Próxima rodada</button></div>`;
  }
}

/* ---------- Tela final (vitória ou derrota) ---------- */
export function renderFim21(modo){
  if (modo === 'bj'){
    const v = B.fimDeJogo === 'vitoria';
    $('fimTitulo').textContent = v ? 'Vitória' : 'Derrota';
    $('fimTexto').textContent = v
      ? `Você alcançou a meta de ${fmt(B.t.goal)} fichas na Mesa ${fmt(B.t.buy)} em ${B.gs.rounds} rodadas.`
      : `Suas fichas acabaram na Mesa ${fmt(B.t.buy)} depois de ${B.gs.rounds} rodadas. Você chegou a ${fmt(B.chips)} fichas.`;
    $('fimAch').textContent = B.novasConquistas.length ? 'Conquistas desbloqueadas: ' + B.novasConquistas.join(', ') + '.' : '';
  } else {
    const v = A.fim === 'vitoria';
    $('fimTitulo').textContent = v ? 'Vitória' : 'Derrota';
    $('fimTexto').textContent = v
      ? `Você venceu ${A.t.nome} em ${A.gs.rounds} rodadas, com ${A.hp.p} ${A.hp.p === 1 ? 'ficha' : 'fichas'} sobrando.`
      : `${A.t.nome} venceu o duelo em ${A.gs.rounds} rodadas.`;
    $('fimAch').textContent = A.novasConquistas.length ? 'Conquistas desbloqueadas: ' + A.novasConquistas.join(', ') + '.' : '';
  }
}
