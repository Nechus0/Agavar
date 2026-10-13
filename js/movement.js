// Bewegungsarten: verständliche Bausteine statt einzelner Schritte.
// Jede Art hat optional eine Größe und eine Drehrichtung und wird intern in ein
// Schrittmuster übersetzt, das die Simulation ausführt.
import { parseStep, MAX_REPEAT } from './genome.js';

const rep = (s, n) => Array(n).fill(s);
const MIRROR = { R: 'L', L: 'R', D: 'S', S: 'D' };

export const MOVES = [
  { key: 'gerade', name: 'Geradeaus', desc: 'Zieht in gerader Linie über die Platte. Die Kolonie wandert wie ein Komet und erreicht schnell neue Nahrung.',
    actions: () => ['F'] },
  { key: 'kreis', name: 'Kreisen', sizes: ['eng', 'mittel', 'weit', 'sehr weit'], turn: true,
    desc: 'Läuft im Kreis und bleibt in der Nähe. Die Kolonie wächst kompakt und verteidigt ihr Gebiet.',
    actions: (s) => [...rep('F', s), 'R'] },
  { key: 'ecken', name: 'Ecken', sizes: ['klein', 'mittel', 'groß', 'riesig'], turn: true,
    desc: 'Läuft Quadrate. Ähnlich wie Kreisen, aber mit geraden Strecken – große Quadrate erkunden mehr Fläche.',
    actions: (s) => [...rep('F', s + 1), 'D'] },
  { key: 'welle', name: 'Welle', sizes: ['flach', 'mittel', 'hoch'],
    desc: 'Schwingt hin und her und kommt dabei langsam voran. Die Kolonie breitet sich als breiter Streifen aus.',
    actions: (s) => ['R', ...rep('F', s), 'L', 'L', ...rep('F', s), 'R'] },
  { key: 'treppe', name: 'Treppe', sizes: ['kurz', 'mittel', 'lang'], turn: true,
    desc: 'Abwechselnd ein Stück vor und zur Seite – die Kolonie wandert schräg über die Platte.',
    actions: (s) => [...rep('F', s), 'D', ...rep('F', s), 'S'] },
  { key: 'sitzen', name: 'Sitzen', sizes: ['nur sitzen', 'selten bewegen', 'oft bewegen'],
    desc: 'Bewegt sich kaum und wächst vor allem durch Teilung. Spart Energie und hält dicht zusammen.',
    actions: (s) => [['P'], ['F', 'P', 'P', 'P'], ['F', 'P']][s] },
  { key: 'pendeln', name: 'Pendeln', sizes: ['kurz', 'mittel', 'lang', 'sehr lang'],
    desc: 'Läuft ein Stück vor und kehrt dann um – wie Myxococcus. Die Kolonie bildet einen langen Streifen.',
    actions: (s) => [...rep('F', s + 1), 'B'] },
  { key: 'taumeln', name: 'Taumeln', sizes: ['kurz', 'mittel', 'lang', 'sehr lang'],
    desc: 'Schwimmt ein Stück geradeaus und taumelt dann in eine zufällige Richtung – wie E. coli. Die Kolonie verteilt sich in alle Richtungen.',
    actions: (s) => [...rep('F', s + 1), 'Z'] },
  { key: 'schlange', name: 'Schlängeln', sizes: ['eng', 'mittel', 'weit'], turn: true,
    desc: 'Schlängelt sich in S-Kurven voran – wie ein Korkenzieher. Die Kolonie zieht als breites Band.',
    actions: (s) => [...rep('R', s + 2), 'M'] },
  { key: 'acht', name: 'Acht', turn: true,
    desc: 'Läuft abwechselnd einen Kreis rechts und links herum – eine liegende Acht. Sehr ortstreu.',
    actions: () => [...rep('R', 8), 'M'] },
];
export const MOVE_BY_KEY = Object.fromEntries(MOVES.map((m) => [m.key, m]));

// Welche Bewegungsart wird durch welchen Schritt freigeschaltet?
export const STEP_MOVES = { P: ['sitzen'], B: ['pendeln'], Z: ['taumeln'], M: ['schlange', 'acht'] };

