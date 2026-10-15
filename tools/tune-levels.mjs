// Schwierigkeit eines Levels bei gegebener Gegnerstärke (POWER) schnell prüfen:
//  faul   = Punkte gleichmäßig verteilt, geradeaus (soll meist verlieren)
//  clever = kurze Optimierung (soll meist gewinnen)
// Aufruf: POWER_LEVEL=n POWER=p node tools/tune-levels.mjs n
import { Simulation } from '../js/sim.js';
import { randomGenome, cost, normalize, COSTED, FREE, defaultGenome, stepEntry, parseStep, MAX_REPEAT } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { getLimits, plannedBudget } from '../js/progression.js';
import { makeRng } from '../js/rng.js';

const n = Number(process.argv[2]);
const lv = LEVELS[n - 1];
const won = Array.from({ length: n - 1 }, (_, k) => k + 1);
const lim = getLimits(won);
// SHARE = Anteil der Bonussterne aus den Leveln davor (1 = alle Sterne)
const budget = Number(process.env.BUDGET) || plannedBudget(n, process.env.SHARE === undefined ? 1 : Number(process.env.SHARE));
const sim = (g, seed) => new Simulation({ genomes: [g, ...levelOpponents(lv, g)], ...lv.plate, seed }).run();
const score = (g, seed) => { const s = sim(g, seed); if (s.winner === 1) return 1; const t = s.players.reduce((a, p) => a + p.count, 0); return t ? 0.5 * s.players[0].count / t : 0; };

const lazy = { ...defaultGenome() };
for (let k = 0, guard = 0; guard < 200; k++, guard++) { const t = COSTED[k % COSTED.length]; if (lazy[t.key] >= t.max) continue; lazy[t.key]++; if (cost(lazy) > budget) { lazy[t.key]--; break; } }
let lw = 0; for (let s = 0; s < 6; s++) if (sim(lazy, 900 + s).winner === 1) lw++;

const rng = makeRng(4000 + n);
function mutate(g) {
  const m = normalize(JSON.parse(JSON.stringify(g)));
  const r = rng(), steps = [...lim.steps];
  if (r < 0.35) { const a = rng.pick(COSTED.filter((t) => m[t.key] > 0)), b = rng.pick(COSTED.filter((t) => m[t.key] < t.max)); if (a && b) { m[a.key]--; m[b.key]++; } }
  else if (r < 0.55) { const t = rng.pick(FREE); m[t.key] = Math.max(0, Math.min(t.max, m[t.key] + (rng() < 0.5 ? -1 : 1))); }
  else if (r < 0.85) { const p = m.program.slice(), op = rng.int(4); if (op === 0 && p.length < lim.programMax) p.splice(rng.int(p.length + 1), 0, rng.pick(steps)); else if (op === 1 && p.length > 1) p.splice(rng.int(p.length), 1); else if (op === 2 && lim.repeat) { const k = rng.int(p.length); p[k] = stepEntry(parseStep(p[k]).s, 1 + rng.int(MAX_REPEAT)); } else p[rng.int(p.length)] = rng.pick(steps); m.program = p; }
  else m.special = rng.pick([...lim.specials]);
  while (cost(m) > budget) { const t = rng.pick(COSTED.filter((x) => m[x.key] > 0)); if (!t) { m.special = 'none'; continue; } m[t.key]--; }
  if (rng() < 0.6) for (let guard = 50; cost(m) < budget && guard--;) { const t = rng.pick(COSTED.filter((x) => m[x.key] < x.max)); if (!t) break; m[t.key]++; if (cost(m) > budget) { m[t.key]--; break; } }
  return m;
}
const seeds = [300, 301, 302];
const fit = (g) => seeds.reduce((a, s) => a + score(g, s), 0);
let best = null, bestF = -1;
for (let k = 0; k < 20; k++) { const g = randomGenome(rng, budget, lim); const f = score(g, 300); if (f > bestF) { best = g; bestF = f; } }
bestF = fit(best);
for (let it = 0; it < 45 && bestF < seeds.length; it++) { const c = mutate(best); const f = fit(c); if (f >= bestF) { best = c; bestF = f; } }
let cw = 0; for (let s = 0; s < 6; s++) if (sim(best, 700 + s).winner === 1) cw++;
console.log(JSON.stringify({ level: n, power: Number(process.env.POWER ?? NaN), budget, lazy: lw, clever: cw, best: { p: best.program.join(''), s: best.speed, l: best.lifespan, e: best.efficiency, c: best.chemotaxis, a: best.attack, d: best.defense, div: best.division, m: best.metabolism, size: best.size, sp: best.special } }));
