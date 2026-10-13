// Auswertung nach dem Spiel („woran lag es?“) und Erfolge.
import { moveFromProgram } from './movement.js';
import { BIG_PLATE } from './progression.js';

const pct = (x) => `${Math.round(x * 100)} %`;

// Liefert 1–4 kurze Punkte: { kind: 'good' | 'info' | 'tip', text }
export function analyze(sim, genomes, mask = 0) {
  const p = sim.players[0];
  const won = sim.winner === 1;
  const out = [];

  if (won && p.lowShareAfterContact < 0.25) out.push({ kind: 'good', text: `Comeback! At one point you were down to ${pct(p.lowShareAfterContact)} of all cells.` });
  else if (!won && p.peakShare >= 0.3) out.push({ kind: 'good', text: `Close! At one point you had ${pct(p.peakShare)} of all cells.` });
  else if (won) out.push({ kind: 'info', text: `Your colony covered up to ${pct(p.peakPlate)} of the plate.` });
  else out.push({ kind: 'info', text: `Your peak: ${pct(p.peakShare)} of all cells and ${pct(p.peakPlate)} of the plate.` });

  if (p.kills > 0) out.push({ kind: 'info', text: `You killed ${p.kills.toLocaleString('en-US')} enemy cells.` });

  // Woran sind die eigenen Zellen gestorben?
  const d = p.died;
  const deaths = d.starve + d.age + d.fight + d.toxin;
  if (deaths > 20) {
    let killer = 0;
    for (let id = 2; id < p.killedBy.length; id++) if (p.killedBy[id] > (p.killedBy[killer] || 0)) killer = id;
    const byKiller = killer ? p.killedBy[killer] : 0;
    const name = killer ? genomes[killer - 1].name : '';
    if (byKiller / deaths >= 0.3) {
      if (d.toxin > d.fight) out.push({ kind: 'tip', text: `${name}'s toxins killed ${byKiller.toLocaleString('en-US')} of your cells.` });
      else out.push({ kind: 'tip', text: `${name} killed ${byKiller.toLocaleString('en-US')} of your cells in combat.` });
    } else if (d.starve / deaths >= 0.5) {
      out.push({ kind: 'tip', text: 'Most of your cells starved.' });
    } else if (d.age / deaths >= 0.4) {
      out.push({ kind: 'tip', text: 'Many of your cells died of old age.' });
    }
  }

  if (won && mask) {
    if (!(mask & 2)) out.push({ kind: 'tip', text: `Missing star: win in under 12 h. This time it took ${Math.round((48 * sim.tick) / 4000)} h.` });
    if (!(mask & 4)) out.push({ kind: 'tip', text: `Missing star: cover ${pct(BIG_PLATE)} of the plate. Your best was ${pct(p.peakPlate)}.` });
  }
  return out.slice(0, 4);
}

// ctx: { sim, mode, level, mask, genome, globalLimits, atlasCount, atlasTotal, opponents }
export const ACHIEVEMENTS = [
  { key: 'first_win', name: 'First Win', desc: 'Win a game.', check: (c) => c.sim.winner === 1 },
  { key: 'three_stars', name: 'Triple', desc: 'Get all three stars in a level.', check: (c) => c.mask === 7 },
  { key: 'blitz', name: 'Blitz', desc: 'Win in under 6 h of incubation.', check: (c) => c.sim.winner === 1 && c.sim.tick <= 500 },
  { key: 'giant', name: 'Colony Giant', desc: 'Cover half of the plate at some point.', check: (c) => c.sim.players[0].peakPlate >= 0.5 },
  { key: 'hunter', name: 'Hunter', desc: 'Kill 1,000 enemy cells in one game.', check: (c) => c.sim.players[0].kills >= 1000 },
  { key: 'comeback', name: 'Comeback', desc: 'Win after dropping below 20 % of all cells.', check: (c) => c.sim.winner === 1 && c.sim.players[0].lowShareAfterContact < 0.2 },
  { key: 'sitter', name: 'Couch Potato', desc: 'Win with the “Sit” movement.', check: (c) => c.sim.winner === 1 && moveFromProgram(c.genome.program)?.type === 'sitzen' },
  { key: 'pure', name: 'Purist', desc: 'Win from level 3 on without a special ability.', check: (c) => c.sim.winner === 1 && c.mode === 'level' && c.level >= 3 && c.genome.special === 'none' },
  { key: 'crowd', name: 'Against All', desc: 'Win a free game against at least 4 opponents.', check: (c) => c.sim.winner === 1 && c.mode === 'free' && c.opponents >= 4 },
  { key: 'all_specials', name: 'Toolbox', desc: 'Unlock all three special abilities of the skin world.', check: (c) => ['capsule', 'biofilm', 'toxin'].every((k) => c.globalLimits.specials.has(k)) },
  { key: 'collector', name: 'Collector', desc: 'Discover every germ of the skin world.', check: (c) => c.atlasCount >= c.atlasTotal },
  { key: 'master', name: 'Wound Healer', desc: 'Beat the chapter boss in level 10.', check: (c) => c.sim.winner === 1 && c.mode === 'level' && c.level === 10 },
];
