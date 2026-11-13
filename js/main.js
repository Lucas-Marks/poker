// Ponto de entrada: liga os eventos da tela e inicia o jogo.
import { LS, SETTINGS_KEY, settings } from './armazenamento.js';
import { TABLES, THEMES, autoBlinds } from './config.js';
import { ui } from './estado.js';
import { resetStats } from './estatisticas.js';
import { applyTheme, guardNew, raiseRange, render, renderAch, renderActions, renderHist, renderMenu, renderOpts, renderStats, show } from './interface.js';
import { G, doCall, doFold, doRaise, encerrarPartida, newGame, next, registerShow, resumeGame, showEnd, startHand, totalPot } from './jogo.js';
import { cust, deletePreset, initCustomControls, onPreset, readCustom, readInt, rebuildPresets, refreshCustom, savePreset, say } from './personalizada.js';
import { acao21, aoSlider21, iniciar21 } from './acoes21.js';
import { aplicarIcones } from './icones.js';
import { audio, sfx } from './som.js';
import { $, clamp, fmt } from './util.js';

$('oTheme').innerHTML = THEMES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');

applyTheme(settings.theme);

aplicarIcones();

iniciar21();

renderMenu();

initCustomControls();

rebuildPresets();

refreshCustom();

document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'slider'){
    ui.val = +e.target.value;
    $('rv').textContent = fmt(ui.val);
  } else if (id === 'bjSlider'){
    aoSlider21(+e.target.value);
  } else if (id === 'cChips'){
    say(''); refreshCustom();
  } else if (id === 'cSB' || id === 'cBB' || id === 'cName'){
    say('');
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'cPreset') return onPreset(t.value);
  if (t.id === 'cPlayers'){ cust.players = +t.value; say(''); return refreshCustom(); }
  if (t.id === 'cDiff'){ cust.diff = t.value; return refreshCustom(); }
  if (t.id === 'cEvery'){ cust.every = +t.value; return; }
  if (t.id === 'oTheme'){ settings.theme = t.value; LS.set(SETTINGS_KEY, settings); applyTheme(t.value); return; }
  if (t.dataset && t.dataset.bot !== undefined){ cust.bots[+t.dataset.bot] = t.value; }
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a;
  audio();
  if (acao21(a, b.dataset)) return;

  if (a === 'table') return guardNew(() => newGame(TABLES[+b.dataset.i]));
  if (a === 'custom'){ say(''); refreshCustom(); return show('custom'); }
  if (a === 'cback') return show('menu');
  if (a === 'crise'){ cust.rise = !cust.rise; say(''); return refreshCustom(); }
  if (a === 'cprop'){
    cust.prop = !cust.prop;
    if (!cust.prop){
      const c = readInt('cChips');
      if (c >= 1){ const bl = autoBlinds(c); $('cSB').value = bl.sb; $('cBB').value = bl.bb; }
    }
    say('');
    return refreshCustom();
  }
  if (a === 'cplay'){
    const r = readCustom();
    if (r.err) return say(r.err);
    return guardNew(() => { say(''); newGame(r.cfg); });
  }
  if (a === 'csave') return savePreset();
  if (a === 'cdel') return deletePreset();
  if (a === 'stats'){ renderStats(); return show('stats'); }
  if (a === 'ach'){ renderAch(); return show('ach'); }
  if (a === 'opts'){ ui.confirmReset = false; renderOpts(); return show('opts'); }
  if (a === 'mback'){ ui.confirmReset = false; return show('home'); }
  if (a === 'help') return show('help');
  if (a === 'mno'){ $('modal').hidden = true; ui.pendingStart = null; return; }
  if (a === 'myes'){ $('modal').hidden = true; const fn = ui.pendingStart; ui.pendingStart = null; if (fn) fn(); return; }
  if (a === 'ospeed'){
    const o = ['lenta', 'normal', 'rapida'];
    settings.speed = o[(o.indexOf(settings.speed) + 1) % o.length];
    LS.set(SETTINGS_KEY, settings);
    return renderOpts();
  }
  if (a === 'resume') return resumeGame();
  if (a === 'osound'){ settings.sound = !settings.sound; LS.set(SETTINGS_KEY, settings); renderOpts(); if (settings.sound) sfx.chip(); return; }
  if (a === 'otrain'){ settings.practice = !settings.practice; LS.set(SETTINGS_KEY, settings); return renderOpts(); }
  if (a === 'oreset'){
    if (!ui.confirmReset){ ui.confirmReset = true; return renderOpts(); }
    resetStats(); ui.confirmReset = false; return renderOpts();
  }
  if (a === 'menu'){
    encerrarPartida(); ui.exiting = false; show('menu'); return;
  }
  if (!G) return;
  if (a === 'hist'){ renderHist(); $('hist').hidden = false; return; }
  if (a === 'hclose'){ $('hist').hidden = true; return; }
  if (a === 'exit'){ ui.exiting = true; return renderActions(); }
  if (a === 'stay'){ ui.exiting = false; return renderActions(); }
  if (a === 'again') return newGame(G.t);
  if (a === 'win'){ if (G.victory || G.over) showEnd(); return; }
  if (a === 'next'){ if (G.ended && !G.over) startHand(); return; }
  if (a === 'show'){
    if (G.ended && !G.players[0].folded){ G.players[0].show = true; registerShow(); render(); }
    return;
  }

  if (G.ended || G.toAct !== 0) return;
  const me = G.players[0];
  if (a === 'fold') return doFold(0);
  if (a === 'call') return doCall(0);
  if (a === 'open'){
    ui.raising = true; ui.val = raiseRange().min; return renderActions();
  }
  if (a === 'cancel'){ ui.raising = false; return renderActions(); }
  if (a === 'pre'){
    const {min, max} = raiseRange();
    const toCall = G.currentBet - me.bet;
    ui.val = clamp(Math.round(G.currentBet + (totalPot() + toCall) * +b.dataset.p), min, max);
    return renderActions();
  }
  if (a === 'allin'){ ui.val = raiseRange().max; return renderActions(); }
  if (a === 'confirm'){
    const {min, max} = raiseRange();
    ui.raising = false;
    return doRaise(0, clamp(ui.val, min, max));
  }
});

// Service worker: guarda os arquivos para o jogo abrir sem internet
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
