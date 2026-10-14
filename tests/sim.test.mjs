import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../js/sim.js';
import { defaultGenome, randomGenome, cost, normalize, maxCost, parseStep } from '../js/genome.js';
import { LEVELS, levelOpponents } from '../js/levels.js';
import { GERMS, germSvg } from '../js/germs.js';
import { getLimits, problems, rewardsOf, unlockLevelOf, careerPoints, nextLevel, START_POINTS, POINTS_PER_WIN } from '../js/progression.js';
import { makeRng } from '../js/rng.js';
import { ELEMENTS } from '../js/elements.js';

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
  assert.equal(g.speed, 10);
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

test('20 Level in Welt 1, jedes mit echtem besonderen Gegner und einer Begründung für die Platte', () => {
  assert.equal(LEVELS.length, 20);
  for (const lv of LEVELS) {
    const opps = levelOpponents(lv);
    assert.ok(opps.length >= 1 && opps.length <= 5);
    assert.ok(opps[0].boss);
    assert.ok(lv.note && lv.note.length > 20, `${lv.name}: Labornotiz fehlt`);
    for (const e of lv.plate.elements || []) assert.ok(ELEMENTS[e.type], `${lv.name}: unbekanntes Element ${e.type}`);
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
  assert.equal(careerPoints([1, 2]), START_POINTS + 2 * POINTS_PER_WIN);
  assert.equal(nextLevel([], 10), 1);
  assert.equal(nextLevel([1, 2], 10), 3);
  assert.equal(nextLevel([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10), 11);
});

test('Freischalten: am Anfang eingeschränkt, nach Welt 1 die Haut-Fähigkeiten offen', () => {
  const start = getLimits([]);
  assert.ok(!start.specials.has('capsule'));
  assert.ok(!start.steps.has('Z') && !start.steps.has('P'));
  assert.equal(start.programMax, 4);
  assert.equal(start.repeat, false);
  const all = getLimits([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(all.programMax, 6);
  assert.ok(all.repeat);
  for (const k of ['capsule', 'biofilm', 'toxin']) assert.ok(all.specials.has(k));
  // Photosynthese, Sporen und Räuber gibt es erst in späteren Welten (Wasser, Boden)
  assert.ok(!all.specials.has('photo') && !all.specials.has('predator') && !all.specials.has('spores'));
  for (const k of ['P', 'B', 'Z', 'D', 'S', 'M']) assert.ok(all.steps.has(k));
  assert.equal(unlockLevelOf('special', 'toxin'), 9);
});

test('problems() erkennt Verstöße', () => {
  const lim = getLimits([]);
  assert.deepEqual(problems({ ...defaultGenome(), speed: 4, attack: 4, defense: 4 }, lim, START_POINTS), []);
  const bad = { ...defaultGenome(), speed: 8, attack: 8, special: 'toxin', program: ['F2', 'Z'] };
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
  for (const key of ['gerade', 'kreis', 'welle']) assert.ok(compile({ type: key, size: 0, dir: 'R' }, start).program, key);
  for (const key of ['ecken', 'treppe', 'sitzen', 'pendeln', 'taumeln', 'schlange']) assert.ok(compile({ type: key, size: 0, dir: 'R' }, start).locked, key);
  assert.ok(compile({ type: 'sitzen', size: 0 }, getLimits([1])).program);
  // Ecken und Treppe nach Level 5 (Corynebacterium)
  assert.ok(compile({ type: 'ecken', size: 0, dir: 'R' }, getLimits([1, 2, 3, 4, 5])).program);
  // große Welle braucht Wiederholungen (Level 6)
  assert.ok(compile({ type: 'welle', size: 2 }, getLimits([1, 2, 3, 4, 5])).locked);
  assert.ok(compile({ type: 'welle', size: 2 }, getLimits([1, 2, 3, 4, 5, 6])).program);
  assert.deepEqual(actionsOf({ type: 'kreis', size: 1, dir: 'L' }), ['F', 'L']);
});

test('Neue Spezialfähigkeiten: Kapsel schützt, Räuber frisst, Chemotaxis ist eine Eigenschaft', () => {
  // alte Spielstände mit Chemotaxis als Spezialfähigkeit werden umgewandelt
  const old = normalize({ special: 'chemo', speed: 1 });
  assert.equal(old.special, 'none');
  assert.equal(old.chemotaxis, 6);
  const cap = { ...defaultGenome(), special: 'capsule', program: ['F', 'R'], efficiency: 8, lifespan: 8, speed: 4 };
  const hunter = { ...defaultGenome(), special: 'predator', attack: 10, speed: 8, efficiency: 4 };
  const sim = new Simulation(opts([hunter, cap], 9));
  assert.ok(sim.shield.some((v, i) => v && sim.owner[i] === 2), 'Kapsel-Zellen haben Schutz');
  sim.run(400);
  assert.ok(sim.players[0].kills > 0);
  assert.ok(sim.bite.some((v) => v > 0) || sim.players[0].kills > 0);
  const photo = new Simulation(opts([{ ...defaultGenome(), special: 'photo' }], 3));
  assert.ok(photo.players[0].ph.photo);
});

import { starMask, starCount } from '../js/progression.js';
import { analyze, ACHIEVEMENTS } from '../js/insights.js';

test('Sterne, Bonuspunkt, Auswertung und Erfolge', () => {
  assert.equal(careerPoints([1, 2], { 1: 7, 2: 3 }), START_POINTS + 2 * POINTS_PER_WIN + 1);
  assert.equal(starCount(5), 2);
  const strong = { ...defaultGenome(), name: 'Stark', speed: 6, efficiency: 8, attack: 10, defense: 10, lifespan: 6 };
  const weak = { ...defaultGenome(), name: 'Schwach', program: ['P'] };
  const sim = new Simulation(opts([strong, weak], 11)).run();
  const p = sim.players[0];
  assert.ok(p.peakShare > 0 && p.peakShare <= 1);
  assert.ok(p.died.starve + p.died.age + p.died.fight + p.died.toxin > 0);
  if (sim.winner === 1) assert.ok(starMask(sim) & 1); else assert.equal(starMask(sim), 0);
  const tips = analyze(sim, [strong, weak], starMask(sim));
  assert.ok(tips.length >= 1 && tips.every((t) => typeof t.text === 'string' && t.text.length > 10));
  const ctx = { sim, mode: 'free', level: 0, mask: 0, genome: strong, opponents: 1, globalLimits: getLimits([]), atlasCount: 0, atlasTotal: 18 };
  for (const a of ACHIEVEMENTS) assert.equal(typeof a.check(ctx), 'boolean', a.key);
});

import { energyProfile } from '../js/sim.js';

test('Energiebilanz: Warten spart Bewegungsenergie, sparsamer Stoffwechsel verbraucht weniger', () => {
  const base = { ...defaultGenome(), speed: 6, efficiency: 4 };
  const moving = energyProfile({ ...base, program: ['F'] });
  const sitting = energyProfile({ ...base, program: ['F', 'P', 'P', 'P'] });
  assert.ok(sitting.move < moving.move);
  assert.equal(sitting.moveFrac, 0.25);
  const frugal = energyProfile({ ...base, metabolism: 0 });
  const greedy = energyProfile({ ...base, metabolism: 4 });
  assert.ok(frugal.basal < greedy.basal && frugal.intake < greedy.intake);
  // sparsam nutzt Nahrung im Verhältnis zum Grundumsatz effizienter
  assert.ok(frugal.intake / frugal.basal > greedy.intake / greedy.basal);
  assert.ok(Number.isFinite(moving.roundsToDivide) && moving.roundsWithoutFood > 0);
});

import { meters, counterTips } from '../js/meters.js';

test('Leisten und Konter-Hinweise', () => {
  const runner = meters({ ...defaultGenome(), speed: 8, efficiency: 8, division: 0, program: ['F'] });
  const tank = meters({ ...defaultGenome(), attack: 10, defense: 10, special: 'capsule', program: ['P'] });
  const camper = meters({ ...defaultGenome(), lifespan: 8, efficiency: 8, metabolism: 0, special: 'spores', program: ['P'] });
  assert.ok(runner.spread > tank.spread);
  assert.ok(tank.fight > runner.fight);
  assert.ok(camper.survive > runner.survive);
  for (const m of [runner, tank, camper]) for (const v of Object.values(m)) assert.ok(v >= 0 && v <= 10);
  for (const lv of LEVELS) for (const o of levelOpponents(lv)) {
    const tips = counterTips(o, 2);
    assert.ok(tips.length >= 1 && tips.length <= 2 && tips.every((t) => t.length > 15));
  }
  assert.ok(counterTips({ ...defaultGenome(), special: 'toxin' })[0].includes('Poison'));
});

import { namePool, randomName } from '../js/names.js';
import { SPECIALS } from '../js/genome.js';

test('Zufallsnamen passen zur Welt und doppeln keine echten Keime oder vergebenen Namen', () => {
  const skinGerms = Object.values(GERMS).filter((g) => g.world === 1).map((g) => g.name);
  const pool = namePool(1);
  assert.ok(pool.length > 50);
  for (const n of skinGerms) assert.ok(!pool.includes(n), n);
  const rng = makeRng(3);
  const taken = [];
  for (let k = 0; k < 40; k++) {
    const n = randomName(rng, 1, taken);
    assert.ok(!taken.includes(n) && !skinGerms.includes(n));
    taken.push(n);
  }
});

test('Spezialfähigkeiten kosten je nach Stärke unterschiedlich viel', () => {
  const costs = Object.entries(SPECIALS).filter(([k]) => k !== 'none').map(([, s]) => s.cost);
  assert.ok(new Set(costs).size >= 3);
  assert.ok(SPECIALS.toxin.cost > SPECIALS.spores.cost);
});

test('Elemente: gleicher Seed, gleicher Verlauf; Wände blockieren; jedes Element läuft', () => {
  const g = { ...defaultGenome(), speed: 4, efficiency: 4, program: ['F', 'R'] };
  for (const type of Object.keys(ELEMENTS)) {
    const o = { ...opts([g, { ...g, color: '#cc5252' }], 9), elements: [{ type, at: type === 'phage' ? [150] : 0 }] };
    const a = new Simulation(o).run(400), b = new Simulation(o).run(400);
    assert.deepEqual(a.history, b.history, type);
  }
  const sim = new Simulation({ ...opts([g], 4), elements: [{ type: 'stones', count: 8 }] }).run(300);
  let blocked = 0;
  for (let i = 0; i < sim.owner.length; i++) if (sim.wall[i]) { blocked++; assert.equal(sim.owner[i], 0); }
  assert.ok(blocked > 20);
});

test('Antibiotika-Plättchen und Immunzellen töten Zellen', () => {
  const g = { ...defaultGenome(), speed: 6, efficiency: 6, lifespan: 4, program: ['F', 'R'] };
  const disc = new Simulation({ ...opts([g], 2), elements: [{ type: 'disc', at: 0, halo: 0.6 }] }).run(800);
  assert.ok(disc.players[0].died.env > 0);
  const imm = new Simulation({ ...opts([g], 2), elements: [{ type: 'immune', at: 100 }] }).run(800);
  assert.ok(imm.players[0].died.env > 0);
});
