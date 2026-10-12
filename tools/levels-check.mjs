// Prüft die Schwierigkeit der Level: Siegquote verschiedener Spieler-Bakterien (Budget 20).
// Aufruf: node tools/levels-check.mjs [level] [anzahlZufallsspieler] [seeds]
import { Simulation } from '../js/sim.js';
import { randomGenome, defaultGenome, cost, normalize } from '../js/genome.js';
import { LEVELS, LEVEL_BUDGET } from '../js/levels.js';
import { makeRng } from '../js/rng.js';

const only = Number(process.argv[2] || 0);
const nRandom = Number(process.argv[3] || 12);
const seeds = Number(process.argv[4] || 2);

const rng = makeRng(2024);
const casual = Array.from({ length: nRandom }, () => randomGenome(rng, LEVEL_BUDGET));
const experts = [
  defaultGenome(),
  normalize({ program: ['B', 'R', 'B', 'B', 'L', 'B'], speed: 4, lifespan: 1, efficiency: 3, attack: 4, defense: 5, division: 1, metabolism: 2, special: 'chemo' }),
  normalize({ program: ['F', 'F', 'R'], speed: 3, lifespan: 1, efficiency: 4, attack: 5, defense: 4, division: 1, metabolism: 2, special: 'chemo' }),
  normalize({ program: ['F', 'R', 'F', 'L'], speed: 4, lifespan: 2, efficiency: 4, attack: 5, defense: 5, division: 1, metabolism: 2 }),
];

function play(player, lv, seed) {
  const sim = new Simulation({ genomes: [player, ...lv.opponents.map(normalize)], ...lv.plate, seed }).run();
  return sim.winner === 1;
}

LEVELS.forEach((lv, i) => {
  if (only && only !== i + 1) return;
  for (const o of lv.opponents) if (cost(normalize(o)) > 34) console.warn('teuer', o.name, cost(normalize(o)));
  let cw = 0, cn = 0;
  for (const p of casual) for (let s = 0; s < seeds; s++) { cw += play(p, lv, 100 + s); cn++; }
  const ex = experts.map((p) => { let w = 0; for (let s = 0; s < seeds * 2; s++) w += play(p, lv, 500 + s); return `${w}/${seeds * 2}`; });
  const oc = lv.opponents.map((o) => cost(normalize(o))).join(',');
  console.log(`Level ${i + 1} (${lv.name}) gegnerkosten=${oc}: zufällig ${(100 * cw / cn).toFixed(0)}%  experten ${ex.join(' ')}`);
});
