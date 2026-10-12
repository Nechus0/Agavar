// Sucht per einfacher Evolution starke Bakterien für ein Budget (Hilfe beim Leveldesign/Balancing).
// Aufruf: node tools/evolve.mjs <budget> [generationen] [seed]
import { Simulation } from '../js/sim.js';
import { randomGenome, cost, COSTED, FREE, SPECIAL_KEYS, STEP_KEYS, MAX_PROGRAM, normalize } from '../js/genome.js';
import { makeRng } from '../js/rng.js';

const budget = Number(process.argv[2] || 20);
const gens = Number(process.argv[3] || 12);
const rng = makeRng(Number(process.argv[4] || 7));

const bench = Array.from({ length: 12 }, () => randomGenome(rng, 20));

function fitness(g, seeds = 6) {
  let score = 0;
  for (let s = 0; s < seeds; s++) {
    const opp = [bench[(s * 2) % bench.length], bench[(s * 2 + 1) % bench.length]];
    const sim = new Simulation({ genomes: [g, ...opp], size: 'mittel', distribution: ['gleichmaessig', 'flecken', 'ring'][s % 3], amount: 'normal', regen: 'normal', seed: 1000 + s }).run();
    if (sim.winner === 1) score += 1;
    else if (sim.players[0].count > 0) score += 0.2;
  }
  return score / seeds;
}

function mutate(g) {
  const m = normalize(JSON.parse(JSON.stringify(g)));
  const r = rng();
  if (r < 0.35) {
    // Punkt verschieben
    const from = rng.pick(COSTED.filter((t) => m[t.key] > 0));
    const to = rng.pick(COSTED.filter((t) => m[t.key] < t.max));
    if (from && to) { m[from.key]--; m[to.key]++; }
  } else if (r < 0.55) {
    const t = rng.pick(FREE);
    m[t.key] = Math.max(0, Math.min(t.max, m[t.key] + (rng() < 0.5 ? -1 : 1)));
  } else if (r < 0.8) {
    const p = m.program.slice();
    const op = rng.int(3);
    if (op === 0 && p.length < MAX_PROGRAM) p.splice(rng.int(p.length + 1), 0, rng.pick(STEP_KEYS));
    else if (op === 1 && p.length > 1) p.splice(rng.int(p.length), 1);
    else p[rng.int(p.length)] = rng.pick(STEP_KEYS);
    m.program = p;
  } else {
    m.special = rng.pick(SPECIAL_KEYS);
  }
  // Budget einhalten / ausschöpfen
  while (cost(m) > budget) {
    const t = rng.pick(COSTED.filter((x) => m[x.key] > 0));
    if (!t) { m.special = 'none'; break; }
    m[t.key]--;
  }
  let guard = 50;
  while (cost(m) < budget && guard--) {
    const t = rng.pick(COSTED.filter((x) => m[x.key] < x.max));
    if (!t) break;
    m[t.key]++;
  }
  return m;
}

let pop = Array.from({ length: 16 }, () => randomGenome(rng, budget));
for (let gen = 0; gen < gens; gen++) {
  const scored = pop.map((g) => ({ g, f: fitness(g) })).sort((a, b) => b.f - a.f);
  const best = scored[0];
  console.log(`gen ${gen} best=${best.f.toFixed(2)} ${JSON.stringify({ ...best.g, name: undefined, color: undefined })}`);
  const elite = scored.slice(0, 5).map((s) => s.g);
  pop = [...elite];
  while (pop.length < 16) pop.push(mutate(rng.pick(elite)));
}
const final = pop.map((g) => ({ g, f: fitness(g, 12) })).sort((a, b) => b.f - a.f);
for (const s of final.slice(0, 3)) console.log('FINAL', s.f.toFixed(2), cost(s.g), JSON.stringify(s.g));
