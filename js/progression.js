// Freischalt- und Karriere-System.
// Jedes Bakterium hat eine eigene Karriere: Es startet mit wenigen Punkten und einfachen Schritten.
// Jeder erste Sieg in einem Level bringt Ausbaupunkte und schaltet die Fähigkeit des besiegten Keims frei.
import { SPECIALS, COSTED, cost, parseStep, MAX_PROGRAM } from './genome.js';
import { STEP_MOVES, MOVE_BY_KEY } from './movement.js';

const moveNames = (step) => (STEP_MOVES[step] || []).map((k) => `“${MOVE_BY_KEY[k].name}”`).join(' and ');

// ein Bakterium lebt eine Welt lang: 12 Punkte zum Start, +1 Punkt je Stern (Sieg, schnell, Herausforderung)
export const START_POINTS = 12;
export const POINTS_PER_WIN = 1;

// after = Level, das gewonnen werden muss (0 = von Anfang an)
export const UNLOCKS = [
  { after: 0, steps: ['F', 'R', 'L'], programMax: 4 },
  { after: 1, steps: ['P'] },
  { after: 2, steps: ['B'], programMax: 5 },
  { after: 3, steps: ['Z'] },
  { after: 4, specials: ['capsule'] },
  { after: 5, steps: ['D', 'S'] },
  { after: 6, repeat: true, programMax: 6 },
  { after: 7, steps: ['M'] },
  { after: 8, specials: ['biofilm'], slots: 2 },
  { after: 9, specials: ['toxin'] },
  { after: 10, title: 'Wound Healer' },
  { after: 20, title: 'Skin Specialist' },
  // later worlds (see docs/WORLDS.md): Photosynthesis in Water, Spores and Predator in Soil
  { after: 45, specials: ['photo'] },
  { after: 63, specials: ['spores'] },
  { after: 67, specials: ['predator'] },
];

export function getLimits(won) {
  const lim = { steps: new Set(), specials: new Set(['none']), programMax: 0, repeat: false, slots: 1 };
  for (const u of UNLOCKS) {
    if (u.after !== 0 && !won.includes(u.after)) continue;
    (u.steps || []).forEach((s) => lim.steps.add(s));
    (u.specials || []).forEach((s) => lim.specials.add(s));
    if (u.programMax) lim.programMax = Math.max(lim.programMax, u.programMax);
    if (u.repeat) lim.repeat = true;
    if (u.slots) lim.slots = Math.max(lim.slots, u.slots);
  }
  lim.programMax = Math.min(MAX_PROGRAM, lim.programMax);
  return lim;
}

// Punkte einer Karriere: Startpunkte + 1 Punkt je Stern in gewonnenen Leveln.
// Die Level sind auf alle Sterne abgestimmt – wer viele Sterne liegen lässt, kommt bald nicht mehr weiter.
export const careerPoints = (won, stars = {}) =>
  START_POINTS + won.reduce((a, l) => a + Math.max(POINTS_PER_WIN, starCount((stars[l] || 0) | 1)), 0);
// Budget für die Abstimmung: Level n mit allen (share = 1) oder einem Teil der Bonussterne der Level davor
export const plannedBudget = (n, share = 1) => Math.round(START_POINTS + (n - 1) * (1 + 2 * share));

// Sterne eines Levels: 1 = Sieg, 2 = Sieg in unter 12 h, 4 = zeitweise 25 % der Platte besiedelt
export const STAR_GOALS = [
  { bit: 1, icon: '🏆', short: 'Win', text: 'Win the level' },
  { bit: 2, icon: '⏱', short: 'under 12 h', text: 'Win in under 12 h of incubation' },
  { bit: 4, icon: '🧫', short: 'Challenge', text: 'The level challenge (see the level page)' },
];
export const FAST_TICKS = 1000; // 12 h von 48 h
// Zeitstern je Level: auf großen Platten dauert jeder Sieg länger, dort gilt lv.fast (Stunden)
export const fastHours = (level) => (level && level.fast) || 12;
export const fastTicks = (level) => Math.round((fastHours(level) * FAST_TICKS) / 12);
// Große, zähe Platten (lv.lead = Stunden): dort endet kaum ein Kampf früh – der zweite Stern heißt dann
// „zu diesem Zeitpunkt vorne liegen“ (und gewinnen)
export const leadTicks = (level) => (level && level.lead ? Math.round((level.lead * FAST_TICKS) / 12) : 0);
export function ledAt(sim, ticks) {
  const h = sim.history || [];
  if (!h.length || sim.tick < ticks) return null; // noch offen
  const row = h[Math.max(0, Math.min(h.length - 1, Math.round(ticks / 5) - 1))];
  return row[0] > 0 && row[0] === Math.max(...row);
}
export const fastLabel = (level) => (level && level.lead ? `Lead at ${level.lead} h` : `Under ${fastHours(level)} h`);
export const fastText = (level) => (level && level.lead ? `Be the biggest colony at ${level.lead} h of incubation` : `Win in under ${fastHours(level)} h of incubation`);
export function fastOk(sim, level) {
  const lt = leadTicks(level);
  return lt ? ledAt(sim, lt) === true : sim.tick <= fastTicks(level);
}
export const BIG_PLATE = 0.25;
export const starCount = (mask) => ((mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1));

