// Prüft die Schwierigkeit der Level unter realistischen Bedingungen:
// Spieler-Bakterien halten das Level-Budget und die bis dahin freigeschalteten Fähigkeiten ein.
//  - "zufällig": zufällig gebaute Bakterien (Gelegenheitsspieler)
//  - "clever":   per Hill-Climbing optimiertes Bakterium (gut überlegter Entwurf)
// Aufruf: node tools/levels-check.mjs [level] [zufallsspieler] [seeds]
import { Simulation } from '../js/sim.js';
import { randomGenome, cost, normalize, COSTED, FREE, defaultGenome, stepEntry, parseStep, MAX_REPEAT } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { getLimits, problems, careerPoints } from '../js/progression.js';
import { makeRng } from '../js/rng.js';

const only = Number(process.argv[2] || 0);
const nRandom = Number(process.argv[3] || 12);
const seeds = Number(process.argv[4] || 2);

function sim(player, lv, seed) {
  return new Simulation({ genomes: [player, ...levelOpponents(lv)], ...lv.plate, seed }).run();
}
const play = (player, lv, seed) => (sim(player, lv, seed).winner === 1 ? 1 : 0);
// stetige Bewertung für die Optimierung: Sieg = 1, sonst Anteil an allen lebenden Zellen (max. 0,5)
function score(player, lv, seed) {
  const s = sim(player, lv, seed);
  if (s.winner === 1) return 1;
  const total = s.players.reduce((a, p) => a + p.count, 0);
  return total ? 0.5 * (s.players[0].count / total) : 0;
}

function mutate(g, rng, lim, budget) {
  const m = normalize(JSON.parse(JSON.stringify(g)));
  const r = rng();
  const steps = [...lim.steps];
  if (r < 0.35) {
    const from = rng.pick(COSTED.filter((t) => m[t.key] > 0));
    const to = rng.pick(COSTED.filter((t) => m[t.key] < t.max));
    if (from && to) { m[from.key]--; m[to.key]++; }
  } else if (r < 0.55) {
    const t = rng.pick(FREE);
    m[t.key] = Math.max(0, Math.min(t.max, m[t.key] + (rng() < 0.5 ? -1 : 1)));
  } else if (r < 0.85) {
    const p = m.program.slice();
    const op = rng.int(4);
    if (op === 0 && p.length < lim.programMax) p.splice(rng.int(p.length + 1), 0, rng.pick(steps));
    else if (op === 1 && p.length > 1) p.splice(rng.int(p.length), 1);
    else if (op === 2 && lim.repeat) { const k = rng.int(p.length); p[k] = stepEntry(parseStep(p[k]).s, 1 + rng.int(MAX_REPEAT)); }
    else p[rng.int(p.length)] = rng.pick(steps);
    m.program = p;
  } else {
    m.special = rng.pick([...lim.specials]);
  }
  while (cost(m) > budget) {
    const t = rng.pick(COSTED.filter((x) => m[x.key] > 0));
    if (!t) { m.special = 'none'; continue; }
    m[t.key]--;
  }
  let guard = 50;
  while (cost(m) < budget && guard--) {
    const t = rng.pick(COSTED.filter((x) => m[x.key] < x.max));
    if (!t) break;
    m[t.key]++;
    if (cost(m) > budget) { m[t.key]--; break; }
  }
  return m;
}

LEVELS.forEach((lv0, i) => {
  let lv = lv0;
  const n = i + 1;
  if (only && only !== n) return;
  const won = Array.from({ length: n - 1 }, (_, k) => k + 1);
  const lim = getLimits(won);
  // STARS=0.7: Anteil der bisherigen Level mit drei Sternen (Bonuspunkte wie im echten Spiel)
  lv = { ...lv, budget: careerPoints(won) + Math.round((Number(process.env.STARS) || 0) * (n - 1)) };
  const rng = makeRng(1000 + n);
  const casual = Array.from({ length: nRandom }, () => randomGenome(rng, lv.budget, lim));
  for (const c of casual) if (problems(c, lim, lv.budget).length) throw new Error('Zufallsgenom verletzt Regeln: ' + problems(c, lim, lv.budget));
  // „faul“: Punkte gleichmäßig verteilt, Muster nur geradeaus
  const lazy = { ...defaultGenome(), name: 'faul' };
  for (let k = 0, guard = 0; guard < 200; k++, guard++) { const t = COSTED[k % COSTED.length]; if (lazy[t.key] >= t.max) continue; lazy[t.key]++; if (cost(lazy) > lv.budget) { lazy[t.key]--; break; } }
  let lw = 0;
  for (let s = 0; s < 6; s++) lw += play(lazy, lv, 900 + s);

  let cw = 0;
  for (const p of casual) for (let s = 0; s < seeds; s++) cw += play(p, lv, 100 + s);

  // Optimierung: 30 Zufallskandidaten vorsortieren, dann Hill-Climbing mit stetiger Bewertung
  const evalSeeds = [300, 301, 302, 303];
  const fit = (g) => evalSeeds.reduce((s, sd) => s + score(g, lv, sd), 0);
  const pool = [...casual, ...Array.from({ length: 18 }, () => randomGenome(rng, lv.budget, lim))]
    .map((g) => ({ g, f: score(g, lv, 300) + score(g, lv, 301) }))
    .sort((a, b) => b.f - a.f);
  let best = pool[0].g;
  let bestF = fit(best);
  for (let it = 0; it < 70 && bestF < evalSeeds.length; it++) {
    const cand = mutate(best, rng, lim, lv.budget);
    const f = fit(cand);
    if (f >= bestF) { best = cand; bestF = f; }
  }
  // unabhängige Kontrolle auf neuen Seeds
  let ew = 0;
  for (let s = 0; s < 6; s++) ew += play(best, lv, 700 + s);

  const oc = levelOpponents(lv).map((o) => cost(o)).join(',');
  console.log(`Level ${n} (${lv.name}) budget=${lv.budget} gegner=${oc}: zufällig ${(100 * cw / (nRandom * seeds)).toFixed(0)}%  faul ${lw}/6  clever ${ew}/6  ` +
    JSON.stringify({ p: best.program.join(''), s: best.speed, l: best.lifespan, e: best.efficiency, a: best.attack, d: best.defense, div: best.division, m: best.metabolism, sp: best.special }));
});
