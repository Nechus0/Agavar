// Bakterien-"Genom": alle einstellbaren Eigenschaften, Punktekosten und Zufallserzeugung.

// Bewegungsschritte. "turn" = Drehung in 45°-Schritten relativ zur Blickrichtung (+ = rechts).
// Reihenfolge = Anordnung der Buttons im Editor.
export const STEPS = {
  L: { icon: '↖', label: 'half left', name: 'Half left (45°)', turn: -1 },
  F: { icon: '⬆', label: 'forward', name: 'Straight', turn: 0 },
  R: { icon: '↗', label: 'half right', name: 'Half right (45°)', turn: 1 },
  P: { icon: '⏸', label: 'wait', name: 'Wait (do not move)' },
  Z: { icon: '🎲', label: 'tumble', name: 'Tumble (random direction)' },
  S: { icon: '⬅', label: 'left', name: 'Left (90°)', turn: -2 },
  B: { icon: '⬇', label: 'reverse', name: 'Reverse (180°)', turn: 4 },
  D: { icon: '➡', label: 'right', name: 'Right (90°)', turn: 2 },
  M: { icon: '⇄', label: 'switch', name: 'Switch sides (swap right and left)', turn: 0 },
};
export const STEP_KEYS = Object.keys(STEPS);
export const MAX_PROGRAM = 6;
export const MAX_REPEAT = 4;

// Ein Musterschritt wird als Text gespeichert: Schritt + optionale Wiederholung, z. B. "F" oder "F3".
export function parseStep(entry) {
  const m = /^([A-Z])([1-9])?$/.exec(String(entry));
  if (!m || !STEPS[m[1]]) return null;
  return { s: m[1], n: Math.min(MAX_REPEAT, Number(m[2] || 1)) };
}
export const stepEntry = (s, n = 1) => (n > 1 ? `${s}${n}` : s);

// Eigenschaften, die Punkte kosten (1 Punkt pro Stufe, Stufen 0–10).
export const TRAIT_MAX = 10;
export const COSTED = [
  { key: 'speed', label: 'Speed', short: 'Speed', max: TRAIT_MAX, hint: 'How often a cell moves. Moving costs energy.' },
  { key: 'lifespan', label: 'Lifespan', short: 'Life', max: TRAIT_MAX, hint: 'How old a cell can get.' },
  { key: 'efficiency', label: 'Efficiency', short: 'Efficiency', max: TRAIT_MAX, hint: 'How much energy a cell gets out of the food it eats.' },
  { key: 'chemotaxis', label: 'Chemotaxis', short: 'Smell', max: TRAIT_MAX, hint: 'Cells “smell” food and leave their pattern more often to head straight for it.' },
  { key: 'attack', label: 'Attack', short: 'Attack', max: TRAIT_MAX, hint: 'Chance to kill enemy cells you run into.' },
  { key: 'defense', label: 'Defense', short: 'Defense', max: TRAIT_MAX, hint: 'Protection against attacks.' },
];
// Spielstände vor Version 2 hatten Stufen 0–4 (Kampf 0–5); eine alte Stufe entspricht zwei neuen.
export const GENOME_VERSION = 2;

// Kostenlose Abwägungen: beide Enden haben Vor- und Nachteile.
export const FREE = [
  { key: 'metabolism', label: 'Metabolism', max: 4, low: 'frugal', high: 'greedy',
    options: ['very frugal', 'frugal', 'medium', 'hungry', 'greedy'],
    hint: 'Frugal: low base cost, uses food efficiently, but grows slower. Greedy: eats fast, but burns a lot.' },
  { key: 'division', label: 'Division', max: 4, low: 'very early', high: 'very late',
    options: ['very early', 'early', 'medium', 'late', 'very late'],
    hint: 'Early: many weak daughter cells with little energy. Late: fewer, tougher cells with more reserves.' },
  { key: 'size', label: 'Cell size', max: 4, low: 'tiny', high: 'huge',
    options: ['tiny', 'small', 'medium', 'large', 'huge'],
    hint: 'Small: divides sooner and costs little, but is fragile. Large: tough and eats more, but slow and hungry.' },
];

