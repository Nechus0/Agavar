import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../js/sim.js';
import { defaultGenome, randomGenome, cost, normalize, encodeGenome, decodeGenome, maxCost } from '../js/genome.js';
import { LEVELS, LEVEL_BUDGET } from '../js/levels.js';
import { makeRng } from '../js/rng.js';

const opts = (genomes, seed = 1) => ({ genomes, size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal', seed });

test('gleicher Seed ergibt identischen Verlauf (Revanche)', () => {
  const rng = makeRng(5);
  const gs = [randomGenome(rng, 20), randomGenome(rng, 20), randomGenome(rng, 20)];
  const a = new Simulation(opts(gs, 77)).run(600);
  const b = new Simulation(opts(gs, 77)).run(600);
  assert.deepEqual(a.history, b.history);
  assert.equal(a.winner, b.winner);
});

test('Zellen bleiben innerhalb der runden Platte', () => {
  const sim = new Simulation(opts([defaultGenome(), defaultGenome()], 3)).run(300);
  for (let i = 0; i < sim.owner.length; i++) if (sim.owner[i]) assert.equal(sim.inPlate[i], 1);
});

test('Simulation endet spätestens nach dem Zeitlimit', () => {
  const sim = new Simulation(opts([defaultGenome(), randomGenome(makeRng(9), 20)], 4)).run();
  assert.ok(sim.done);
  assert.ok(sim.endReason.length > 0);
});

test('Zufallsgenome halten das Budget ein', () => {
  const rng = makeRng(1);
  for (let k = 0; k < 200; k++) {
    const b = 6 + (k % 30);
    assert.ok(cost(randomGenome(rng, b)) <= b);
  }
  assert.ok(maxCost() >= 20);
});

test('Export/Import-Code erhält das Bakterium', () => {
  const g = { ...randomGenome(makeRng(3), 18), name: 'Testkultur Ä', color: '#ff5d5d' };
  const back = decodeGenome(encodeGenome(g));
  assert.deepEqual({ ...back }, normalize(g));
  assert.throws(() => decodeGenome('quatsch'));
});

test('normalize repariert ungültige Daten', () => {
  const g = normalize({ speed: 99, attack: -3, program: ['X', 'F'], special: 'laser', color: 'rot' });
  assert.equal(g.speed, 4);
  assert.equal(g.attack, 0);
  assert.deepEqual(g.program, ['F']);
  assert.equal(g.special, 'none');
  assert.match(g.color, /^#/);
});

test('es gibt 10 Level mit gültigen Gegnern', () => {
  assert.equal(LEVELS.length, 10);
  assert.equal(LEVEL_BUDGET, 20);
  for (const lv of LEVELS) {
    assert.ok(lv.opponents.length >= 1 && lv.opponents.length <= 5);
    for (const o of lv.opponents) assert.deepEqual(normalize(o).program, o.program);
  }
});
