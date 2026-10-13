// Kleine Geräusche, direkt im Browser erzeugt (WebAudio, keine Audiodateien).
// iOS erlaubt Ton erst nach einer Berührung – darum wird der AudioContext beim ersten Tippen gestartet.
let ctx = null;
let enabled = true;

export function setSoundEnabled(v) { enabled = !!v; }
export const soundEnabled = () => enabled;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// beim ersten Tippen irgendwo freischalten
['touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (enabled) ac(); }, { once: true, passive: true }));

function tone(freq, start, dur, { type = 'sine', vol = 0.15, slide = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(660, 0, 0.05, { type: 'triangle', vol: 0.05 }),
  contact: () => { tone(140, 0, 0.25, { type: 'square', vol: 0.08, slide: -60 }); tone(90, 0.05, 0.3, { vol: 0.12 }); },
  extinct: () => [523, 392, 262].forEach((f, k) => tone(f, k * 0.12, 0.18, { type: 'triangle', vol: 0.1 })),
  lead: () => { tone(392, 0, 0.12, { type: 'triangle', vol: 0.1 }); tone(587, 0.1, 0.2, { type: 'triangle', vol: 0.1 }); },
  alarm: () => [880, 660, 880].forEach((f, k) => tone(f, k * 0.14, 0.1, { type: 'square', vol: 0.05 })),
  win: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.11, k === 3 ? 0.5 : 0.16, { type: 'triangle', vol: 0.13 })),
  lose: () => [392, 349, 311, 262].forEach((f, k) => tone(f, k * 0.16, 0.25, { type: 'sine', vol: 0.12 })),
  star: () => tone(1200, 0, 0.18, { type: 'sine', vol: 0.12, slide: 600 }),
  unlock: () => [784, 988, 1175, 1568].forEach((f, k) => tone(f, k * 0.08, 0.25, { type: 'sine', vol: 0.09 })),
};

export function play(name) {
  if (!enabled || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* Ton ist nicht wichtig genug für einen Fehler */ }
}
