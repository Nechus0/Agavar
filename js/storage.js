// Speichern auf dem Gerät (localStorage). Alle Zugriffe sind abgesichert,
// weil Safari den Speicher z. B. im privaten Modus verweigern kann.
// Jedes Bakterium ist eine Karriere (career.won = gewonnene Level). Das freie Spiel hat ein eigenes Bakterium.
import { normalize, DEFAULT_BUDGET } from './genome.js';

const KEY = 'agava.v2';

const DEFAULT_SETTINGS = {
  budget: DEFAULT_BUDGET,
  opponents: 2,
  size: 'mittel',
  distribution: 'gleichmaessig',
  amount: 'normal',
  regen: 'normal',
  sound: true,
  music: true,
};

const cleanWon = (w) => (Array.isArray(w) ? [...new Set(w.filter(Number.isInteger))] : []);
const cleanStars = (st) => {
  const out = {};
  if (st && typeof st === 'object') for (const [k, v] of Object.entries(st)) if (Number.isInteger(v) && v > 0) out[k] = v & 7;
  return out;
};
const withCareer = (raw) => ({
  ...normalize(raw), id: raw.id,
  career: { won: cleanWon(raw.career && raw.career.won), stars: cleanStars(raw.career && raw.career.stars) },
});

let state = load();

function load() {
  const empty = { bacteria: [], freeGenome: null, settings: { ...DEFAULT_SETTINGS }, achievements: {}, atlas: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const s = JSON.parse(raw);
    return {
      bacteria: Array.isArray(s.bacteria) ? s.bacteria.filter((b) => b && typeof b.id === 'string').map(withCareer) : [],
      freeGenome: s.freeGenome ? normalize(s.freeGenome) : null,
      settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
      achievements: s.achievements && typeof s.achievements === 'object' ? s.achievements : {},
      atlas: Array.isArray(s.atlas) ? s.atlas.filter((x) => typeof x === 'string') : [],
    };
  } catch {
    return empty;
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const getBacteria = () => state.bacteria;
export const getBacterium = (id) => state.bacteria.find((b) => b.id === id) || null;

// Speichert Bauplan und Name; die Karriere bleibt erhalten.
export function saveBacterium(g) {
  const old = g.id ? getBacterium(g.id) : null;
  const b = withCareer({ ...g, career: old ? old.career : { won: [], stars: {} } });
  b.id = old ? old.id : `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  if (old) state.bacteria[state.bacteria.indexOf(old)] = b;
  else state.bacteria.push(b);
  save();
  return b;
}

export function deleteBacterium(id) {
  state.bacteria = state.bacteria.filter((b) => b.id !== id);
  save();
}

// Markiert einen Level-Sieg. Liefert true beim ersten Sieg in diesem Level.
export function markWon(id, level) {
  const b = getBacterium(id);
  if (!b || b.career.won.includes(level)) return false;
  b.career.won.push(level);
  save();
  return true;
}

// Sterne eines Levels als Bitmaske sammeln (1 = Sieg, 2 = schnell, 4 = groß). Liefert die neuen Bits.
export function addStars(id, level, mask) {
  const b = getBacterium(id);
  if (!b) return 0;
  const old = b.career.stars[level] || 0;
  const fresh = mask & ~old;
  if (fresh) { b.career.stars[level] = old | mask; save(); }
  return fresh;
}

// Erfolge (einmalig). Liefert true, wenn neu.
export const hasAchievement = (key) => !!state.achievements[key];
export function grantAchievement(key) {
  if (state.achievements[key]) return false;
  state.achievements[key] = Date.now();
  save();
  return true;
}

// Bakterien-Atlas: entdeckte Keime. Liefert die neu entdeckten.
export const getAtlas = () => state.atlas;
export function discover(germs) {
  const fresh = germs.filter((g) => !state.atlas.includes(g));
  if (fresh.length) { state.atlas.push(...fresh); save(); }
  return fresh;
}

// Alle Level, die irgendein Bakterium schon gewonnen hat (für das freie Spiel).
export function globalWon() {
  return [...new Set(state.bacteria.flatMap((b) => b.career.won))];
}

export const getFree = () => state.freeGenome;
export function saveFree(g) {
  state.freeGenome = normalize(g);
  save();
  return state.freeGenome;
}

export const getSettings = () => state.settings;
export function updateSettings(patch) {
  Object.assign(state.settings, patch);
  save();
}