// Dritter Stern: eine eigene Herausforderung pro Level, damit nicht immer dasselbe Bakterium passt.
// level.challenge = [art, wert]; ohne Angabe: 25 % der Platte. Geprüft wird nach einem Sieg.
const sumPts = (g) => cost(g);
export function challengeOf(level) {
  const [kind, n] = (level && level.challenge) || ['plate'];
  switch (kind) {
    case 'lean': return { kind, short: `≤ ${n} points`, text: `Win with a bacterium that uses at most ${n} points`, ok: (sim, g) => sumPts(g) <= n, fixed: true };
    case 'pure': return { kind, short: 'No ability', text: 'Win without a special ability', ok: (sim, g) => g.special === 'none' && (!g.bonusSpecial || g.bonusSpecial === 'none'), fixed: true };
    case 'hunter': return { kind, short: `${n.toLocaleString('en-US')} kills`, text: `Kill ${n.toLocaleString('en-US')} enemy cells and win`, ok: (sim) => sim.players[0].kills >= n, progress: (sim) => `${Math.min(n, sim.players[0].kills)}/${n} kills` };
    case 'boss': return { kind, short: 'Wipe out boss', text: 'Wipe out the boss completely and win', ok: (sim) => sim.players[1] && sim.players[1].count === 0 };
    case 'honey': return { kind, short: `${n} honey drops`, text: `Claim at least ${n} honey drops and win`, ok: (sim) => sim.players[0].env.honey >= n, progress: (sim) => `${sim.players[0].env.honey}/${n} drops` };
    case 'clean': return { kind, short: `Plate < ${n}`, text: `Lose fewer than ${n} cells to the plate itself and win`, ok: (sim) => (sim.players[0].died.env || 0) < n, failed: (sim) => (sim.players[0].died.env || 0) >= n };
    default: return { kind: 'plate', short: '25 % plate', text: 'Cover 25 % of the plate at some point (and win)', ok: (sim) => sim.players[0].peakPlate >= BIG_PLATE };
  }
}
export function starMask(sim, level = null, genome = null) {
  if (sim.winner !== 1) return 0;
  let m = 1;
  if (fastOk(sim, level)) m |= 2;
  const ch = challengeOf(level);
  if (ch.ok(sim, genome || sim.players[0].genome)) m |= 4;
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
    if (kind === 'slot' && u.slots) return u.after;
  }
  return 0;
}

// Lesbare Beschreibung der Belohnungen eines Levels (ohne Punkte).
export function rewardsOf(level) {
  const out = [];
  for (const u of UNLOCKS.filter((x) => x.after === level)) {
    for (const s of (u.steps || []).filter((x) => (STEP_MOVES[x] || []).length)) out.push({ type: 'move', key: STEP_MOVES[s][0], text: `Movement ${moveNames(s)}`, short: moveNames(s).replace(/[“”]/g, '') });
    for (const s of u.specials || []) out.push({ type: 'special', key: s, text: `Special ability “${SPECIALS[s].name}”`, short: SPECIALS[s].name });
    if (u.slots) out.push({ type: 'slot', text: 'Second ability slot', short: '2nd ability slot' });
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
  if (g.bonusSpecial && g.bonusSpecial !== 'none') {
    if ((lim.slots || 1) < 2) p.push('Second ability slot still locked');
    else if (!lim.specials.has(g.bonusSpecial)) p.push(`${SPECIALS[g.bonusSpecial].name} still locked`);
  }
  const steps = g.program.map(parseStep).filter(Boolean);
  const locked = [...new Set(steps.filter((x) => !lim.steps.has(x.s)).map((x) => x.s))];
  if (locked.length) p.push(`Movement ${locked.map(moveNames).join(', ')} still locked`);
  else if ((!lim.repeat && steps.some((x) => x.n > 1)) || g.program.length > lim.programMax) p.push('Movement pattern still too big');
  return p;
}
