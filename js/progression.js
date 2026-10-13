// Freischalt- und Karriere-System.
// Jedes Bakterium hat eine eigene Karriere: Es startet mit wenigen Punkten und einfachen Schritten.
// Jeder erste Sieg in einem Level bringt Ausbaupunkte und schaltet die Fähigkeit des besiegten Keims frei.
import { SPECIALS, COSTED, cost, parseStep, MAX_PROGRAM } from './genome.js';
import { STEP_MOVES, MOVE_BY_KEY } from './movement.js';

const moveNames = (step) => (STEP_MOVES[step] || []).map((k) => `“${MOVE_BY_KEY[k].name}”`).join(' and ');

export const START_POINTS = 6;
export const POINTS_PER_WIN = 2;

// after = Level, das gewonnen werden muss (0 = von Anfang an)
export const UNLOCKS = [
  { after: 0, steps: ['F', 'R', 'L', 'D', 'S'], programMax: 4 },
  { after: 1, steps: ['P'] },
  { after: 2, steps: ['B'], programMax: 5 },
  { after: 3, steps: ['Z'] },
  { after: 4, specials: ['capsule'] },
  { after: 5, specials: ['photo'], repeat: true, programMax: 6 },
  { after: 6, specials: ['spores'] },
  { after: 7, specials: ['predator'], steps: ['M'] },
  { after: 8, specials: ['biofilm'] },
  { after: 9, specials: ['toxin'] },
  { after: 10, title: 'Master of the Agar Plate' },
];

export function getLimits(won) {
  const lim = { steps: new Set(), specials: new Set(['none']), programMax: 0, repeat: false };
  for (const u of UNLOCKS) {
    if (u.after !== 0 && !won.includes(u.after)) continue;
    (u.steps || []).forEach((s) => lim.steps.add(s));
    (u.specials || []).forEach((s) => lim.specials.add(s));
    if (u.programMax) lim.programMax = Math.max(lim.programMax, u.programMax);
    if (u.repeat) lim.repeat = true;
  }
  lim.programMax = Math.min(MAX_PROGRAM, lim.programMax);
  return lim;
}

// Punkte einer Karriere: Startpunkte + Punkte pro gewonnenem Level + 1 Bonuspunkt je Level mit 3 Sternen
export const careerPoints = (won, stars = {}) =>
  START_POINTS + POINTS_PER_WIN * won.length + Object.values(stars).filter((m) => (m & 7) === 7).length;

// Sterne eines Levels: 1 = Sieg, 2 = Sieg in unter 12 h, 4 = zeitweise 25 % der Platte besiedelt
export const STAR_GOALS = [
  { bit: 1, icon: '🏆', short: 'Win', text: 'Win the level' },
  { bit: 2, icon: '⏱', short: 'under 12 h', text: 'Win in under 12 h of incubation' },
  { bit: 4, icon: '🧫', short: '25 % plate', text: 'Cover 25 % of the plate at some point (and win)' },
];
export const FAST_TICKS = 1000; // 12 h von 48 h
export const BIG_PLATE = 0.25;
export const starCount = (mask) => ((mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1));
export function starMask(sim) {
  if (sim.winner !== 1) return 0;
  let m = 1;
  if (sim.tick <= FAST_TICKS) m |= 2;
  if (sim.players[0].peakPlate >= BIG_PLATE) m |= 4;
  return m;
}
// nächstes Level einer Karriere (Level werden der Reihe nach gespielt)
export const nextLevel = (won, total) => {
  for (let n = 1; n <= total; n++) if (!won.includes(n)) return n;
  return total + 1;
};

// Nach welchem Level wird etwas freigeschaltet? (für „🔒 ab Level X“)
export function unlockLevelOf(kind, key) {
  for (const u of UNLOCKS) {
    if (kind === 'step' && (u.steps || []).includes(key)) return u.after;
    if (kind === 'special' && (u.specials || []).includes(key)) return u.after;
    if (kind === 'program' && u.programMax >= key) return u.after;
    if (kind === 'repeat' && u.repeat) return u.after;
  }
  return 0;
}

// Lesbare Beschreibung der Belohnungen eines Levels (ohne Punkte).
export function rewardsOf(level) {
  const out = [];
  for (const u of UNLOCKS.filter((x) => x.after === level)) {
    for (const s of u.steps || []) out.push({ type: 'move', key: STEP_MOVES[s][0], text: `Movement ${moveNames(s)}`, short: moveNames(s).replace(/[“”]/g, '') });
    for (const s of u.specials || []) out.push({ type: 'special', key: s, text: `Special ability “${SPECIALS[s].name}”`, short: SPECIALS[s].name });
    if (u.repeat || u.programMax) out.push({ type: 'bigger', text: 'Bigger movement patterns (more sizes)', short: 'bigger patterns' });
    if (u.title) out.push({ type: 'title', text: `Title “${u.title}”`, short: u.title });
  }
  return out;
}

// Warum darf dieses Bakterium so nicht antreten? Leere Liste = alles in Ordnung.
export function problems(g, lim, budget) {
  const p = [];
  const c = cost(g);
  if (c > budget) p.push(`${c} instead of max. ${budget} points`);
  for (const t of COSTED) if (g[t.key] > t.max) p.push(`${t.label} too high`);
  if (!lim.specials.has(g.special)) p.push(`${SPECIALS[g.special].name} still locked`);
  const steps = g.program.map(parseStep).filter(Boolean);
  const locked = [...new Set(steps.filter((x) => !lim.steps.has(x.s)).map((x) => x.s))];
  if (locked.length) p.push(`Movement ${locked.map(moveNames).join(', ')} still locked`);
  else if ((!lim.repeat && steps.some((x) => x.n > 1)) || g.program.length > lim.programMax) p.push('Movement pattern still too big');
  return p;
}
