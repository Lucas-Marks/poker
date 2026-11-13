// Ações dos botões do blackjack (clássico e arcade) e navegação entre os jogos.
import { speedMul } from './armazenamento.js';
import { A, comprarArc, novaPartidaArc, passoIA, pararArc, proximaRodadaArc, retomarArc, salvarArc, usarEsp, encerrarArc, carregarArc, dicaArc } from './arcade.js';
import { B, apostaMaxima, apostarBJ, carregarBJ, dividirBJ, dobrarBJ, encerrarBJ, ficarBJ, novaMesaBJ, pedirBJ, proximaRodadaBJ, retomarBJ, salvarBJ } from './blackjack.js';
import { ARC_OPPS, BJ_TABLES } from './config.js';
import { ui } from './estado.js';
import { show } from './interface.js';
import { renderAjudaEsp, renderArc, renderBJ, renderBJMenu, renderFim21 } from './interface21.js';
import { $, clamp, fmt } from './util.js';

export function iniciar21(){ renderAjudaEsp(); }

/* Pergunta antes de substituir uma partida salva do mesmo jogo */
function guardar(temSalva, fn){
  if (temSalva){
    ui.pendingStart = fn;
    $('mText').textContent = 'Você tem uma partida salva deste jogo. Começar outra substitui a partida salva.';
    $('modal').hidden = false;
  } else fn();
}

/* Arcade: o adversário joga uma ação de cada vez, com uma pausa entre elas */
let timerArc = null;
export function cicloArc(){
  clearTimeout(timerArc);
  renderArc();
  if (!A || A.fase !== 'jogo' || A.vez !== 'o') return;
  timerArc = setTimeout(() => { passoIA(); cicloArc(); }, 750 * speedMul());
}

export function aoSlider21(v){
  ui.bjVal = v;
  $('bjVal').textContent = fmt(v);
}

function abrirBJ(){ ui.modo21 = 'bj'; ui.exit21 = false; ui.bjVal = B.apostaAtual; show('bj'); renderBJ(); }
function abrirArc(){ ui.modo21 = 'arc'; ui.exit21 = false; show('arc'); cicloArc(); }

/* Devolve true se a ação pertence a estes jogos (e já foi tratada) */
export function acao21(a, d){
  switch (a){
    case 'home': clearTimeout(timerArc); show('home'); return true;
    case 'gpoker': show('menu'); return true;
    case 'gbj': ui.bjTab = ui.bjTab || 'classico'; renderBJMenu(); show('bjmenu'); return true;
    case 'bjtab': ui.bjTab = d.t; renderBJMenu(); return true;

    /* --- clássico --- */
    case 'bjmesa': guardar(!!carregarBJ(), () => { novaMesaBJ(BJ_TABLES[+d.i]); abrirBJ(); }); return true;
    case 'bjresume': if (retomarBJ()) abrirBJ(); return true;
    case 'bjmin': if (B) { ui.bjVal = B.t.min; renderBJ(); } return true;
    case 'bjmax': if (B) { ui.bjVal = apostaMaxima(); renderBJ(); } return true;
    case 'bjrep': if (B) { ui.bjVal = clamp(B.ultimaAposta, B.t.min, Math.max(B.t.min, apostaMaxima())); renderBJ(); } return true;
    case 'bjbet': if (B) { apostarBJ(ui.bjVal); renderBJ(); } return true;
    case 'bjhit': if (B) { pedirBJ(); renderBJ(); } return true;
    case 'bjstand': if (B) { ficarBJ(); renderBJ(); } return true;
    case 'bjdouble': if (B) { dobrarBJ(); renderBJ(); } return true;
    case 'bjsplit': if (B) { dividirBJ(); renderBJ(); } return true;
    case 'bjnext': if (B) { proximaRodadaBJ(); ui.bjVal = B.apostaAtual; renderBJ(); } return true;
    case 'bjfim': if (B) { renderFim21('bj'); show('fim21'); } return true;
    case 'bjexit': ui.exit21 = true; renderBJ(); return true;
    case 'bjstay': ui.exit21 = false; renderBJ(); return true;
    case 'bjleave': ui.exit21 = false; salvarBJ(); encerrarBJ(); renderBJMenu(); show('bjmenu'); return true;

    /* --- arcade --- */
    case 'arcopp': guardar(!!carregarArc(), () => { novaPartidaArc(ARC_OPPS[+d.i]); abrirArc(); }); return true;
    case 'arcresume': if (retomarArc()) abrirArc(); return true;
    case 'arcuse': if (A && A.vez === 'p') { usarEsp('p', +d.k); cicloArc(); } return true;
    case 'arcdraw': if (A) { comprarArc('p'); cicloArc(); } return true;
    case 'arcstand': if (A) { pararArc('p'); cicloArc(); } return true;
    case 'arcnext': if (A) { proximaRodadaArc(); cicloArc(); } return true;
    case 'arcfim': if (A) { clearTimeout(timerArc); renderFim21('arc'); show('fim21'); } return true;
    case 'arcexit': ui.exit21 = true; renderArc(); return true;
    case 'arcstay': ui.exit21 = false; cicloArc(); return true;
    case 'arcleave': clearTimeout(timerArc); ui.exit21 = false; salvarArc(); encerrarArc(); ui.bjTab = 'arcade'; renderBJMenu(); show('bjmenu'); return true;

    /* --- tela final --- */
    case 'again21':
      if (ui.modo21 === 'bj' && B){ novaMesaBJ(B.t); abrirBJ(); }
      else if (ui.modo21 === 'arc' && A){ novaPartidaArc(ARC_OPPS.find(o => o.id === A.t.id)); abrirArc(); }
      return true;
    case 'menu21':
      clearTimeout(timerArc);
      if (ui.modo21 === 'arc'){ encerrarArc(); ui.bjTab = 'arcade'; } else { encerrarBJ(); ui.bjTab = 'classico'; }
      renderBJMenu(); show('bjmenu');
      return true;
    default: return false;
  }
}
