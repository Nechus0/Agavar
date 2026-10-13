import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../js/sim.js';
import { defaultGenome, randomGenome, cost, normalize, maxCost, parseStep } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { GERMS, germSvg } from '../js/germs.js';
import { getLimits, problems, rewardsOf, unlockLevelOf, careerPoints, nextLevel, START_POINTS } from '../js/progression.js';
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
  const g = { ...defaultGenome(), speed: 4, program: ['F3', 'R'] };
  const sim = new Simulation(opts([g, defaultGenome()], 3)).run(300);
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

test('Muster mit Wiederholungen werden gelesen und repariert', () => {
  assert.deepEqual(parseStep('F3'), { s: 'F', n: 3 });
  assert.deepEqual(parseStep('M'), { s: 'M', n: 1 });
  assert.equal(parseStep('X2'), null);
  const g = normalize({ speed: 99, attack: -3, program: ['X', 'F9', 'R2'], special: 'laser', color: 'rot' });
  assert.equal(g.speed, 4);
  assert.equal(g.attack, 0);
  assert.deepEqual(g.program, ['F4', 'R2']);
  assert.equal(g.special, 'none');
  assert.match(g.color, /^#/);
});

test('Simulation führt Wiederholungen und Seitenwechsel aus', () => {
  const g = { ...defaultGenome(), program: ['F2', 'R', 'M'] };
  const sim = new Simulation(opts([g], 2));
  assert.equal(sim.players[0].ph.program.join(','), '0,0,1,8');
  sim.run(200);
  assert.ok(sim.tick > 0);
});

test('Toxine erzeugen eine sichtbare Giftwolke', () => {
  const tox = { ...defaultGenome(), special: 'toxin', efficiency: 3 };
  const sim = new Simulation(opts([tox, defaultGenome()], 6)).run(40);
  assert.ok(sim.fog.some((v) => v > 0));
});

test('10 Level, jedes mit echtem besonderen Gegner', () => {
  assert.equal(LEVELS.length, 10);
  for (const lv of LEVELS) {
    const opps = levelOpponents(lv);
    assert.ok(opps.length >= 1 && opps.length <= 5);
    assert.ok(opps[0].boss);
    for (const o of opps) {
      assert.ok(GERMS[o.germ], `Keim ${o.germ} fehlt`);
      assert.equal(o.name, GERMS[o.germ].name);
      assert.match(germSvg(GERMS[o.germ].shape, o.color), /^<svg/);
    }
  }
});

test('Besondere Gegner zeigen die Fähigkeit, die man bei ihnen freischaltet', () => {
  for (let n = 1; n <= LEVELS.length; n++) {
    const opps = levelOpponents(LEVELS[n - 1]);
    const boss = opps[0];
    for (const r of rewardsOf(n)) {
      // Spezialfähigkeiten zeigt der besondere Gegner, Bewegungsarten irgendein Gegner im Level
      if (r.type === 'special') assert.ok([boss.special, boss.bonusSpecial].includes(r.key), `Level ${n}: Boss hat ${r.key} nicht`);
      if (r.type === 'move') assert.ok(opps.some((o) => moveFromProgram(o.program)?.type === r.key), `Level ${n}: niemand bewegt sich als ${r.key}`);
    }
  }
});

test('Karriere: Startpunkte, Punkte pro Sieg, nächstes Level', () => {
  assert.equal(careerPoints([]), START_POINTS);
  assert.equal(careerPoints([1, 2]), START_POINTS + 4);
  assert.equal(nextLevel([], 10), 1);
  assert.equal(nextLevel([1, 2], 10), 3);
  assert.equal(nextLevel([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10), 11);
});

test('Freischalten: am Anfang eingeschränkt, nach allen Leveln alles offen', () => {
  const start = getLimits([]);
  assert.ok(!start.specials.has('capsule'));
  assert.ok(!start.steps.has('Z') && !start.steps.has('P'));
  assert.equal(start.programMax, 4);
  assert.equal(start.repeat, false);
  const all = getLimits([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(all.programMax, 6);
  assert.ok(all.repeat);
  for (const k of ['spores', 'capsule', 'photo', 'predator', 'biofilm', 'toxin']) assert.ok(all.specials.has(k));
  for (const k of ['P', 'B', 'Z', 'M']) assert.ok(all.steps.has(k));
  assert.equal(unlockLevelOf('special', 'toxin'), 9);
});

test('problems() erkennt Verstöße', () => {
  const lim = getLimits([]);
  assert.deepEqual(problems({ ...defaultGenome(), speed: 2, attack: 2, defense: 2 }, lim, START_POINTS), []);
  const bad = { ...defaultGenome(), speed: 4, attack: 4, special: 'toxin', program: ['F2', 'Z'] };
  assert.ok(problems(bad, lim, START_POINTS).length >= 3);
});

test('Zufallsgenome mit Grenzen halten die Freischaltungen ein', () => {
  const rng = makeRng(8);
  for (const won of [[], [1, 2], [1, 2, 3, 4, 5]]) {
    const lim = getLimits(won);
    for (let k = 0; k < 60; k++) assert.deepEqual(problems(randomGenome(rng, 10, lim), lim, 10), []);
  }
});

import { MOVES, compile, moveFromProgram, actionsOf, pathSvg } from '../js/movement.js';

test('Bewegungsarten: alle Größen lassen sich mit allen Freischaltungen erzeugen und wiedererkennen', () => {
  const all = getLimits([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const m of MOVES) {
    for (let size = 0; size < (m.sizes ? m.sizes.length : 1); size++) {
      for (const dir of m.turn ? ['R', 'L'] : ['R']) {
        const move = { type: m.key, size, dir };
        const res = compile(move, all);
        assert.ok(res.program, `${m.key}/${size}/${dir} nicht erzeugbar`);
        assert.deepEqual(problems({ ...defaultGenome(), program: res.program }, all, 99), []);
        assert.deepEqual(moveFromProgram(res.program), move);
        assert.match(pathSvg(res.program), /^<svg/);
      }
    }
  }
});

test('Bewegungsarten: am Anfang nur die einfachen, Sitzen erst nach Level 1', () => {
  const start = getLimits([]);
  for (const key of ['gerade', 'kreis', 'ecken', 'welle', 'treppe']) assert.ok(compile({ type: key, size: 0, dir: 'R' }, start).program, key);
  for (const key of ['sitzen', 'pendeln', 'taumeln', 'schlange', 'acht']) assert.ok(compile({ type: key, size: 0, dir: 'R' }, start).locked, key);
  assert.ok(compile({ type: 'sitzen', size: 0 }, getLimits([1])).program);
  // große Welle braucht Wiederholungen (Level 5)
  assert.ok(compile({ type: 'welle', size: 2 }, getLimits([1, 2, 3, 4])).locked);
  assert.ok(compile({ type: 'welle', size: 2 }, getLimits([1, 2, 3, 4, 5])).program);
  assert.deepEqual(actionsOf({ type: 'kreis', size: 1, dir: 'L' }), ['F', 'L']);
});

test('Neue Spezialfähigkeiten: Kapsel schützt, Räuber frisst, Chemotaxis ist eine Eigenschaft', () => {
  // alte Spielstände mit Chemotaxis als Spezialfähigkeit werden umgewandelt
  const old = normalize({ special: 'chemo', speed: 1 });
  assert.equal(old.special, 'none');
  assert.equal(old.chemotaxis, 3);
  const cap = { ...defaultGenome(), special: 'capsule', program: ['F', 'R'], efficiency: 4, lifespan: 4, speed: 2 };
  const hunter = { ...defaultGenome(), special: 'predator', attack: 5, speed: 4, efficiency: 2 };
  const sim = new Simulation(opts([hunter, cap], 9));
  assert.ok(sim.shield.some((v, i) => v && sim.owner[i] === 2), 'Kapsel-Zellen haben Schutz');
  sim.run(400);
  assert.ok(sim.players[0].kills > 0);
  assert.ok(sim.bite.some((v) => v > 0) || sim.players[0].kills > 0);
  const photo = new Simulation(opts([{ ...defaultGenome(), special: 'photo' }], 3));
  assert.ok(photo.players[0].ph.photo);
});
