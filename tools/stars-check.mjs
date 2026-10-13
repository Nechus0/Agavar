// Prüft, ob in einem Level alle drei Sterne in EINEM Durchgang erreichbar sind.
// Annahme: Idealverlauf der Karriere – alle vorherigen Level gewonnen und mit 3 Sternen
// (also inklusive Bonuspunkte). Ein Optimierer sucht ein Bakterium mit möglichst hoher 3-Sterne-Quote.
// Aufruf: node tools/stars-check.mjs <level>
import { Simulation } from '../js/sim.js';
import { randomGenome, cost, normalize, COSTED, FREE, stepEntry, parseStep, MAX_REPEAT } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { getLimits, careerPoints, starMask, starCount } from '../js/progression.js';
import { makeRng } from '../js/rng.js';

const n = Number(process.argv[2] || 1);
const lv = LEVELS[n - 1];
const won = Array.from({ length: n - 1 }, (_, k) => k + 1);
const stars = Object.fromEntries(won.map((k) => [k, 7]));
const lim = getLimits(won);
const budget = careerPoints(won, stars);
const rng = makeRng(4000 + n);

const run = (g, seed) => new Simulation({ genomes: [g, ...levelOpponents(lv)], ...lv.plate, seed }).run();
// Bewertung: Anteil erreichter Sterne, plus etwas Gewicht auf „Fläche“, damit der Optimierer eine Richtung hat
function score(g, seed) {
  const s = run(g, seed);
  const m = starMask(s);
  return starCount(m) / 3 + 0.2 * Math.min(1, s.players[0].peakPlate / 0.3);
}

function mutate(g) {
  const m = normalize(JSON.parse(JSON.stringify(g)));
  const r = rng();
  if (r < 0.4) {
    const from = rng.pick(COSTED.filter((t) => m[t.key] > 0));
    const to = rng.pick(COSTED.filter((t) => m[t.key] < t.max));
    if (from && to) { m[from.key]--; m[to.key]++; }
  } else if (r < 0.6) {
    const t = rng.pick(FREE);
    m[t.key] = Math.max(0, Math.min(t.max, m[t.key] + (rng() < 0.5 ? -1 : 1)));
  } else if (r < 0.88) {
    const p = m.program.slice();
    const steps = [...lim.steps];
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
  }
  return m;
}

const evalSeeds = [11, 12, 13, 14];
const fit = (g) => evalSeeds.reduce((a, sd) => a + score(g, sd), 0);
const pool = Array.from({ length: 30 }, () => randomGenome(rng, budget, lim))
  .map((g) => ({ g, f: score(g, 11) + score(g, 12) }))
  .sort((a, b) => b.f - a.f);
let best = pool[0].g, bestF = fit(best);
for (let it = 0; it < 90; it++) {
  const c = mutate(best);
  const f = fit(c);
  if (f >= bestF) { best = c; bestF = f; }
}
// Kontrolle auf neuen Zufallsstarts: Wie oft gibt es alle 3 Sterne in einem Spiel?
let three = 0, any = 0;
const tally = { sieg: 0, schnell: 0, gross: 0 };
const N = 10;
for (let s = 0; s < N; s++) {
  const m = starMask(run(best, 900 + s));
  if (m === 7) three++;
  if (m & 1) { any++; tally.sieg++; }
  if (m & 2) tally.schnell++;
  if (m & 4) tally.gross++;
}
console.log(`Level ${n} (${lv.name}) ${budget} Pkt: 3 Sterne in ${three}/${N} Spielen | Sieg ${tally.sieg}, schnell ${tally.schnell}, groß ${tally.gross} | ` +
  JSON.stringify({ p: best.program.join(''), s: best.speed, l: best.lifespan, e: best.efficiency, c: best.chemotaxis, a: best.attack, d: best.defense, div: best.division, m: best.metabolism, sp: best.special }));
