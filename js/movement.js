// Bewegungsarten: verständliche Bausteine statt einzelner Schritte.
// Jede Art hat optional eine Größe und eine Drehrichtung und wird intern in ein
// Schrittmuster übersetzt, das die Simulation ausführt.
import { parseStep, MAX_REPEAT } from './genome.js';

const rep = (s, n) => Array(n).fill(s);
const MIRROR = { R: 'L', L: 'R', D: 'S', S: 'D' };

export const MOVES = [
  { key: 'gerade', name: 'Straight', desc: 'Moves in a straight line across the plate. The colony travels like a comet and reaches new food fast.',
    actions: () => ['F'] },
  { key: 'kreis', name: 'Circle', sizes: ['small', 'medium', 'large'], turn: true,
    desc: 'Runs in circles and stays close. The colony grows compact and defends its ground.',
    actions: (s) => [...rep('F', s), 'R'] },
  { key: 'ecken', name: 'Square', sizes: ['small', 'medium', 'large'], turn: true,
    desc: 'Runs in squares. Like circling, but with straight edges – big squares explore more ground.',
    actions: (s) => [...rep('F', s + 1), 'D'] },
  { key: 'welle', name: 'Wave', sizes: ['small', 'medium', 'large'],
    desc: 'Swings back and forth while slowly moving on. The colony spreads as a wide band.',
    actions: (s) => ['R', ...rep('F', s), 'L', 'L', ...rep('F', s), 'R'] },
  { key: 'treppe', name: 'Stairs', sizes: ['small', 'medium', 'large'], turn: true,
    desc: 'Alternates forward and sideways – the colony moves diagonally across the plate.',
    actions: (s) => [...rep('F', s), 'D', ...rep('F', s), 'S'] },
  { key: 'sitzen', name: 'Sit', sizes: ['still', 'rarely move', 'often move'],
    desc: 'Barely moves and grows mainly by dividing. Saves energy and stays packed together.',
    actions: (s) => [['P'], ['F', 'P', 'P', 'P'], ['F', 'P']][s] },
  { key: 'pendeln', name: 'Shuttle', sizes: ['short', 'medium', 'long'], params: [1, 2, 3],
    desc: 'Runs forward, then turns back – like Myxococcus. The colony forms a long stripe.',
    actions: (s) => [...rep('F', s + 1), 'B'] },
  { key: 'taumeln', name: 'Tumble', sizes: ['short', 'medium', 'long'], params: [1, 2, 3],
    desc: 'Swims straight for a bit, then tumbles into a random direction – like E. coli. The colony spreads in all directions.',
    actions: (s) => [...rep('F', s + 1), 'Z'] },
  { key: 'schlange', name: 'Snake', sizes: ['small', 'medium', 'large'], turn: true,
    desc: 'Wriggles forward in S-curves – like a corkscrew. The colony moves as a wide band.',
    actions: (s) => [...rep('R', s + 2), 'M'] },
];
export const MOVE_BY_KEY = Object.fromEntries(MOVES.map((m) => [m.key, m]));

// Welche Bewegungsart wird durch welchen Schritt freigeschaltet?
export const STEP_MOVES = { P: ['sitzen'], B: ['pendeln'], Z: ['taumeln'], D: ['ecken', 'treppe'], S: [], M: ['schlange'] };

export function actionsOf(move) {
  const m = MOVE_BY_KEY[move.type] || MOVES[0];
  const size = m.sizes ? Math.min(m.sizes.length - 1, Math.max(0, move.size | 0)) : 0;
  const acts = m.actions(m.params ? m.params[size] : size);
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
  if (!move) return 'custom pattern';
  const m = MOVE_BY_KEY[move.type];
  if (!m) return 'custom pattern';
  const parts = [m.name];
  if (m.sizes) parts.push(m.sizes[move.size | 0]);
  if (m.turn) parts.push(move.dir === 'L' ? 'counter-clockwise' : 'clockwise');
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