export const SPECIALS = {
  none: { name: 'None', cost: 0, hint: 'No special ability.' },
  capsule: { name: 'Capsule', cost: 5, hint: 'A slime coat absorbs hits and grows back fast, but makes cells slow and costly to divide (cells with a capsule look brighter).' },
  photo: { name: 'Photosynthesis', cost: 5, hint: 'Cells constantly gain a little energy from light – even where the food is gone (cells shimmer).' },
  predator: { name: 'Predator', cost: 6, hint: 'Attacks harder and eats killed enemies, but barely feeds on agar (red bite marks).' },
  spores: { name: 'Spores', cost: 4, hint: 'Starving cells turn into dormant spores (pale dots) and wake up when food returns.' },
  biofilm: { name: 'Biofilm', cost: 6, hint: 'Cells that stand still build a slime layer (dark mat): much tougher and they use less energy.' },
  toxin: { name: 'Toxins', cost: 7, hint: 'Cells release poison clouds that kill neighbouring enemies – but spoil the food and cost energy.' },
};
export const SPECIAL_KEYS = Object.keys(SPECIALS);

// Kulturfarben des Design-Systems, jede mit eigenem Symbol (Farbe ist nie das einzige Merkmal).
export const PALETTE = [
  '#38C8FF', '#FF5A6E', '#FF9A3D', '#FFD23F',
  '#2EF2B4', '#6E7BFF', '#C46BFF', '#FF6BC1',
];
export const CULTURE_SYMBOLS = {
  '#FF5A6E': '●', '#FF9A3D': '▲', '#FFD23F': '■', '#2EF2B4': '◆',
  '#38C8FF': '+', '#6E7BFF': '⬡', '#C46BFF': '★', '#FF6BC1': '‹',
};
// ältere Farben früherer Versionen (grelle Erstfarben und die „Lab at night“-Kulturfarben) auf die neuen abbilden
export const OLD_COLORS = {
  '#3fa9f5': '#38C8FF', '#ff5d5d': '#FF5A6E', '#5ee06a': '#2EF2B4', '#ffd23f': '#FFD23F',
  '#c77dff': '#C46BFF', '#ff9f43': '#FF9A3D', '#2ee6d6': '#6E7BFF', '#ff6ec7': '#FF6BC1',
  '#cc5252': '#FF5A6E', '#cc8040': '#FF9A3D', '#c0a030': '#FFD23F', '#52a83e': '#2EF2B4',
  '#38a0b4': '#38C8FF', '#5858c4': '#6E7BFF', '#a040a0': '#C46BFF', '#c04878': '#FF6BC1',
};
export const symbolOf = (color) => CULTURE_SYMBOLS[color] || '●';

export const DEFAULT_BUDGET = 24;
export const MIN_BUDGET = 10;
export const MAX_BUDGET = 60;

// Ein neues Bakterium ist ganz einfach: alle Punkte müssen selbst verteilt werden.
export function defaultGenome() {
  return {
    name: '',
    color: PALETTE[0],
    program: ['F'],
    speed: 0, lifespan: 0, efficiency: 0, chemotaxis: 0, attack: 0, defense: 0,
    division: 2, metabolism: 2, size: 2,
    special: 'none',
  };
}

// Steigende Kosten: Stufe 1–4 kostet 1 Punkt, 5–7 kosten 2, 8–10 kosten 3.
// So lohnt es sich nicht mehr, alles in eine Eigenschaft zu stecken.
export const stepCost = (level) => (level <= 4 ? 1 : level <= 7 ? 2 : 3);
export const traitCost = (v) => { let c = 0; for (let k = 1; k <= v; k++) c += stepCost(k); return c; };
// zweiter Platz für eine Spezialfähigkeit: kostet zusätzlich zur Fähigkeit selbst
export const SLOT2_COST = 5;

export function cost(g) {
  let c = 0;
  for (const t of COSTED) c += traitCost(g[t.key] | 0);
  c += (SPECIALS[g.special] || SPECIALS.none).cost;
  if (g.bonusSpecial && g.bonusSpecial !== 'none') c += SLOT2_COST + SPECIALS[g.bonusSpecial].cost;
  return c;
}

