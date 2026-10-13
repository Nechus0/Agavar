// Schnellprüfung ohne Simulation: schätzt, wie viele vernünftige Bauweisen ein Level schaffen,
// über einen Stärke-Index aus den drei Leisten (Ausbreitung, Kampfkraft, Ausdauer).
// Die beiden freien Parameter (Abstand zum stärksten Gegner, Aufschlag pro weiterem Gegner)
// werden an echten Simulationsergebnissen geeicht (Anteil gewonnener Bauweisen je Level).
// Aufruf: node tools/quick-check.mjs
import { defaultGenome, COSTED, cost } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { getLimits, careerPoints } from '../js/progression.js';
import { compile } from '../js/movement.js';
import { meters } from '../js/meters.js';

// gemessene Anteile aus tools/levels-human.mjs (aktueller Stand der Level; null = seitdem geändert)
const MEASURED = { 1: 1.0, 2: 1.0, 3: 0.75, 4: 0.75, 5: 0.71, 6: 0.42, 7: 0.40, 8: null, 9: 0.39, 10: null };

const ARCHETYPES = {
  Allrounder: ['speed', 'efficiency', 'attack', 'lifespan', 'defense', 'speed', 'efficiency', 'attack', 'lifespan', 'defense'],
  Kämpfer: ['attack', 'defense', 'efficiency', 'attack', 'defense', 'speed', 'attack', 'defense', 'lifespan'],
  Schnell: ['speed', 'efficiency', 'speed', 'attack', 'speed', 'efficiency', 'lifespan', 'speed', 'attack'],
  Ausdauer: ['efficiency', 'lifespan', 'defense', 'efficiency', 'lifespan', 'speed', 'defense', 'attack'],
};
const MOVES = [{ type: 'kreis', size: 1 }, { type: 'taumeln', size: 1 }, { type: 'ecken', size: 1 }];

function builds(n) {
  const won = Array.from({ length: n - 1 }, (_, k) => k + 1);
  const lim = getLimits(won);
  const budget = careerPoints(won);
  const out = [];
  for (const arch of Object.keys(ARCHETYPES)) for (const move of MOVES) for (const special of lim.specials) {
    const res = compile({ ...move, dir: 'R' }, lim);
    if (!res.program) continue;
    const g = { ...defaultGenome(), program: res.program, special };
    let k = 0, guard = 200;
    while (cost(g) < budget && guard--) {
      const key = ARCHETYPES[arch][k++ % ARCHETYPES[arch].length];
      if (g[key] < COSTED.find((t) => t.key === key).max) g[key]++;
    }
    out.push(g);
  }
  return out;
}

const index = (m) => m.spread + m.fight + m.survive;
const LV = LEVELS.map((lv, i) => {
  const opp = levelOpponents(lv).map((o) => index(meters(o)));
  return { n: i + 1, name: lv.name, top: Math.max(...opp), count: opp.length, mine: builds(i + 1).map((g) => index(meters(g))) };
});
const predict = (lv, gap, extra) => lv.mine.filter((s) => s >= lv.top + gap + extra * (lv.count - 1)).length / lv.mine.length;

// Eichung: Raster-Suche über die beiden Parameter
let best = null;
for (let gap = -8; gap <= 8; gap += 0.1) for (let extra = 0; extra <= 4; extra += 0.1) {
  let err = 0;
  for (const lv of LV) if (MEASURED[lv.n] != null) err += (predict(lv, gap, extra) - MEASURED[lv.n]) ** 2;
  if (!best || err < best.err) best = { gap, extra, err };
}
console.log(`Geeicht: Abstand ${best.gap.toFixed(1)}, Aufschlag je weiterem Gegner ${best.extra.toFixed(1)}, mittlere Abweichung ±${Math.round(100 * Math.sqrt(best.err / Object.values(MEASURED).filter((v) => v != null).length))} %-Punkte`);
for (const lv of LV) {
  const p = predict(lv, best.gap, best.extra);
  const m = MEASURED[lv.n];
  console.log(`Level ${String(lv.n).padStart(2)} ${lv.name.padEnd(16)} geschätzt ${String(Math.round(p * 100)).padStart(3)} %` + (m != null ? `   gemessen ${Math.round(m * 100)} %` : '   (neu – noch nicht gemessen)'));
}
