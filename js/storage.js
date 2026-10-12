// Speichern auf dem Gerät (localStorage). Alle Zugriffe sind abgesichert,
// weil Safari den Speicher z. B. im privaten Modus verweigern kann.
import { normalize, DEFAULT_BUDGET } from './genome.js';

const KEY = 'agava.v1';

const DEFAULT_STATE = {
  bacteria: [],
  levelsWon: [], // Nummern der gewonnenen Level
  settings: {
    budget: DEFAULT_BUDGET,
    opponents: 2,
    size: 'mittel',
    distribution: 'gleichmaessig',
    amount: 'normal',
    regen: 'normal',
    lastBacterium: null,
  },
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const s = JSON.parse(raw);
    return {
      bacteria: Array.isArray(s.bacteria) ? s.bacteria.map(normalize).filter((g) => g.id) : [],
      levelsWon: Array.isArray(s.levelsWon) ? s.levelsWon.filter(Number.isInteger) : [],
      settings: { ...DEFAULT_STATE.settings, ...(s.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
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

export function getBacteria() {
  return state.bacteria;
}

export function getBacterium(id) {
  return state.bacteria.find((b) => b.id === id) || null;
}

export function saveBacterium(g) {
  const b = normalize(g);
  b.id = g.id || `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const idx = state.bacteria.findIndex((x) => x.id === b.id);
  if (idx >= 0) state.bacteria[idx] = b;
  else state.bacteria.push(b);
  save();
  return b;
}

export function deleteBacterium(id) {
  state.bacteria = state.bacteria.filter((b) => b.id !== id);
  if (state.settings.lastBacterium === id) state.settings.lastBacterium = null;
  save();
}

export function getSettings() {
  return state.settings;
}

export function updateSettings(patch) {
  Object.assign(state.settings, patch);
  save();
}

export function levelsWon() {
  return state.levelsWon;
}

export function markLevelWon(n) {
  if (!state.levelsWon.includes(n)) state.levelsWon.push(n);
  save();
}
