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
    (g.chemotaxis || 0) * 0.25;
  const fight =
    g.attack * 1.0 + g.defense * 0.7 + (ep.divideAt / 80) * 1 +
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
  { key: 'spread', icon: '🌱', label: 'Spread', color: '#5ee06a' },
  { key: 'fight', icon: '⚔️', label: 'Combat', color: '#ff6b6b' },
  { key: 'survive', icon: '🛡', label: 'Endurance', color: '#3fa9f5' },
];

// Konter-Hinweise zu einem Gegner (wichtigste zuerst, höchstens `max`)
export function counterTips(o, max = 2) {
  const tips = [];
  const sp = new Set([o.special, o.bonusSpecial]);
  const move = moveFromProgram(o.program);
  if (sp.has('toxin')) tips.push('☣ Poison hits neighbours – keep your distance with a roaming movement, or divide early so losses grow back.');
  if (sp.has('predator')) tips.push('🦷 Predators live off kills – high defense or a capsule leaves it hungry.');
  if (sp.has('capsule')) tips.push('🛡 Every attack must hit twice – go for high attack or toxins (poison ignores the capsule).');
  if (sp.has('biofilm')) tips.push('🟦 Biofilm is tough but stationary – don’t attack head-on, eat the food faster instead.');
  if (sp.has('spores')) tips.push('⚪ Spores survive hunger – starving it out won’t work, you have to beat it in combat.');
  if (sp.has('photo')) tips.push('☀ Lives off light and needs little food – attack instead of starving it out.');
  if (o.speed >= 4) tips.push('⚡ Very fast – it eats your food. Take speed 3 or more, or stay compact with good efficiency.');
  if (o.attack >= 4) tips.push('✴ Strong attack – match it with defense to hold your ground.');
  if (move && move.type === 'sitzen') tips.push('🪑 Barely moves – spread fast and take the plate before it grows.');
  if (move && (move.type === 'gerade' || move.type === 'pendeln')) tips.push('➡ Moves in lanes – a compact colony (Circle) catches it at the front.');
  if ((o.chemotaxis || 0) >= 2) tips.push('💧 Smells food – it finds free spots fast. Take them first.');
  if (o.defense <= 1 && o.attack <= 1) tips.push('🎯 Weak in combat – a little attack is enough to push it out.');
  if (!tips.length) tips.push('⚖ Balanced – an all-rounder with speed, efficiency and some attack is a good choice.');
  return tips.slice(0, max);
}
