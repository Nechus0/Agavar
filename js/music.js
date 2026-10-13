// Small chiptune soundtrack, generated live with WebAudio (no audio files).
// Square-wave lead and arpeggio, triangle bass, noise drums – an 8-bit vibe.
import { audioContext } from './sound.js';

const BPM = 132;
const STEP = 60 / BPM / 4; // one 16th note in seconds
const _ = null;

// A minor: Am – F – C – G, one bar (16 steps) per chord
const CHORDS = [
  { bass: 45, tones: [69, 72, 76, 81] },
  { bass: 41, tones: [65, 69, 72, 77] },
  { bass: 48, tones: [67, 72, 76, 79] },
  { bass: 43, tones: [67, 71, 74, 79] },
];
// lead melody, 4 bars; the second time round the lead rests and only the arpeggio plays
const LEAD = [
  76, _, _, 74, 76, _, 79, _, 76, _, 74, _, 72, _, _, _,
  72, _, _, 71, 72, _, 74, _, 72, _, 69, _, _, _, _, _,
  67, _, 72, _, 76, _, 79, _, 77, _, 76, _, 74, _, _, _,
  74, _, _, 72, 74, _, 76, _, 71, _, _, _, 67, _, _, _,
];
const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 1, 3];

const freq = (m) => 440 * 2 ** ((m - 69) / 12);

let master = null, noise = null, timer = 0, step = 0, nextTime = 0, playing = false;

function setup(a) {
  if (master) return;
  master = a.createGain();
  master.gain.value = 0.0001;
  master.connect(a.destination);
  noise = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate);
  const d = noise.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
}

function note(a, type, midi, t, dur, vol) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq(midi), t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function drum(a, t, kind) {
  if (kind === 'kick') {
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.17);
    return;
  }
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = a.createGain();
  const dur = kind === 'hat' ? 0.04 : 0.12;
  g.gain.setValueAtTime(kind === 'hat' ? 0.12 : 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t); src.stop(t + dur + 0.02);
}

function schedule(a, s, t) {
  const bar = Math.floor(s / 16) % 4;
  const pos = s % 16;
  const round = Math.floor(s / 64) % 2;
  const chord = CHORDS[bar];
  // bass: eighth notes, root and octave
  if (pos % 2 === 0) note(a, 'triangle', chord.bass + (pos % 4 === 2 ? 12 : 0), t, STEP * 1.8, 0.35);
  // arpeggio
  note(a, 'square', chord.tones[ARP[pos]], t, STEP * 0.9, round ? 0.07 : 0.045);
  // lead (first round only)
  const m = LEAD[bar * 16 + pos];
  if (!round && m) note(a, 'square', m + 12, t, STEP * 2.6, 0.08);
  // drums
  if (pos === 0 || pos === 8 || (round && pos === 10)) drum(a, t, 'kick');
  if (pos === 4 || pos === 12) drum(a, t, 'snare');
  if (pos % 2 === 1) drum(a, t, 'hat');
}

export function startMusic() {
  const a = audioContext();
  if (!a || playing) return;
  setup(a);
  playing = true;
  step = 0;
  nextTime = a.currentTime + 0.08;
  master.gain.cancelScheduledValues(a.currentTime);
  master.gain.setValueAtTime(0.0001, a.currentTime);
  master.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 1.2);
  // look-ahead scheduler: plan notes slightly ahead so timing stays tight
  timer = setInterval(() => {
    while (nextTime < a.currentTime + 0.15) {
      schedule(a, step++, nextTime);
      nextTime += STEP;
    }
  }, 25);
}

export function stopMusic() {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  const a = audioContext();
  if (a && master) {
    master.gain.cancelScheduledValues(a.currentTime);
    master.gain.setValueAtTime(master.gain.value, a.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.4);
  }
}
