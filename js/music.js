// Ruhige Hintergrundmusik, live mit WebAudio erzeugt (keine Audiodateien).
// Grundschicht: weiche Flächen, tiefer Bass und vereinzelte Glockentöne – läuft durchgehend in der ganzen App.
// Kampfschicht: Puls-Bass, Arpeggio und leise Trommeln – wird nur bei Kämpfen auf der Platte eingeblendet.
import { audioContext } from './sound.js';

const BPM = 72;
const STEP = 60 / BPM / 4; // eine Sechzehntel in Sekunden
const BAR = STEP * 16;

// D-Dur: Dmaj9 – Bm9 – Gmaj9 – A6sus, je zwei Takte
const CHORDS = [
  { root: 38, pad: [57, 62, 66, 69, 76] },
  { root: 35, pad: [54, 59, 62, 66, 73] },
  { root: 31, pad: [55, 59, 62, 66, 69] },
  { root: 33, pad: [57, 62, 64, 66, 71] },
];
const BELLS = [74, 76, 78, 81, 83, 86, 88]; // D-Dur pentatonisch, hoch
const ARP = [0, 2, 1, 3, 2, 4, 3, 1];

const freq = (m) => 440 * 2 ** ((m - 69) / 12);

let master = null, calm = null, fight = null, padFilter = null, verb = null, noise = null;
let timer = 0, step = 0, nextTime = 0, playing = false;
let intensity = 0, target = 0;

function impulse(a, seconds) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len) ** 2.6;
  }
  return buf;
}

function setup(a) {
  if (master) return;
  master = a.createGain();
  master.gain.value = 0.0001;
  master.connect(a.destination);
  // Hall für alles
  verb = a.createConvolver();
  verb.buffer = impulse(a, 3.2);
  const wet = a.createGain();
  wet.gain.value = 0.45;
  verb.connect(wet).connect(master);
  // ruhige Schicht: Flächen durch einen weichen Tiefpass
  calm = a.createGain();
  calm.gain.value = 1;
  padFilter = a.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 900;
  padFilter.Q.value = 0.4;
  calm.connect(padFilter);
  padFilter.connect(master);
  padFilter.connect(verb);
  // Kampfschicht: anfangs stumm
  fight = a.createGain();
  fight.gain.value = 0.0001;
  fight.connect(master);
  fight.connect(verb);
  noise = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate);
  const d = noise.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
}

// weicher Ton mit Hüllkurve
function voice(a, out, type, midi, t, { attack = 0.02, hold = 0, release = 0.5, vol = 0.1, detune = 0 }) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq(midi), t);
  if (detune) o.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + hold + release + 0.05);
}

function drum(a, t, kind, vol) {
  if (kind === 'kick') {
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(fight);
    o.start(t); o.stop(t + 0.3);
    return;
  }
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = kind === 'shaker' ? 6000 : 2200;
  f.Q.value = kind === 'shaker' ? 1.2 : 0.8;
  const g = a.createGain();
  const dur = kind === 'shaker' ? 0.05 : 0.16;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(fight);
  src.start(t); src.stop(t + dur + 0.02);
}

function schedule(a, s, t) {
  const bar = Math.floor(s / 16);
  const pos = s % 16;
  const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
  // Fläche: zu Beginn jedes Akkords, lange und leise, leicht verstimmt für Wärme
  if (pos === 0 && bar % 2 === 0) {
    for (const m of chord.pad) {
      voice(a, calm, 'sine', m, t, { attack: 1.6, hold: BAR * 2 - 2.2, release: 2.4, vol: 0.028 });
      voice(a, calm, 'triangle', m, t, { attack: 1.8, hold: BAR * 2 - 2.4, release: 2.4, vol: 0.012, detune: 7 });
    }
  }
  // tiefer Bass: ein Ton pro Takt
  if (pos === 0) voice(a, calm, 'sine', chord.root, t, { attack: 0.4, hold: BAR - 1.2, release: 1.4, vol: 0.09 });
  // Glockentöne: selten und zufällig
  if (pos % 2 === 0 && Math.random() < 0.12) {
    voice(a, calm, 'sine', BELLS[(Math.random() * BELLS.length) | 0], t, { attack: 0.01, release: 1.8, vol: 0.035 });
  }
  // Kampfschicht nur planen, wenn sie hörbar ist
  if (intensity < 0.03) return;
  if (pos % 2 === 0) voice(a, fight, 'triangle', chord.root + 12 + (pos % 8 === 4 ? 12 : 0), t, { attack: 0.01, release: STEP * 1.6, vol: 0.09 });
  voice(a, fight, 'triangle', chord.pad[ARP[pos % ARP.length] % chord.pad.length] + 12, t, { attack: 0.005, release: STEP * 1.2, vol: 0.03 });
  if (pos === 0 || pos === 8) drum(a, t, 'kick', 0.28);
  if (intensity > 0.45 && (pos === 4 || pos === 12)) drum(a, t, 'snare', 0.08);
  if (pos % 2 === 1) drum(a, t, 'shaker', 0.035);
}

// Kampfstärke 0 (ruhig) … 1 (heftiger Kampf); die Musik folgt weich
export function setIntensity(x) {
  target = Math.max(0, Math.min(1, x || 0));
}

function follow(a) {
  // schnell hoch, langsam wieder runter
  const k = target > intensity ? 0.08 : 0.012;
  intensity += (target - intensity) * k;
  const now = a.currentTime;
  fight.gain.setTargetAtTime(Math.max(0.0001, intensity * 0.9), now, 0.3);
  padFilter.frequency.setTargetAtTime(900 + intensity * 1600, now, 0.5);
}

export function startMusic() {
  const a = audioContext();
  if (!a || playing) return;
  setup(a);
  playing = true;
  nextTime = a.currentTime + 0.1;
  master.gain.cancelScheduledValues(a.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), a.currentTime);
  master.gain.exponentialRampToValueAtTime(0.55, a.currentTime + 2.5);
  // vorausplanen, damit der Takt auch bei ruckelnder Seite stabil bleibt
  timer = setInterval(() => {
    if (a.state !== 'running') return;
    follow(a);
    if (nextTime < a.currentTime) nextTime = a.currentTime + 0.05; // nach einer Pause nicht nachholen
    while (nextTime < a.currentTime + 0.3) {
      schedule(a, step++, nextTime);
      nextTime += STEP;
    }
  }, 50);
}

export function stopMusic() {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  const a = audioContext();
  if (a && master) {
    master.gain.cancelScheduledValues(a.currentTime);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), a.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
  }
}

export const musicPlaying = () => playing;
