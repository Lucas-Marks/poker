// Sons simples gerados pelo próprio aparelho (sem arquivos).
import { settings } from './armazenamento.js';

export let AC = null;

export function audio(){
  try {
    if (!AC){
      const C = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (C) AC = new C();
    }
    if (AC && AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
  return AC;
}

export function tone(freq, dur, o){
  if (!settings.sound) return;
  const ac = audio(); if (!ac) return;
  o = o || {};
  try {
    const t = ac.currentTime + (o.at || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  } catch (e) {}
}

export function noise(dur, vol){
  if (!settings.sound) return;
  const ac = audio(); if (!ac) return;
  try {
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), g = ac.createGain();
    g.gain.value = vol; src.buffer = buf; src.connect(g); g.connect(ac.destination); src.start();
  } catch (e) {}
}

export const sfx = {
  deal(){ noise(0.07, 0.12); },
  chip(){ tone(1400, 0.05, {type:'triangle', vol:0.07}); tone(1000, 0.07, {type:'triangle', vol:0.06, at:0.04}); },
  fold(){ tone(220, 0.09, {vol:0.07}); },
  turn(){ tone(660, 0.09, {vol:0.08}); },
  win(){ [523, 659, 784].forEach((f, k) => tone(f, 0.18, {vol:0.09, at:k * 0.09})); },
  lose(){ [330, 262, 196].forEach((f, k) => tone(f, 0.25, {type:'triangle', vol:0.09, at:k * 0.14})); },
  victory(){ [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.28, {vol:0.11, at:k * 0.12})); },
  ach(){ tone(988, 0.12, {vol:0.09}); tone(1319, 0.22, {vol:0.09, at:0.1}); },
  blind(){ tone(440, 0.1, {type:'square', vol:0.04}); tone(440, 0.1, {type:'square', vol:0.04, at:0.14}); }
};
