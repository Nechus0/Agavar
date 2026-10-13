import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../js/sim.js';
import { defaultGenome, randomGenome, cost, normalize, encodeGenome, decodeGenome, maxCost } from '../js/genome.js';
import { LEVELS } from '../js/levels.js';
import { getLimits, problems, rewardsOf, unlockLevelOf } from '../js/progression.js';
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
  for (let k = 1; k < LEVELS.length; k++) assert.ok(LEVELS[k].budget >= LEVELS[k - 1].budget, 'Budget steigt');
  for (const lv of LEVELS) {
    assert.ok(lv.opponents.length >= 1 && lv.opponents.length <= 5);
    for (const o of lv.opponents) assert.deepEqual(normalize(o).program, o.program);
  }
});

test('Freischalten: am Anfang eingeschränkt, nach allen Leveln alles offen', () => {
  const start = getLimits([]);
  assert.equal(start.traitMax, 2);
  assert.ok(!start.specials.has('chemo'));
  assert.ok(!start.steps.has('Z'));
  assert.equal(start.programMax, 4);
  const all = getLimits([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(all.traitMax, 5);
  assert.equal(all.programMax, 6);
  for (const k of ['spores', 'chemo', 'biofilm', 'toxin']) assert.ok(all.specials.has(k));
  assert.ok(all.steps.has('Z') && all.steps.has('B'));
  assert.ok(rewardsOf(2).some((r) => r.key === 'chemo'));
  assert.equal(unlockLevelOf('special', 'toxin'), 7);
});

test('Start-Bakterium passt in Level 1, problems() erkennt Verstöße', () => {
  const lim = getLimits([]);
  assert.deepEqual(problems(defaultGenome(), lim, LEVELS[0].budget), []);
  const bad = { ...defaultGenome(), speed: 4, special: 'toxin', program: ['F', 'Z'] };
  assert.ok(problems(bad, lim, 8).length >= 3);
});

test('Zufallsgenome mit Grenzen halten die Freischaltungen ein', () => {
  const rng = makeRng(8);
  const lim = getLimits([1, 2]);
  for (let k = 0; k < 100; k++) assert.deepEqual(problems(randomGenome(rng, 10, lim), lim, 10), []);
});

test('90°-Schritte werden in der Simulation erkannt', () => {
  const g = { ...defaultGenome(), program: ['F', 'D', 'S'] };
  const sim = new Simulation(opts([g], 2));
  assert.equal(sim.players[0].ph.program.join(','), '0,6,7');
  sim.run(200);
  assert.ok(sim.tick > 0);
});
