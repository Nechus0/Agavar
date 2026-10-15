// Kleine Geräusche, direkt im Browser erzeugt (WebAudio, keine Audiodateien).
// iOS erlaubt Ton erst nach einer Berührung – darum wird der AudioContext beim ersten Tippen gestartet.
let ctx = null;
let enabled = true;

export function setSoundEnabled(v) { enabled = !!v; }
export const soundEnabled = () => enabled;

function ac() {
  // iOS: als Medienwiedergabe abspielen – sonst schaltet der Stummschalter WebAudio (Musik und Effekte) ab
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// beim ersten Tippen irgendwo freischalten
// bei jeder Berührung sicherstellen, dass der Ton läuft (iOS hält ihn sonst nach dem Wechseln der App an)
['touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (ctx && ctx.state !== 'running') ctx.resume(); else if (!ctx) ac(); }, { passive: true }));
// App im Hintergrund: erst ganz kurz ausblenden, dann anhalten – hartes Abschneiden knackt.
// Beim Zurückkommen wieder einblenden. Alle Töne laufen über diesen Ausgang.
let out = null, hideTimer = 0;
export function output() {
  const a = ac();
  if (!a) return null;
  if (!out) { out = a.createGain(); out.connect(a.destination); }
  return out;
}
function background(hidden) {
  if (!ctx || !out) { if (ctx && hidden) ctx.suspend().catch(() => {}); return; }
  const t = ctx.currentTime;
  clearTimeout(hideTimer);
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  if (hidden) {
    out.gain.linearRampToValueAtTime(0, t + 0.12);
    hideTimer = setTimeout(() => ctx.suspend().catch(() => {}), 160);
  } else {
    out.gain.setValueAtTime(0, t);
    ctx.resume().then(() => { const n = ctx.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(0, n); out.gain.linearRampToValueAtTime(1, n + 0.6); }).catch(() => {});
  }
}
document.addEventListener('visibilitychange', () => background(document.hidden));
window.addEventListener('pagehide', () => background(true));
window.addEventListener('pageshow', () => { if (!document.hidden) background(false); });

// weicher Ton: sanfter Einsatz, langes Ausklingen (keine harten Rechteck-Klicks)
function tone(freq, start, dur, { type = 'sine', vol = 0.08, slide = 0, attack = 0.03 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(output());
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// leise, runde Klänge – keine Geräusche beim Tippen auf Knöpfe
const SOUNDS = {
  contact: () => { tone(98, 0, 0.6, { vol: 0.09, slide: -30, attack: 0.02 }); },
  extinct: () => [587, 494, 392].forEach((f, k) => tone(f, k * 0.16, 0.6, { vol: 0.05 })),
  lead: () => { tone(587, 0, 0.5, { vol: 0.05 }); tone(880, 0.14, 0.7, { vol: 0.04 }); },
  alarm: () => { tone(740, 0, 0.7, { vol: 0.045 }); tone(587, 0.22, 0.9, { vol: 0.04 }); },
  win: () => [587, 740, 880, 1175].forEach((f, k) => tone(f, k * 0.13, k === 3 ? 1.4 : 0.6, { vol: 0.06 })),
  lose: () => [440, 392, 349, 294].forEach((f, k) => tone(f, k * 0.2, 0.8, { vol: 0.05 })),
  star: () => tone(1175, 0, 0.6, { vol: 0.05, slide: 400 }),
  unlock: () => [880, 1109, 1319, 1760].forEach((f, k) => tone(f, k * 0.1, 0.8, { vol: 0.04 })),
};

// shared audio context for the music player
export const audioContext = () => ac();

export function play(name) {
  if (!enabled || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* Ton ist nicht wichtig genug für einen Fehler */ }
}
