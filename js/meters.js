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
  { key: 'spread', icon: '🌱', label: 'Ausbreitung', color: '#5ee06a' },
  { key: 'fight', icon: '⚔️', label: 'Kampfkraft', color: '#ff6b6b' },
  { key: 'survive', icon: '🛡', label: 'Ausdauer', color: '#3fa9f5' },
];

// Konter-Hinweise zu einem Gegner (wichtigste zuerst, höchstens `max`)
export function counterTips(o, max = 2) {
  const tips = [];
  const sp = new Set([o.special, o.bonusSpecial]);
  const move = moveFromProgram(o.program);
  if (sp.has('toxin')) tips.push('☣ Gift wirkt auf Nachbarn – halte Abstand mit einer wandernden Bewegung oder teile dich früh, damit Verluste nachwachsen.');
  if (sp.has('predator')) tips.push('🦷 Räuber leben von Kills – hohe Abwehr oder eine Kapsel lassen ihn ins Leere laufen.');
  if (sp.has('capsule')) tips.push('🛡 Jeder Angriff muss zweimal treffen – setze auf hohen Angriff oder Toxine (Gift umgeht die Kapsel).');
  if (sp.has('biofilm')) tips.push('🟦 Biofilm ist zäh, aber ortsfest – nicht frontal angreifen, sondern die Nahrung schneller abgrasen.');
  if (sp.has('spores')) tips.push('⚪ Sporen überstehen Hunger – aushungern reicht nicht, du musst ihn im Kampf besiegen.');
  if (sp.has('photo')) tips.push('☀ Lebt vom Licht und braucht kaum Nahrung – angreifen statt aushungern.');
  if (o.speed >= 4) tips.push('⚡ Sehr schnell – er frisst dir die Nahrung weg. Selbst Tempo 3 oder mehr, oder kompakt bleiben mit guter Verwertung.');
  if (o.attack >= 4) tips.push('✴ Starker Angriff – mit Abwehr auf gleicher Höhe hältst du stand.');
  if (move && move.type === 'sitzen') tips.push('🪑 Bewegt sich kaum – breite dich schnell aus und besetze die Platte, bevor er wächst.');
  if (move && (move.type === 'gerade' || move.type === 'pendeln')) tips.push('➡ Läuft in Bahnen – eine kompakte Kolonie (Kreisen) fängt ihn an der Front ab.');
  if ((o.chemotaxis || 0) >= 2) tips.push('💧 Riecht Nahrung – er findet freie Stellen schnell. Besetze sie zuerst.');
  if (o.defense <= 1 && o.attack <= 1) tips.push('🎯 Kaum Kampfwerte – schon etwas Angriff reicht, um ihn zu verdrängen.');
  if (!tips.length) tips.push('⚖ Ausgewogen – ein Allrounder mit Tempo, Verwertung und etwas Angriff ist eine gute Wahl.');
  return tips.slice(0, max);
}
