// Auswertung nach dem Spiel („woran lag es?“) und Erfolge.
import { SPECIAL_KEYS } from './genome.js';
import { moveFromProgram } from './movement.js';
import { BIG_PLATE } from './progression.js';

const pct = (x) => `${Math.round(x * 100)} %`;

// Liefert 1–4 kurze Punkte: { kind: 'good' | 'info' | 'tip', text }
export function analyze(sim, genomes, mask = 0) {
  const p = sim.players[0];
  const won = sim.winner === 1;
  const out = [];

  if (won && p.lowShareAfterContact < 0.25) out.push({ kind: 'good', text: `Comeback! Zwischendurch hattest du nur noch ${pct(p.lowShareAfterContact)} aller Zellen.` });
  else if (!won && p.peakShare >= 0.3) out.push({ kind: 'good', text: `Knapp! Zeitweise hattest du ${pct(p.peakShare)} aller Zellen.` });
  else if (won) out.push({ kind: 'info', text: `Deine Kolonie besiedelte zeitweise ${pct(p.peakPlate)} der Platte.` });
  else out.push({ kind: 'info', text: `Dein Höchststand: ${pct(p.peakShare)} aller Zellen und ${pct(p.peakPlate)} der Platte.` });

  if (p.kills > 0) out.push({ kind: 'info', text: `Du hast ${p.kills.toLocaleString('de-DE')} gegnerische Zellen getötet.` });

  // Woran sind die eigenen Zellen gestorben?
  const d = p.died;
  const deaths = d.starve + d.age + d.fight + d.toxin;
  if (deaths > 20) {
    let killer = 0;
    for (let id = 2; id < p.killedBy.length; id++) if (p.killedBy[id] > (p.killedBy[killer] || 0)) killer = id;
    const byKiller = killer ? p.killedBy[killer] : 0;
    const name = killer ? genomes[killer - 1].name : '';
    if (byKiller / deaths >= 0.3) {
      if (d.toxin > d.fight) out.push({ kind: 'tip', text: `Die Toxine von ${name} haben ${byKiller.toLocaleString('de-DE')} deiner Zellen getötet. Tipp: Gegen Gift hilft Abstand – breite dich mit einer wandernden Bewegung schnell aus oder teile dich früher, damit Verluste nachwachsen.` });
      else out.push({ kind: 'tip', text: `${name} hat ${byKiller.toLocaleString('de-DE')} deiner Zellen im Kampf getötet. Tipp: Mehr Abwehr, eine Kapsel oder ein höherer Angriff, um zuerst zuzuschlagen.` });
    } else if (d.starve / deaths >= 0.5) {
      out.push({ kind: 'tip', text: 'Die meisten deiner Zellen sind verhungert. Tipp: Mehr Verwertung, ein genügsamerer Stoffwechsel oder eine Bewegung, die neue Nahrung erreicht (Geradeaus, Taumeln, Chemotaxis).' });
    } else if (d.age / deaths >= 0.4) {
      out.push({ kind: 'tip', text: 'Viele Zellen starben an Altersschwäche. Tipp: Mehr Lebensdauer oder frühere Teilung.' });
    }
  }

  if (won && mask) {
    if (!(mask & 2)) out.push({ kind: 'tip', text: 'Für den Stern „schnell“: Gewinne in unter 12 h – mit mehr Angriff oder schnellerer Ausbreitung.' });
    if (!(mask & 4)) out.push({ kind: 'tip', text: `Für den Stern „groß“: Besiedle zeitweise ${pct(BIG_PLATE)} der Platte – z. B. mit früher Teilung und guter Verwertung.` });
  }
  return out.slice(0, 4);
}

// ctx: { sim, mode, level, mask, genome, globalLimits, atlasCount, atlasTotal, opponents }
export const ACHIEVEMENTS = [
  { key: 'first_win', icon: '🥇', name: 'Erster Sieg', desc: 'Gewinne ein Spiel.', check: (c) => c.sim.winner === 1 },
  { key: 'three_stars', icon: '⭐', name: 'Dreifach', desc: 'Hole alle drei Sterne in einem Level.', check: (c) => c.mask === 7 },
  { key: 'blitz', icon: '⚡', name: 'Blitzsieg', desc: 'Gewinne in unter 6 h Brutzeit.', check: (c) => c.sim.winner === 1 && c.sim.tick <= 500 },
  { key: 'giant', icon: '🌕', name: 'Kolonie-Riese', desc: 'Besiedle zeitweise die Hälfte der Platte.', check: (c) => c.sim.players[0].peakPlate >= 0.5 },
  { key: 'hunter', icon: '🗡', name: 'Jäger', desc: 'Töte 1.000 gegnerische Zellen in einem Spiel.', check: (c) => c.sim.players[0].kills >= 1000 },
  { key: 'comeback', icon: '🔥', name: 'Comeback', desc: 'Gewinne, nachdem du unter 20 % aller Zellen gefallen bist.', check: (c) => c.sim.winner === 1 && c.sim.players[0].lowShareAfterContact < 0.2 },
  { key: 'sitter', icon: '🪑', name: 'Stubenhocker', desc: 'Gewinne mit der Bewegungsart „Sitzen“.', check: (c) => c.sim.winner === 1 && moveFromProgram(c.genome.program)?.type === 'sitzen' },
  { key: 'pure', icon: '🧫', name: 'Purist', desc: 'Gewinne ab Level 3 ohne Spezialfähigkeit.', check: (c) => c.sim.winner === 1 && c.mode === 'level' && c.level >= 3 && c.genome.special === 'none' },
  { key: 'crowd', icon: '🎪', name: 'Gegen alle', desc: 'Gewinne im freien Spiel gegen mindestens 4 Gegner.', check: (c) => c.sim.winner === 1 && c.mode === 'free' && c.opponents >= 4 },
  { key: 'all_specials', icon: '🧬', name: 'Werkzeugkasten', desc: 'Schalte alle sechs Spezialfähigkeiten frei.', check: (c) => SPECIAL_KEYS.every((k) => c.globalLimits.specials.has(k)) },
  { key: 'collector', icon: '📖', name: 'Sammler', desc: 'Entdecke alle Keime im Atlas.', check: (c) => c.atlasCount >= c.atlasTotal },
  { key: 'master', icon: '🏆', name: 'Meister der Agarplatte', desc: 'Besiege den Endgegner in Level 10.', check: (c) => c.sim.winner === 1 && c.mode === 'level' && c.level === 10 },
];
