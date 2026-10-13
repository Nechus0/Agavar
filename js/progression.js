// Freischalt-System: Neue Bewegungsschritte, höhere Stufen und Spezialfähigkeiten
// gibt es erst nach gewonnenen Leveln.
import { STEPS, COSTED, SPECIALS, cost, MAX_PROGRAM } from './genome.js';

// after = Level, das man gewinnen muss (0 = von Anfang an verfügbar)
export const UNLOCKS = [
  { after: 0, steps: ['F', 'R', 'L', 'D', 'S', 'P'], traitMax: 2, programMax: 4 },
  { after: 1, steps: ['B'], traitMax: 3 },
  { after: 2, specials: ['chemo'] },
  { after: 3, steps: ['Z'], programMax: 5 },
  { after: 4, specials: ['spores'], traitMax: 4 },
  { after: 5, specials: ['biofilm'], programMax: 6 },
  { after: 6, traitMax: 5 },
  { after: 7, specials: ['toxin'] },
];

export const ALL_UNLOCKED = {
  steps: new Set(Object.keys(STEPS)),
  specials: new Set(Object.keys(SPECIALS)),
  traitMax: 5,
  programMax: MAX_PROGRAM,
};

export function getLimits(levelsWon) {
  const lim = { steps: new Set(), specials: new Set(['none']), traitMax: 0, programMax: 0 };
  for (const u of UNLOCKS) {
    if (u.after !== 0 && !levelsWon.includes(u.after)) continue;
    (u.steps || []).forEach((s) => lim.steps.add(s));
    (u.specials || []).forEach((s) => lim.specials.add(s));
    if (u.traitMax) lim.traitMax = Math.max(lim.traitMax, u.traitMax);
    if (u.programMax) lim.programMax = Math.max(lim.programMax, u.programMax);
  }
  return lim;
}

export const traitCap = (t, lim) => Math.min(t.max, lim.traitMax);

// Nach welchem Level wird etwas freigeschaltet? (für "🔒 ab Level X")
export function unlockLevelOf(kind, key) {
  for (const u of UNLOCKS) {
    if (kind === 'step' && (u.steps || []).includes(key)) return u.after;
    if (kind === 'special' && (u.specials || []).includes(key)) return u.after;
    if (kind === 'trait' && u.traitMax >= key) return u.after;
    if (kind === 'program' && u.programMax >= key) return u.after;
  }
  return 0;
}

// Lesbare Beschreibung der Belohnungen eines Levels.
export function rewardsOf(level) {
  const out = [];
  for (const u of UNLOCKS.filter((x) => x.after === level)) {
    for (const s of u.steps || []) out.push({ type: 'step', key: s, text: `Bewegungsschritt „${STEPS[s].name}“` });
    for (const s of u.specials || []) out.push({ type: 'special', key: s, text: `Spezialfähigkeit „${SPECIALS[s].name}“` });
    if (u.traitMax) out.push({ type: 'trait', text: `Eigenschaften bis Stufe ${u.traitMax}` });
    if (u.programMax) out.push({ type: 'program', text: `Muster mit bis zu ${u.programMax} Schritten` });
  }
  return out;
}

// Warum darf dieses Bakterium hier nicht antreten? Leere Liste = alles in Ordnung.
export function problems(g, lim, budget) {
  const p = [];
  const c = cost(g);
  if (c > budget) p.push(`${c} statt max. ${budget} Punkte`);
  for (const t of COSTED) if (g[t.key] > traitCap(t, lim)) p.push(`${t.label.split(' ')[0]} Stufe ${g[t.key]} noch gesperrt`);
  if (!lim.specials.has(g.special)) p.push(`${SPECIALS[g.special].name} noch gesperrt`);
  const locked = [...new Set(g.program.filter((s) => !lim.steps.has(s)))];
  if (locked.length) p.push(`Schritt ${locked.map((s) => STEPS[s].icon).join(' ')} noch gesperrt`);
  if (g.program.length > lim.programMax) p.push(`Muster zu lang (max. ${lim.programMax})`);
  return p;
}
