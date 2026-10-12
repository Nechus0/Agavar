// Bakterien-"Genom": alle einstellbaren Eigenschaften, Punktekosten und Zufallserzeugung.

export const STEPS = {
  F: { icon: '⬆', name: 'Geradeaus' },
  R: { icon: '↗', name: 'Rechts' },
  L: { icon: '↖', name: 'Links' },
  B: { icon: '⬇', name: 'Kehrtwende' },
  P: { icon: '⏸', name: 'Pause' },
  Z: { icon: '🎲', name: 'Zufall' },
};
export const STEP_KEYS = Object.keys(STEPS);
export const MAX_PROGRAM = 6;

// Eigenschaften, die Punkte kosten (1 Punkt pro Stufe).
export const COSTED = [
  { key: 'speed', label: 'Geschwindigkeit', max: 4, hint: 'Wie oft sich eine Zelle bewegt. Bewegung kostet Energie.' },
  { key: 'lifespan', label: 'Lebensdauer', max: 4, hint: 'Wie alt eine Zelle maximal wird.' },
  { key: 'efficiency', label: 'Verwertung', max: 4, hint: 'Wie viel Energie aus der aufgenommenen Nahrung gewonnen wird.' },
  { key: 'attack', label: 'Angriff (Toxin)', max: 5, hint: 'Chance, gegnerische Zellen zu töten, in die man hineinläuft.' },
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
  spores: { name: 'Sporen', cost: 3, hint: 'Verhungernde Zellen werden zu ruhenden Sporen und erwachen, wenn wieder Nahrung da ist.' },
  chemo: { name: 'Chemotaxis', cost: 3, hint: 'Bewegt sich oft in Richtung der meisten Nahrung statt stur dem Muster zu folgen.' },
  biofilm: { name: 'Biofilm', cost: 3, hint: 'Zellen, die eine Weile stillstehen, werden deutlich widerstandsfähiger.' },
  toxin: { name: 'Giftwolke', cost: 3, hint: 'Schwächt regelmäßig gegnerische Nachbarzellen.' },
};
export const SPECIAL_KEYS = Object.keys(SPECIALS);

export const PALETTE = [
  '#3fa9f5', '#ff5d5d', '#5ee06a', '#ffd23f',
  '#c77dff', '#ff9f43', '#2ee6d6', '#ff6ec7',
];

export const DEFAULT_BUDGET = 20;
export const MIN_BUDGET = 6;
export const MAX_BUDGET = 40;

export function defaultGenome() {
  return {
    name: 'Neues Bakterium',
    color: PALETTE[0],
    program: ['F', 'F', 'R'],
    speed: 3, lifespan: 3, efficiency: 3, attack: 3, defense: 3,
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

// Macht aus beliebigen (z. B. importierten) Daten ein gültiges Genom.
export function normalize(raw) {
  const d = defaultGenome();
  const g = { ...d };
  if (!raw || typeof raw !== 'object') return g;
  if (typeof raw.name === 'string' && raw.name.trim()) g.name = raw.name.trim().slice(0, 32);
  if (typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color)) g.color = raw.color.toLowerCase();
  if (Array.isArray(raw.program)) {
    const p = raw.program.filter((s) => STEP_KEYS.includes(s)).slice(0, MAX_PROGRAM);
    g.program = p.length ? p : ['P'];
  }
  for (const t of [...COSTED, ...FREE]) {
    if (raw[t.key] !== undefined) g[t.key] = clampInt(raw[t.key], 0, t.max);
  }
  if (SPECIAL_KEYS.includes(raw.special)) g.special = raw.special;
  if (typeof raw.id === 'string') g.id = raw.id;
  return g;
}

// Zufälliges Bakterium, das das Budget möglichst ausschöpft.
export function randomGenome(rng, budget) {
  const g = defaultGenome();
  for (const t of COSTED) g[t.key] = 0;
  g.special = 'none';
  let points = budget;
  if (points >= 6 && rng() < 0.4) {
    g.special = rng.pick(SPECIAL_KEYS.filter((k) => k !== 'none'));
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
  const weighted = ['F', 'F', 'F', 'R', 'R', 'L', 'L', 'B', 'P', 'Z'];
  const len = 1 + rng.int(MAX_PROGRAM);
  g.program = Array.from({ length: len }, () => rng.pick(weighted));
  return g;
}

// Export als teilbarer Code ("AGAVA1:..."), Import mit Fehlerprüfung.
export function encodeGenome(g) {
  const { id, ...rest } = g;
  const json = JSON.stringify(rest);
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf8').toString('base64');
  return 'AGAVA1:' + b64;
}

export function decodeGenome(code) {
  const s = String(code || '').trim();
  if (!s.startsWith('AGAVA1:')) throw new Error('Kein gültiger Agava-Code.');
  const b64 = s.slice(7);
  const json = typeof atob === 'function'
    ? decodeURIComponent(escape(atob(b64)))
    : Buffer.from(b64, 'base64').toString('utf8');
  return normalize(JSON.parse(json));
}