export function actionsOf(move) {
  const m = MOVE_BY_KEY[move.type] || MOVES[0];
  const size = m.sizes ? Math.min(m.sizes.length - 1, Math.max(0, move.size | 0)) : 0;
  const acts = m.actions(size);
  return move.dir === 'L' && m.turn ? acts.map((s) => MIRROR[s] || s) : acts;
}

// gleiche aufeinanderfolgende Schritte zusammenfassen: F,F,F -> F3 (max. ×4)
function compress(acts) {
  const out = [];
  for (const s of acts) {
    const last = out[out.length - 1];
    if (last && last.s === s && last.n < MAX_REPEAT) last.n++;
    else out.push({ s, n: 1 });
  }
  return out.map((x) => (x.n > 1 ? `${x.s}${x.n}` : x.s));
}

// Muster für die Simulation erzeugen, passend zu den Freischaltungen.
// Liefert { program } oder { locked: { kind, key } } (für „wird in Level X freigeschaltet“).
export function compile(move, lim) {
  const acts = actionsOf(move);
  const missing = acts.find((s) => !lim.steps.has(s));
  if (missing) return { locked: { kind: 'step', key: missing } };
  if (acts.length <= lim.programMax) return { program: acts.slice() };
  const packed = compress(acts);
  if (lim.repeat && packed.length <= lim.programMax) return { program: packed };
  if (!lim.repeat) return { locked: { kind: 'repeat' } };
  return { locked: { kind: 'program', key: packed.length } };
}

const expand = (program) => program.flatMap((e) => { const st = parseStep(e); return st ? rep(st.s, st.n) : []; });

// Bewegungsart zu einem vorhandenen Muster finden (z. B. für Gegner oder ältere Spielstände).
export function moveFromProgram(program) {
  const target = expand(program).join(',');
  for (const m of MOVES) {
    const sizes = m.sizes ? m.sizes.length : 1;
    for (let size = 0; size < sizes; size++) {
      for (const dir of m.turn ? ['R', 'L'] : ['R']) {
        if (actionsOf({ type: m.key, size, dir }).join(',') === target) return { type: m.key, size, dir };
      }
    }
  }
  return null;
}

export function describeMove(move) {
  if (!move) return 'eigenes Muster';
  const m = MOVE_BY_KEY[move.type];
  if (!m) return 'eigenes Muster';
  const parts = [m.name];
  if (m.sizes) parts.push(m.sizes[move.size | 0]);
  if (m.turn) parts.push(move.dir === 'L' ? 'links herum' : 'rechts herum');
  return parts.join(' · ');
}

// Kleine Bahnzeichnung einer Zelle als SVG (für Karten und Listen).
export function pathSvg(program, color = 'currentColor', steps = 28) {
  const DX = [0, 1, 1, 1, 0, -1, -1, -1];
  const DY = [-1, -1, 0, 1, 1, 1, 0, -1];
  const TURN = { F: 0, R: 1, L: -1, D: 2, S: -2, B: 4, M: 0 };
  const acts = expand(program);
  if (!acts.length) acts.push('P');
  let x = 0, y = 0, d = 0, mir = 1, seed = 3;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pts = [[0, 0]];
  for (let k = 0; k < steps; k++) {
    const s = acts[k % acts.length];
    if (s === 'Z') d = Math.floor(rnd() * 8);
    else if (s === 'B') d = (d + 4) & 7;
    else if (s in TURN) d = (d + TURN[s] * mir + 8) & 7;
    if (s === 'M') mir = -mir;
    if (s === 'P') continue;
    x += DX[d]; y += DY[d];
    pts.push([x, y]);
  }
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const [px, py] of pts) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
  const span = Math.max(maxX - minX, maxY - minY, 2);
  const sc = 30 / span;
  const ox = 20 - ((minX + maxX) / 2) * sc, oy = 20 - ((minY + maxY) / 2) * sc;
  const P = pts.map(([px, py]) => `${(ox + px * sc).toFixed(1)},${(oy + py * sc).toFixed(1)}`);
  const sit = pts.length === 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">` +
    (sit ? `<circle cx="20" cy="20" r="6" fill="none" stroke="${color}" stroke-width="2.5"/><circle cx="20" cy="20" r="2" fill="${color}"/>`
      : `<polyline points="${P.join(' ')}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<circle cx="${P[0].split(',')[0]}" cy="${P[0].split(',')[1]}" r="2.6" fill="${color}"/>`) +
    '</svg>';
}
