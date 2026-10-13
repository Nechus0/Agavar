// Zusammenfassende Leisten (0–10) und Konter-Hinweise – damit man Bakterien auf einen Blick
// versteht und weiß, wie man einen Gegner schlägt.
import { energyProfile } from './sim.js';
import { moveFromProgram } from './movement.js';

const clamp10 = (x) => Math.max(0, Math.min(10, x));

// Ausbreitung: wie schnell eine Kolonie Fläche erobert
// Kampfkraft: wie gut sie Gegner tötet und Angriffe übersteht
// Ausdauer: wie gut sie Hunger und Zeit übersteht
export function meters(g) {
  const ep = energyProfile(g);
  const sp = new Set([g.special, g.bonusSpecial]);
  const spread =
    ep.moveChance * ep.moveFrac * 4 +
    ((80 - ep.divideAt) / 54) * 2.5 +
    (Math.max(0, ep.net) / 5) * 2.5 +
    (g.chemotaxis || 0) * 0.125;
  const fight =
    g.attack * 0.5 + g.defense * 0.35 + (ep.divideAt / 80) * 1 +
    (sp.has('toxin') ? 2 : 0) + (sp.has('predator') ? 1.5 : 0) + (sp.has('capsule') ? 1.5 : 0) + (sp.has('biofilm') ? 1 : 0);
  const survive =
    (Math.min(ep.roundsWithoutFood, 150) / 150) * 4 +
    (ep.maxAge / 200) * 3 +
    (sp.has('spores') ? 2.5 : 0) + (sp.has('photo') ? 2 : 0) + (sp.has('biofilm') ? 1 : 0);
  return {
    spread: clamp10((spread / 9.5) * 10),
    fight: clamp10((fight / 11) * 10),
    survive: clamp10((survive / 8) * 10),
  };
}

export const METER_INFO = [
  { key: 'spread', label: 'Spread' },
  { key: 'fight', label: 'Combat' },
  { key: 'survive', label: 'Endurance' },
];

// Beobachtungen zu einem Gegner (wichtigste zuerst, höchstens `max`).
// Bewusst nur beschreibend – wie man ihn schlägt, findet der Spieler selbst heraus.
export function counterTips(o, max = 2) {
  const tips = [];
  const sp = new Set([o.special, o.bonusSpecial]);
  const move = moveFromProgram(o.program);
  if (sp.has('toxin')) tips.push('Poison: it hurts every enemy cell next to it.');
  if (sp.has('predator')) tips.push('A predator – it lives off the cells it kills.');
  if (sp.has('capsule')) tips.push('Its slime capsule absorbs one deadly hit.');
  if (sp.has('biofilm')) tips.push('Builds a tough slime mat wherever it sits still.');
  if (sp.has('spores')) tips.push('Hunger does not kill it – it sleeps as spores.');
  if (sp.has('photo')) tips.push('Gets energy from light, even where the food is gone.');
  if (o.speed >= 8) tips.push('Very fast – it gets around the plate quickly.');
  if (o.attack >= 8) tips.push('Hits hard when it runs into other cells.');
  if (move && move.type === 'sitzen') tips.push('Barely moves – it grows where it starts.');
  if (move && (move.type === 'gerade' || move.type === 'pendeln')) tips.push('Moves in long, straight lanes.');
  if ((o.chemotaxis || 0) >= 4) tips.push('Smells food and heads straight for it.');
  if (o.defense <= 2 && o.attack <= 2) tips.push('Not much of a fighter.');
  if (!tips.length) tips.push('An all-rounder without an obvious weak spot.');
  return tips.slice(0, max);
}
