// Schneller Plausibilitätstest: Zufallsduelle, Dauer und Ausgang.
import { Simulation } from '../js/sim.js';
import { randomGenome, defaultGenome } from '../js/genome.js';
import { makeRng } from '../js/rng.js';

const rng = makeRng(42);
const reasons = {};
let ticks = 0, t0 = Date.now();
const runs = Number(process.argv[2] || 20);
for (let k = 0; k < runs; k++) {
  const gs = [randomGenome(rng, 20), randomGenome(rng, 20), randomGenome(rng, 20)];
  const sim = new Simulation({ genomes: gs, size: 'mittel', distribution: 'gleichmaessig', amount: 'normal', regen: process.argv[3]||'normal', seed: k + 1 });
  sim.run();
  ticks += sim.tick;
  reasons[sim.endReason] = (reasons[sim.endReason] || 0) + 1;
  const peaks = sim.players.map((p) => p.peak).join('/');
  console.log(`#${k} tick=${sim.tick} winner=${sim.winner} peaks=${peaks} ${sim.endReason}`);
}
console.log(reasons, 'avg ticks', ticks / runs, 'ms', Date.now() - t0);
