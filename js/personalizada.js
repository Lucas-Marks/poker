// Mesa personalizada e presets salvos.
import { DIFF, DIFF_IDS, PERS, PERS_IDS, TABLES, autoBlinds } from './config.js';
import { newGame } from './jogo.js';
import { $, esc, fmt } from './util.js';

export const cust = {prop:true, players:4, diff:'medio', bots:['auto','auto','auto'], preset:'manual', rise:true, every:10};

export const STORE_KEY = 'poker.presets.v1';

export let saved = [];

try {
  const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  if (Array.isArray(raw)) saved = raw.filter(p => p && typeof p.name === 'string' && p.buy >= 20 && p.players >= 2 && p.players <= 8 && DIFF[p.diff]);
} catch (e) { saved = []; }

export function persist(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); return true; }
  catch (e) { return false; }
}

export const readInt = id => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? v : NaN; };

export const say = (m, ok) => { const e = $('cErr'); e.textContent = m; e.className = 'err' + (ok ? ' ok' : ''); };

export function fitBots(){
  while (cust.bots.length < cust.players - 1) cust.bots.push('auto');
  cust.bots.length = cust.players - 1;
}

export function initCustomControls(){
  $('cPlayers').innerHTML = [2,3,4,5,6,7,8].map(n => `<option value="${n}">${n} jogadores</option>`).join('');
  $('cDiff').innerHTML = DIFF_IDS.map(d => `<option value="${d}">${DIFF[d].label}</option>`).join('');
  $('cEvery').innerHTML = [5, 8, 10, 12, 15, 20].map(n => `<option value="${n}">${n} mãos</option>`).join('');
}

export function rebuildPresets(){
  const tOpts = TABLES.map((t, i) => `<option value="t${i}">Mesa ${fmt(t.buy)} (${DIFF[t.diff].label})</option>`).join('');
  const sOpts = saved.map(p => `<option value="s:${esc(p.name)}">${esc(p.name)}</option>`).join('');
  $('cPreset').innerHTML = `<option value="manual">Manual</option><optgroup label="Mesas">${tOpts}</optgroup>` +
    (saved.length ? `<optgroup label="Salvas">${sOpts}</optgroup>` : '');
  $('cPreset').value = cust.preset;
}

export function refreshCustom(){
  fitBots();
  $('cPropV').textContent = cust.prop ? 'Ligado' : 'Desligado';
  $('cPropV').className = cust.prop ? '' : 'dim';
  $('cInfo').hidden = !cust.prop;
  $('cSBrow').hidden = cust.prop;
  $('cBBrow').hidden = cust.prop;
  if (cust.prop){
    const c = readInt('cChips');
    if (c >= 1){ const b = autoBlinds(c); $('cInfoV').textContent = fmt(b.sb) + ' / ' + fmt(b.bb); }
    else $('cInfoV').textContent = '—';
  }
  $('cPlayers').value = String(cust.players);
  $('cDiff').value = cust.diff;
  $('cRiseV').textContent = cust.rise ? 'Ligado' : 'Desligado';
  $('cRiseV').className = cust.rise ? '' : 'dim';
  $('cEveryRow').hidden = !cust.rise;
  $('cEvery').value = String(cust.every);
  $('cDiff').style.color = 'var(--' + (cust.diff === 'facil' ? 'green' : cust.diff === 'medio' ? 'yellow' : 'red') + ')';
  const opts = ['auto'].concat(PERS_IDS);
  $('cBots').innerHTML = cust.bots.map((b, k) =>
    `<label class="field sel"><span>Adversário ${k + 1}</span><select data-bot="${k}" aria-label="Adversário ${k + 1}">` +
    opts.map(o => `<option value="${o}"${o === b ? ' selected' : ''}>${o === 'auto' ? 'Automático' : PERS[o].label}</option>`).join('') +
    `</select></label>`
  ).join('');
  $('cDel').hidden = cust.preset.slice(0, 2) !== 's:';
}

export function loadInto(src){
  $('cChips').value = src.buy;
  cust.prop = !!src.prop;
  $('cSB').value = src.sb; $('cBB').value = src.bb;
  cust.players = src.players; cust.diff = src.diff;
  cust.rise = src.rise === undefined ? true : !!src.rise; cust.every = src.every || 10;
  cust.bots = (src.bots || []).slice();
  fitBots();
}

export function onPreset(v){
  cust.preset = v;
  if (v === 'manual'){ $('cName').value = ''; return refreshCustom(); }
  const src = v[0] === 't' ? TABLES[+v.slice(1)] : saved.find(p => p.name === v.slice(2));
  if (!src){ cust.preset = 'manual'; return refreshCustom(); }
  loadInto(src);
  $('cName').value = v[0] === 's' ? src.name : '';
  say('');
  refreshCustom();
}

export function readCustom(){
  const chips = readInt('cChips');
  if (!(chips >= 20)) return {err:'Informe pelo menos 20 fichas.'};
  if (chips > 10000000) return {err:'O máximo é 10.000.000 de fichas.'};
  let sb, bb;
  if (cust.prop) ({sb, bb} = autoBlinds(chips));
  else {
    sb = readInt('cSB'); bb = readInt('cBB');
    if (!(sb >= 1) || !(bb >= 1)) return {err:'Informe o small blind e o big blind.'};
    if (bb < sb) return {err:'O big blind não pode ser menor que o small blind.'};
  }
  if (chips < bb * 5) return {err:'As fichas precisam ser pelo menos 5 vezes o big blind.'};
  fitBots();
  return {cfg:{buy:chips, sb, bb, players:cust.players, diff:cust.diff, bots:cust.bots.slice(), prop:cust.prop, rise:cust.rise, every:cust.every}};
}

export function playCustom(){
  const r = readCustom();
  if (r.err) return say(r.err);
  say('');
  newGame(r.cfg);
}

export function savePreset(){
  const name = $('cName').value.trim();
  if (!name) return say('Dê um nome ao preset.');
  const r = readCustom();
  if (r.err) return say(r.err);
  const entry = Object.assign({name}, r.cfg);
  const idx = saved.findIndex(p => p.name === name);
  if (idx >= 0) saved[idx] = entry; else saved.push(entry);
  cust.preset = 's:' + name;
  const ok = persist();
  rebuildPresets(); refreshCustom();
  say(ok ? 'Preset "' + name + '" salvo.' : 'Preset salvo apenas nesta sessão (o navegador não permite guardar).', true);
}

export function deletePreset(){
  if (cust.preset.slice(0, 2) !== 's:') return;
  const name = cust.preset.slice(2);
  saved = saved.filter(p => p.name !== name);
  persist();
  cust.preset = 'manual';
  $('cName').value = '';
  rebuildPresets(); refreshCustom();
  say('Preset "' + name + '" excluído.', true);
}
