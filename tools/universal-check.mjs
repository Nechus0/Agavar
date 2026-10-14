// Gibt es ein „Super-Bakterium“, das alle Level gewinnt?
// Sucht per Hill-Climbing EIN Bakterium, das über alle gewählten Level möglichst oft gewinnt
// (Budget und Freischaltungen wie zu Beginn des letzten Levels), und zeigt dann seine Siegquote je Level.
// Gutes Spieldesign: der Allrounder gewinnt deutlich seltener als ein Spezialist pro Level (levels-check).
// Aufruf: node tools/universal-check.mjs [vonLevel] [bisLevel] [iterationen]
import { Simulation } from '../js/sim.js';
import { randomGenome, cost, normalize, COSTED, FREE, stepEntry, parseStep, MAX_REPEAT } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { getLimits, careerPoints } from '../js/progression.js';
import { makeRng } from '../js/rng.js';

const from = Number(process.argv[2] || 11), to = Number(process.argv[3] || 20), iters = Number(process.argv[4] || 50);
const won = Array.from({ length: to - 1 }, (_, k) => k + 1);
const lim = getLimits(won);
const budget = careerPoints(won) + Math.round(0.7 * (to - 1));
const levels = LEVELS.slice(from - 1, to).map((lv, k) => ({ lv, n: from + k }));

const play = (g, lv, seed) => {
  const s = new Simulation({ genomes: [g, ...levelOpponents(lv)], ...lv.plate, seed }).run();
  if (s.winner === 1) return 1;
  const total = s.players.reduce((a, p) => a + p.count, 0);
  return total ? 0.4 * (s.players[0].count / total) : 0;
};
const fit = (g, seeds) => levels.reduce((a, { lv }) => a + seeds.reduce((b, sd) => b + play(g, lv, sd), 0), 0);

function mutate(g, rng) {
  const m = normalize(JSON.parse(JSON.stringify(g)));
  const r = rng();
  const steps = [...lim.steps];
  if (r < 0.35) {
    const a = rng.pick(COSTED.filter((t) => m[t.key] > 0)), b = rng.pick(COSTED.filter((t) => m[t.key] < t.max));
    if (a && b) { m[a.key]--; m[b.key]++; }
  } else if (r < 0.55) {
    const t = rng.pick(FREE); m[t.key] = Math.max(0, Math.min(t.max, m[t.key] + (rng() < 0.5 ? -1 : 1)));
  } else if (r < 0.85) {
    const p = m.program.slice(), op = rng.int(4);
    if (op === 0 && p.length < lim.programMax) p.splice(rng.int(p.length + 1), 0, rng.pick(steps));
    else if (op === 1 && p.length > 1) p.splice(rng.int(p.length), 1);
    else if (op === 2 && lim.repeat) { const k = rng.int(p.length); p[k] = stepEntry(parseStep(p[k]).s, 1 + rng.int(MAX_REPEAT)); }
    else p[rng.int(p.length)] = rng.pick(steps);
    m.program = p;
  } else m.special = rng.pick([...lim.specials]);
  while (cost(m) > budget) { const t = rng.pick(COSTED.filter((x) => m[x.key] > 0)); if (!t) { m.special = 'none'; continue; } m[t.key]--; }
  // Unterhalt kostet: nicht automatisch alle Punkte ausgeben – manchmal ist schlank besser
  if (rng() < 0.5) for (let guard = 50; cost(m) < budget && guard--;) { const t = rng.pick(COSTED.filter((x) => m[x.key] < x.max)); if (!t) break; m[t.key]++; if (cost(m) > budget) { m[t.key]--; break; } }
  return m;
}

const rng = makeRng(77);
const train = [11, 12];
let best = null, bestF = -1;
for (let k = 0; k < 16; k++) { const g = randomGenome(rng, budget, lim); const f = fit(g, [11]); if (f > bestF) { best = g; bestF = f; } }
bestF = fit(best, train);
for (let it = 0; it < iters; it++) {
  const c = mutate(best, rng); const f = fit(c, train);
  if (f >= bestF) { best = c; bestF = f; }
}
console.log(`Allrounder (budget ${budget}): ${JSON.stringify({ p: best.program.join(''), s: best.speed, l: best.lifespan, e: best.efficiency, c: best.chemotaxis, a: best.attack, d: best.defense, div: best.division, m: best.metabolism, sp: best.special })}`);
let total = 0;
for (const { lv, n } of levels) {
  let w = 0;
  for (let s = 0; s < 6; s++) { const sim = new Simulation({ genomes: [best, ...levelOpponents(lv)], ...lv.plate, seed: 900 + s }).run(); if (sim.winner === 1) w++; }
  total += w;
  console.log(`  Level ${n} ${lv.name}: ${w}/6`);
}
console.log(`  insgesamt ${total}/${levels.length * 6}`);
