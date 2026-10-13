// Bakterien-"Genom": alle einstellbaren Eigenschaften, Punktekosten und Zufallserzeugung.

// Bewegungsschritte. "turn" = Drehung in 45°-Schritten relativ zur Blickrichtung (+ = rechts).
// Reihenfolge = Anordnung der Buttons im Editor.
export const STEPS = {
  L: { icon: '↖', label: 'halblinks', name: 'Halb links (45°)', turn: -1 },
  F: { icon: '⬆', label: 'vor', name: 'Geradeaus', turn: 0 },
  R: { icon: '↗', label: 'halbrechts', name: 'Halb rechts (45°)', turn: 1 },
  P: { icon: '⏸', label: 'warten', name: 'Warten (nicht bewegen)' },
  Z: { icon: '🎲', label: 'taumeln', name: 'Taumeln (zufällige Richtung)' },
  S: { icon: '⬅', label: 'links', name: 'Links (90°)', turn: -2 },
  B: { icon: '⬇', label: 'umkehren', name: 'Umkehren (180°)', turn: 4 },
  D: { icon: '➡', label: 'rechts', name: 'Rechts (90°)', turn: 2 },
  M: { icon: '⇄', label: 'seitenwechsel', name: 'Seitenwechsel (rechts und links tauschen)', turn: 0 },
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

// Eigenschaften, die Punkte kosten (1 Punkt pro Stufe).
export const COSTED = [
  { key: 'speed', label: 'Geschwindigkeit', max: 4, hint: 'Wie oft sich eine Zelle bewegt. Bewegung kostet Energie.' },
  { key: 'lifespan', label: 'Lebensdauer', max: 4, hint: 'Wie alt eine Zelle maximal wird.' },
  { key: 'efficiency', label: 'Verwertung', max: 4, hint: 'Wie viel Energie aus der aufgenommenen Nahrung gewonnen wird.' },
  { key: 'attack', label: 'Angriff', max: 5, hint: 'Chance, gegnerische Zellen zu töten, in die man hineinläuft.' },
  { key: 'defense', label: 'Abwehr (Zellwand)', max: 5, hint: 'Schutz gegen Angriffe.' },
];

// Kostenlose Abwägungen: beide Enden haben Vor- und Nachteile.
export const FREE = [
  { key: 'division', label: 'Teilung', max: 4, low: 'sehr früh', high: 'sehr spät',
    hint: 'Früh: viele, aber schwache Tochterzellen. Spät: wenige, robuste.' },
  { key: 'metabolism', label: 'Stoffwechsel', max: 4, low: 'genügsam', high: 'gefräßig',
    hint: 'Gefräßig: frisst schneller, verbraucht aber auch mehr Energie.' },
];

export const SPECIALS = {
  none: { name: 'Keine', cost: 0, hint: 'Keine Spezialfähigkeit.' },
  chemo: { name: 'Chemotaxis', cost: 3, hint: 'Die Zellen „riechen“ Nahrung und bewegen sich oft gezielt dorthin statt stur dem Muster zu folgen.' },
  spores: { name: 'Sporen', cost: 3, hint: 'Verhungernde Zellen werden zu ruhenden Sporen (helle Punkte) und erwachen, wenn wieder Nahrung da ist.' },
  biofilm: { name: 'Biofilm', cost: 3, hint: 'Zellen, die eine Weile stillstehen, bilden eine schützende Schleimschicht (dunkle Matte) und werden viel widerstandsfähiger.' },
  toxin: { name: 'Toxine', cost: 3, hint: 'Die Zellen geben Giftstoffe ab (sichtbar als Giftwolke), die gegnerische Nachbarzellen schwächen und töten können.' },
};
export const SPECIAL_KEYS = Object.keys(SPECIALS);

export const PALETTE = [
  '#3fa9f5', '#ff5d5d', '#5ee06a', '#ffd23f',
  '#c77dff', '#ff9f43', '#2ee6d6', '#ff6ec7',
];

export const DEFAULT_BUDGET = 20;
export const MIN_BUDGET = 6;
export const MAX_BUDGET = 40;

// Ein neues Bakterium ist ganz einfach: alle Punkte müssen selbst verteilt werden.
export function defaultGenome() {
  return {
    name: '',
    color: PALETTE[0],
    program: ['F'],
    speed: 0, lifespan: 0, efficiency: 0, attack: 0, defense: 0,
    division: 2, metabolism: 2,
    special: 'none',
  };
}

export function cost(g) {
  let c = 0;
  for (const t of COSTED) c += g[t.key] | 0;
  c += (SPECIALS[g.special] || SPECIALS.none).cost;
  return c;
}

export function maxCost() {
  return COSTED.reduce((s, t) => s + t.max, 0) + 3;
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

// Macht aus beliebigen (z. B. gespeicherten) Daten ein gültiges Genom.
export function normalize(raw) {
  const g = { ...defaultGenome(), name: 'Bakterium' };
  if (!raw || typeof raw !== 'object') return g;
  if (typeof raw.name === 'string' && raw.name.trim()) g.name = raw.name.trim().slice(0, 32);
  if (typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color)) g.color = raw.color.toLowerCase();
  if (Array.isArray(raw.program)) {
    const p = raw.program.map(parseStep).filter(Boolean).slice(0, MAX_PROGRAM).map((x) => stepEntry(x.s, x.n));
    g.program = p.length ? p : ['P'];
  }
  for (const t of [...COSTED, ...FREE]) {
    if (raw[t.key] !== undefined) g[t.key] = clampInt(raw[t.key], 0, t.max);
  }
  if (SPECIAL_KEYS.includes(raw.special)) g.special = raw.special;
  // gewählte Bewegungsart (für den Editor); das Muster in program ist maßgeblich für die Simulation
  if (raw.move && typeof raw.move.type === 'string') {
    g.move = { type: raw.move.type, size: clampInt(raw.move.size, 0, 5), dir: raw.move.dir === 'L' ? 'L' : 'R' };
  }
  // nur für besondere Gegner: eine zweite Spezialfähigkeit (nicht im Editor wählbar)
  if (SPECIAL_KEYS.includes(raw.bonusSpecial) && raw.bonusSpecial !== 'none') g.bonusSpecial = raw.bonusSpecial;
  if (typeof raw.id === 'string') g.id = raw.id;
  return g;
}

export const specialsOf = (g) => [g.special, g.bonusSpecial].filter((s) => s && s !== 'none');

// Zufälliges Bakterium, das das Budget möglichst ausschöpft.
// limits (optional): { specials, steps, programMax, repeat } aus dem Freischalt-System.
export function randomGenome(rng, budget, limits = null) {
  const g = { ...defaultGenome(), name: 'Zufall' };
  const specials = (limits ? [...limits.specials] : SPECIAL_KEYS).filter((k) => k !== 'none');
  const steps = limits ? [...limits.steps] : STEP_KEYS;
  const progMax = limits ? limits.programMax : MAX_PROGRAM;
  const repeat = limits ? limits.repeat : true;
  let points = budget;
  if (points >= 6 && specials.length && rng() < 0.4) {
    g.special = rng.pick(specials);
    points -= 3;
  }
  let guard = 200;
  while (points > 0 && guard-- > 0) {
    const open = COSTED.filter((t) => g[t.key] < t.max);
    if (!open.length) break;
    const t = rng.pick(open);
    g[t.key]++;
    points--;
  }
  g.division = rng.int(5);
  g.metabolism = rng.int(5);
  const weighted = ['F', 'F', 'F', 'R', 'R', 'L', 'L', 'D', 'S', 'B', 'P', 'Z', 'M'].filter((k) => steps.includes(k));
  const len = 1 + rng.int(progMax);
  g.program = Array.from({ length: len }, () => stepEntry(rng.pick(weighted), repeat && rng() < 0.4 ? 2 + rng.int(MAX_REPEAT - 1) : 1));
  return g;
}