export function maxCost() {
  return COSTED.reduce((s, t) => s + traitCost(t.max), 0) + Math.max(...Object.values(SPECIALS).map((x) => x.cost));
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

// Macht aus beliebigen (z. B. gespeicherten) Daten ein gültiges Genom.
export function normalize(raw) {
  const g = { ...defaultGenome(), name: 'Bacterium' };
  if (!raw || typeof raw !== 'object') return g;
  if (typeof raw.name === 'string' && raw.name.trim()) g.name = raw.name.trim().slice(0, 32);
  if (typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color)) g.color = OLD_COLORS[raw.color.toLowerCase()] || PALETTE.find((c) => c.toLowerCase() === raw.color.toLowerCase()) || raw.color;
  if (Array.isArray(raw.program)) {
    const p = raw.program.map(parseStep).filter(Boolean).slice(0, MAX_PROGRAM).map((x) => stepEntry(x.s, x.n));
    g.program = p.length ? p : ['P'];
  }
  for (const t of COSTED) {
    if (raw[t.key] !== undefined) g[t.key] = clampInt(raw[t.key], 0, t.max);
  }
  // Stoffwechsel und Teilung: stufenlos in Zehnteln
  for (const t of FREE) {
    if (raw[t.key] !== undefined) g[t.key] = Math.max(0, Math.min(t.max, Math.round((Number(raw[t.key]) || 0) * 10) / 10));
  }
  if (SPECIAL_KEYS.includes(raw.special)) g.special = raw.special;
  // ältere Spielstände: Chemotaxis war früher eine Spezialfähigkeit (3 Punkte) -> jetzt Eigenschaft Stufe 3
  if (raw.special === 'chemo') g.chemotaxis = Math.max(g.chemotaxis, 6);
  // gewählte Bewegungsart (für den Editor); das Muster in program ist maßgeblich für die Simulation
  if (raw.move && typeof raw.move.type === 'string') {
    g.move = { type: raw.move.type, size: clampInt(raw.move.size, 0, 5), dir: raw.move.dir === 'L' ? 'L' : 'R' };
  }
  // zweite Spezialfähigkeit (Gegner haben sie umsonst, Spieler kaufen den zweiten Platz)
  if (SPECIAL_KEYS.includes(raw.bonusSpecial) && raw.bonusSpecial !== 'none' && raw.bonusSpecial !== g.special) g.bonusSpecial = raw.bonusSpecial;
  if (Array.isArray(raw.mutations)) g.mutations = [...new Set(raw.mutations.filter((k) => typeof k === 'string'))].slice(0, 40);
  if (typeof raw.id === 'string') g.id = raw.id;
  return g;
}

export const specialsOf = (g) => [g.special, g.bonusSpecial].filter((s) => s && s !== 'none');

// Zufälliges Bakterium, das das Budget möglichst ausschöpft.
// limits (optional): { specials, steps, programMax, repeat } aus dem Freischalt-System.
export function randomGenome(rng, budget, limits = null) {
  const g = { ...defaultGenome(), name: 'Random' };
  const specials = (limits ? [...limits.specials] : SPECIAL_KEYS).filter((k) => k !== 'none');
  const steps = limits ? [...limits.steps] : STEP_KEYS;
  const progMax = limits ? limits.programMax : MAX_PROGRAM;
  const repeat = limits ? limits.repeat : true;
  let points = budget;
  if (specials.length && rng() < 0.4) {
    const sp = rng.pick(specials);
    if (points >= SPECIALS[sp].cost * 2) { g.special = sp; points -= SPECIALS[sp].cost; }
  }
  let guard = 300;
  while (guard-- > 0) {
    const open = COSTED.filter((t) => g[t.key] < t.max && cost(g) + stepCost(g[t.key] + 1) <= budget);
    if (!open.length) break;
    g[rng.pick(open).key]++;
  }
  g.division = rng.int(5);
  g.metabolism = rng.int(5);
  const weighted = ['F', 'F', 'F', 'R', 'R', 'L', 'L', 'D', 'S', 'B', 'P', 'Z', 'M'].filter((k) => steps.includes(k));
  const len = 1 + rng.int(progMax);
  g.program = Array.from({ length: len }, () => stepEntry(rng.pick(weighted), repeat && rng() < 0.4 ? 2 + rng.int(MAX_REPEAT - 1) : 1));
  return g;
}
