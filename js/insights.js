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

  // Woran sind die eigenen Zellen gestorben?
  const d = p.died;
  const deaths = d.starve + d.age + d.fight + d.toxin + (d.env || 0);
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

const n = (x) => x.toLocaleString('en-US');
const hours = (t) => Math.round((48 * t) / 4000);

// Woran sind die eigenen Zellen gestorben? Anteile für den Balken in der Auswertung
export function deathBreakdown(p) {
  const d = p.died;
  return [
    { key: 'starve', label: 'Starved', n: d.starve },
    { key: 'age', label: 'Old age', n: d.age },
    { key: 'fight', label: 'Fights', n: d.fight },
    { key: 'toxin', label: 'Toxins', n: d.toxin },
    { key: 'env', label: 'The plate', n: d.env || 0 },
  ].filter((x) => x.n > 0);
}

// Was hat jedes Element auf der Platte bewirkt? Eine Zeile pro Element, mit echten Zahlen
export function plateReport(sim) {
  if (!sim.envOn) return [];
  const me = sim.players[0], foes = sim.players.slice(1);
  const foe = (k) => foes.reduce((a, q) => a + q.env[k], 0);
  const types = [...new Set((sim.opts.elements || []).map((e) => e.type))];
  const killLine = (k, what) => {
    const a = me.env[k], b = foe(k);
    if (!a && !b) return `${what} did not hit anyone this time.`;
    return `${what} killed ${n(a)} of your cells and ${n(b)} enemy cells.`;
  };
  const out = [];
  for (const t of types) {
    if (t === 'disc') {
      let text = killLine('abx', 'The antibiotic');
      const late = (sim.discs || []).filter((d) => d.at > 0);
      for (const d of late) {
        if (!d.placed) text += ` The second dab never came – the game ended after ${hours(sim.tick)} h.`;
        else text += ` The second dab landed on ${d.target === 1 ? 'your colony' : 'an enemy colony'} after ${hours(d.at)} h.`;
      }
      out.push({ type: t, text });
    } else if (t === 'mould') out.push({ type: t, text: killLine('abx', 'The mould and its clear ring') });
    else if (t === 'phage') {
      const hits = (sim.phageAt || []).filter((x) => x <= sim.tick).length;
      out.push({ type: t, text: hits ? `${hits} ${hits === 1 ? 'outbreak' : 'outbreaks'}. ${killLine('phage', 'Phages')}` : `No outbreak – the game ended before ${hours(sim.phageAt[0])} h.` });
    } else if (t === 'immune') {
      out.push({ type: t, text: sim.tick >= sim.immuneAt ? killLine('immune', 'Immune cells') : `The immune cells never arrived – the game ended before ${hours(sim.immuneAt)} h.` });
    } else if (t === 'sun') {
      const lost = me.died.starve + me.died.age;
      out.push({ type: t, text: lost ? `${pct(me.env.sun / lost)} of your cells that starved or aged died in the sun (${n(me.env.sun)} cells).` : 'None of your cells starved or aged in the sun.' });
    } else if (t === 'salt') out.push({ type: t, text: `${n(me.env.salt)} of your cells starved in the salty zones (enemies: ${n(foe('salt'))}).` });
    else if (t === 'acid') out.push({ type: t, text: `${n(me.env.acid)} of your cells died of old age on the sour side (enemies: ${n(foe('acid'))}).` });
    else if (t === 'heat') out.push({ type: t, text: `${n(me.env.heat)} of your cells burned out on the warm side (enemies: ${n(foe('heat'))}).` });
    else if (t === 'flow') out.push({ type: t, text: `The current carried your cells ${n(me.env.drift)} steps downstream (enemies: ${n(foe('drift'))}).` });
    else if (t === 'sugar') {
      const landed = (sim.pulses || []).filter((q) => q.at + 80 <= sim.tick).length;
      out.push({ type: t, text: landed ? `You claimed ${me.env.honey} of ${landed} honey drops.` : 'No honey drop landed before the game ended.' });
    }
  }
  return out;
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
  { key: 'all_specials', name: 'Toolbox', desc: 'Unlock all three special abilities of the skin world.', check: (c) => ['capsule', 'biofilm', 'toxin'].every((k) => c.globalLimits.specials.has(k)) },
  { key: 'collector', name: 'Collector', desc: 'Discover every germ of the skin world.', check: (c) => c.atlasCount >= c.atlasTotal },
  { key: 'master', name: 'Wound Healer', desc: 'Beat the chapter boss in level 10.', check: (c) => c.sim.winner === 1 && c.mode === 'level' && c.level === 10 },
];
