// Prüft, ob ein Level mit „vernünftigen“ Bauweisen schaffbar ist, wie ein Mensch sie wählen würde.
// Für jedes Level werden typische Bauweisen (Allrounder, Kämpfer, Schnell, Ausdauer) mit
// verschiedenen Bewegungen und den bis dahin freigeschalteten Spezialfähigkeiten erzeugt.
// Aufruf: node tools/levels-human.mjs <level> [seeds]
import { Simulation } from '../js/sim.js';
import { defaultGenome, COSTED, cost } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { getLimits, careerPoints } from '../js/progression.js';
import { compile } from '../js/movement.js';

const n = Number(process.argv[2] || 6);
const seeds = Number(process.argv[3] || 6);
const lv = LEVELS[n - 1];
const won = Array.from({ length: n - 1 }, (_, k) => k + 1);
const lim = getLimits(won);
const budget = careerPoints(won);

// Reihenfolge, in der Punkte verteilt werden (Schlüssel wiederholt = höhere Priorität)
const ARCHETYPES = {
  Allrounder: ['speed', 'efficiency', 'attack', 'lifespan', 'defense', 'speed', 'efficiency', 'attack', 'lifespan', 'defense'],
  Kämpfer: ['attack', 'defense', 'efficiency', 'attack', 'defense', 'speed', 'attack', 'defense', 'lifespan'],
  Schnell: ['speed', 'efficiency', 'speed', 'attack', 'speed', 'efficiency', 'lifespan', 'speed', 'attack'],
  Ausdauer: ['efficiency', 'lifespan', 'defense', 'efficiency', 'lifespan', 'speed', 'defense', 'attack'],
};
const MOVES = [{ type: 'kreis', size: 1 }, { type: 'taumeln', size: 1 }, { type: 'ecken', size: 1 }];

function build(arch, move, special) {
  const g = { ...defaultGenome(), name: `${arch}/${move.type}/${special}`, special };
  const res = compile({ ...move, dir: 'R' }, lim);
  if (!res.program) return null;
  g.program = res.program;
  const order = ARCHETYPES[arch];
  let guard = 200, k = 0;
  while (cost(g) < budget && guard--) {
    const key = order[k++ % order.length];
    const t = COSTED.find((x) => x.key === key);
    if (g[key] < t.max) g[key]++;
  }
  return g;
}

const specials = [...lim.specials];
const rows = [];
let good = 0, total = 0;
for (const arch of Object.keys(ARCHETYPES)) {
  for (const move of MOVES) {
    for (const sp of specials) {
      const g = build(arch, move, sp);
      if (!g) continue;
      let w = 0;
      const lost = {};
      for (let s = 0; s < seeds; s++) {
        const sim = new Simulation({ genomes: [g, ...levelOpponents(lv)], ...lv.plate, seed: 500 + s }).run();
        if (sim.winner === 1) w++;
        else {
          const p = sim.players[0];
          const why = p.died.starve > (p.died.fight + p.died.toxin) ? 'verhungert' : 'getötet';
          lost[why] = (lost[why] || 0) + 1;
        }
      }
      total++;
      if (w >= seeds / 2) good++;
      rows.push({ name: g.name, w, lost, sp });
    }
  }
}
rows.sort((a, b) => b.w - a.w);
console.log(`Level ${n} (${lv.name}) – ${budget} Punkte: ${good}/${total} Bauweisen gewinnen mindestens die Hälfte`);
console.log('  beste: ' + rows.slice(0, 4).map((r) => `${r.name} ${r.w}/${seeds}`).join(' | '));
const bySp = {};
for (const r of rows) { (bySp[r.sp] ||= []).push(r.w / seeds); }
console.log('  Siegquote je Spezialfähigkeit: ' + Object.entries(bySp).map(([k, v]) => `${k} ${Math.round((100 * v.reduce((a, b) => a + b, 0)) / v.length)}%`).join(', '));
console.log('  schlechteste: ' + rows.slice(-3).map((r) => `${r.name} ${r.w}/${seeds} ${JSON.stringify(r.lost)}`).join(' | '));
