// Leitura e gravação no aparelho (localStorage) e opções do jogador.
import { SPEEDS } from './config.js';

export const LS = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k){ try { localStorage.removeItem(k); } catch (e) {} }
};

export const SETTINGS_KEY = 'poker.settings.v1', STATS_KEY = 'poker.stats.v1', SAVE_KEY = 'poker.save.v1';

export const settings = Object.assign({practice:false, sound:true, speed:'normal', theme:'escuro'}, LS.get(SETTINGS_KEY, {}));

export const speedMul = () => SPEEDS[settings.speed] || 1;

export function loadSave(){
  const sv = LS.get(SAVE_KEY, null);
  return sv && sv.ver === 3 && sv.t && sv.gs && Array.isArray(sv.players) && sv.players.length > 1 ? sv : null;
}
