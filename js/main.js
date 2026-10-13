// Oberfläche: Bildschirme, Karriere, Editor, Spielablauf – im Agava-Design-System („Lab at night“).
import {
  COSTED, FREE, SPECIALS, SPECIAL_KEYS, PALETTE, TRAIT_MAX,
  MIN_BUDGET, MAX_BUDGET, defaultGenome, cost, normalize, randomGenome, specialsOf, symbolOf,
} from './genome.js';
import { Simulation, DISTRIBUTIONS, MAX_TICKS, energyProfile, phenotype, ROUNDS_PER_HOUR } from './sim.js';
import { PlateRenderer, drawHistory, GrowthAnimator } from './render.js';
import { makeRng, randomSeed } from './rng.js';
import { randomName } from './names.js';
import { LEVELS, levelOpponents } from './levels.js';
import { GERMS, germSvg } from './germs.js';
import {
  getLimits, unlockLevelOf, rewardsOf, problems, careerPoints, nextLevel, START_POINTS, POINTS_PER_WIN,
  STAR_GOALS, starMask, starCount,
} from './progression.js';
import { analyze, ACHIEVEMENTS } from './insights.js';
import { SPECIAL_ICONS, TRAIT_ICONS, UI_ICONS, ACH_ICONS } from './icons.js';
import { MOVES, MOVE_BY_KEY, actionsOf, compile, moveFromProgram, describeMove, pathSvg } from './movement.js';
import * as store from './storage.js';
import { meters, METER_INFO, counterTips } from './meters.js';
import { play, setSoundEnabled } from './sound.js';
import { PHOTOS } from './germ-photos.js';
import { WORLDS, EXPANSIONS, LEVELS_PER_WORLD, worldOfLevel } from './worlds.js';
import { startMusic, stopMusic } from './music.js';

const $ = (sel) => document.querySelector(sel);
const BREW_HOURS = 48; // eine Runde = 48 Stunden Brutzeit

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

// Inhalt ersetzen, leere Einträge (null/false) überspringen
function fill(node, ...kids) {
  node.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
}

// SVG-Grafik (nur eigene, feste Strings aus icons.js / germs.js / movement.js)
function icon(svg, cls = '') {
  const s = el('span', { class: `ico ${cls}` });
  s.innerHTML = svg;
  return s;
}
const ui = (name, cls = '') => icon(UI_ICONS[name], cls);
function germPic(germ, color, cls = '') {
  const s = el('span', { class: `germ-pic ${cls}` });
  s.innerHTML = germSvg(GERMS[germ].shape, color);
  return s;
}
// Kulturfarbe immer zusammen mit ihrem Symbol (Farbe ist nie das einzige Merkmal)
const culture = (color, cls = '') => el('span', { class: `culture ${cls}`, style: `background:${color}`, 'aria-hidden': 'true' }, symbolOf(color));
const specialIcon = (key, cls = '') => icon(SPECIAL_ICONS[key], cls);

// feste Symbole im HTML (data-icon) einsetzen
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((s) => {
    if (!s.dataset.done && UI_ICONS[s.dataset.icon]) { s.innerHTML = UI_ICONS[s.dataset.icon]; s.dataset.done = '1'; }
  });
}

// Drei Leisten (Ausbreitung, Kampfkraft, Ausdauer); mit `other` als Vergleich „Du vs. Gegner“
function meterBars(g, other = null, otherLabel = '') {
  const a = meters(g);
  const b = other ? meters(other) : null;
  return el('div', { class: 'meters' },
    b ? el('div', { class: 'm-legend' }, el('span', {}, el('i', { class: 'm-you' }), 'You'), el('span', {}, el('i', { class: 'm-them' }), otherLabel)) : null,
    METER_INFO.map((m) => el('div', { class: 'm-row' },
      el('span', { class: 'm-label' }, m.label),
      el('div', { class: 'm-bars' },
        el('div', { class: 'm-bar' }, el('i', { style: `width:${a[m.key] * 10}%` })),
        b ? el('div', { class: 'm-bar them' }, el('i', { style: `width:${b[m.key] * 10}%` })) : null),
      el('b', { class: 'm-val' }, b ? `${Math.round(a[m.key])}:${Math.round(b[m.key])}` : String(Math.round(a[m.key]))))));
}

// ---------- Ton und Musik ----------
function setToggle(b, on) {
  b.setAttribute('aria-pressed', String(on));
  fill(b, el('span', { class: 'set-label' }, ui(b.dataset.iconName || 'sound'), b.dataset.label), el('span', { class: 'switch', 'aria-hidden': 'true' }));
}
function refreshSoundButtons() {
  const on = store.getSettings().sound !== false;
  setSoundEnabled(on);
  document.querySelectorAll('.sound-toggle').forEach((b) => setToggle(b, on));
}
const musicOn = () => store.getSettings().music !== false;
function refreshMusicButtons() {
  document.querySelectorAll('.music-toggle').forEach((b) => setToggle(b, musicOn()));
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.sound-toggle')) {
    store.updateSettings({ sound: store.getSettings().sound === false });
    refreshSoundButtons();
    play('tap');
  } else if (e.target.closest('.music-toggle')) {
    store.updateSettings({ music: !musicOn() });
    refreshMusicButtons();
    if (current === 'sim' && musicOn() && !run.paused && !run.sim.done) startMusic(); else stopMusic();
  }
});

const LABELS = {
  size: { klein: 'Small', mittel: 'Medium', gross: 'Large' },
  distribution: { gleichmaessig: 'Even', flecken: 'Patches', ring: 'Ring', zentrum: 'Center', rauschen: 'Noise', poren: 'Pores', schnitt: 'Cut' },
  amount: { wenig: 'Little', normal: 'Normal', viel: 'Lots' },
  regen: { aus: 'Off', langsam: 'Slow', normal: 'Normal', schnell: 'Fast' },
};

// ---------- Navigation ----------
let current = 'home';
const onLeave = {};
const onEnter = {};

function go(id) {
  if (onLeave[current]) onLeave[current]();
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
  current = id;
  window.scrollTo(0, 0);
  const hub = ['home', 'atlas', 'awards', 'settings'].includes(id);
  $('#bottom-nav').hidden = !hub;
  document.body.classList.toggle('has-nav', hub);
  document.querySelectorAll('#bottom-nav button').forEach((b) => {
    b.classList.toggle('on', b.dataset.go === id);
    if (b.dataset.go === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (onEnter[id]) onEnter[id]();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go]');
  if (t) go(t.dataset.go);
});

// ---------- Dialoge ----------
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

function confirmDialog(title, text, yes = 'Yes') {
  return new Promise((resolve) => {
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    const done = (v) => { $('#modal').hidden = true; document.body.classList.remove('modal-open'); resolve(v); };
    fill($('#modal-buttons'),
      el('button', { class: 'btn', onclick: () => done(false) }, 'Cancel'),
      el('button', { class: 'btn primary', onclick: () => done(true) }, yes));
    $('#modal').hidden = false;
    document.body.classList.add('modal-open');
  });
}

const lockedToast = (level) => toast(`Unlocks when you win level ${level}.`);

// ---------- Welten und Karrieren ----------
// Jedes Bakterium gehört zu einer Welt. Freigeschaltete Fähigkeiten bleiben: Level früherer Welten
// (von irgendeinem Bakterium gewonnen) zählen für alle späteren Bakterien mit.
const currentWorld = () => WORLDS.find((w) => w.playable && !store.getBacteria().some((b) => b.world === w.n && nextLevel(b.career.won, LEVELS.length) > LEVELS.length)) || WORLDS[0];
const wonBefore = (world) => store.globalWon().filter((n) => worldOfLevel(n).n < world);
const limitsOf = (b) => getLimits([...b.career.won, ...wonBefore(b.world || 1)]);
const ptsOf = (b) => careerPoints(b.career.won, b.career.stars);
const takenNames = (exceptId = null) => [
  ...store.getBacteria().filter((b) => b.id !== exceptId).map((b) => b.name),
  ...LEVELS.flatMap((lv) => levelOpponents(lv).map((o) => o.name)),
];
const careerCtx = (b, returnTo = 'career') => ({
  mode: 'career', id: b.id, world: b.world || 1, budget: ptsOf(b), limits: limitsOf(b), label: 'Upgrade points', returnTo,
});
const careerNewCtx = (returnTo = 'careers') => {
  const w = currentWorld();
  return { mode: 'career', id: null, world: w.n, budget: START_POINTS, limits: getLimits(wonBefore(w.n)), label: 'Upgrade points', returnTo };
};
const starsText = (mask) => '★'.repeat(starCount(mask)) + '☆'.repeat(3 - starCount(mask));
const levelLabel = (b) => {
  const n = nextLevel(b.career.won, LEVELS.length);
  return n > LEVELS.length ? 'All levels won' : `Level ${n} of ${LEVELS_PER_WORLD}`;
};
const lastCareer = () => {
  const list = store.getBacteria();
  return list.find((x) => x.id === store.getSettings().lastCareer) || list[0] || null;
};

// ---------- Startbildschirm mit Demo-Platte ----------
const demo = { sim: null, r: null, raf: 0, last: 0, acc: 0 };

function startDemo() {
  const rng = makeRng(randomSeed());
  const colors = [PALETTE[0], PALETTE[2], PALETTE[7]];
  const genomes = colors.map((color) => ({ ...randomGenome(rng, 24), color }));
  demo.sim = new Simulation({ genomes, size: 'klein', distribution: rng.pick(DISTRIBUTIONS), amount: 'normal', regen: 'normal', seed: randomSeed() });
  demo.r = new PlateRenderer($('#hero-plate'), demo.sim);
  demo.r.draw();
}

function demoFrame(t) {
  demo.raf = requestAnimationFrame(demoFrame);
  const dt = Math.min(0.1, (t - (demo.last || t)) / 1000);
  demo.last = t;
  demo.acc += dt * 20;
  while (demo.acc >= 1) {
    demo.acc--;
    demo.sim.step1();
    if (demo.sim.done || demo.sim.tick > 900) startDemo();
  }
  demo.r.draw();
}

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

onEnter.home = () => {
  renderHome();
  if (!demo.sim) startDemo();
  demo.last = 0;
  cancelAnimationFrame(demo.raf);
  if (reducedMotion()) { for (let k = 0; k < 300; k++) demo.sim.step1(); demo.r.draw(); return; }
  demo.raf = requestAnimationFrame(demoFrame);
};
onLeave.home = () => cancelAnimationFrame(demo.raf);

function renderHome() {
  const b = lastCareer();
  const world = b ? WORLDS.find((w) => w.n === (b.world || 1)) : currentWorld();
  // nächstes Level: eine Karte mit Gegner, Beobachtung und dem einen grünen Knopf
  if (!b) {
    fill($('#home-next'), el('section', { class: 'card next-card' },
      el('div', { class: 'meta' }, el('span', {}, `World ${world.n} · ${world.name}`), el('span', { class: 'mono' }, `Level 1 / ${LEVELS_PER_WORLD}`)),
      el('h2', {}, 'Create your bacterium'),
      el('p', { class: 'sub' }, 'Design it, give it a name, then start your career on the skin.'),
      el('button', { class: 'btn primary big', onclick: () => openEditor(null, careerNewCtx('home')) }, ui('plus'), 'New bacterium')));
  } else {
    const n = nextLevel(b.career.won, LEVELS.length);
    const done = n > LEVELS.length;
    if (done) {
      fill($('#home-next'), el('section', { class: 'card next-card' },
        el('div', { class: 'meta' }, el('span', {}, `World ${world.n} · ${world.name}`), el('span', { class: 'mono' }, `${b.career.won.length} / ${LEVELS_PER_WORLD}`)),
        el('h2', {}, 'Every level so far is won'),
        el('p', { class: 'sub' }, `More ${world.name.toLowerCase()} levels are on the way. Collect missing stars in the meantime.`),
        el('button', { class: 'btn primary big', onclick: () => { careerId = b.id; go('career'); } }, ui('awards'), 'Open career')));
    } else {
      const lv = LEVELS[n - 1];
      const [boss, ...others] = levelOpponents(lv);
      fill($('#home-next'), el('section', { class: 'card next-card', 'aria-label': 'Next level' },
        el('div', { class: 'meta' }, el('span', {}, `World ${world.n} · ${world.name}`), el('span', { class: 'mono' }, `Level ${n} / ${LEVELS_PER_WORLD}`)),
        el('div', {}, el('h2', {}, lv.name),
          el('p', { class: 'sub' }, 'Boss: ', el('i', {}, boss.name), others.length ? ` + ${others.length} more` : '')),
        el('div', { class: 'tip' }, ui('bulb'), el('span', {}, counterTips(boss, 1)[0])),
        el('button', { class: 'btn primary big', onclick: () => playNext(b, n) }, ui('play'), `Play level ${n}`)));
    }
  }
  // Fortschritt: gewonnene Level, Sterne, Atlas
  const won = b ? b.career.won.length : 0;
  const stars = b ? Object.values(b.career.stars).reduce((a, m) => a + starCount(m), 0) : 0;
  const atlasAll = atlasGerms();
  const found = new Set(store.getAtlas());
  fill($('#home-stats'),
    el('div', { class: 'stat' }, el('b', {}, String(won), el('small', {}, ` / ${LEVELS_PER_WORLD}`)), el('span', {}, 'Levels won')),
    el('div', { class: 'stat' }, el('b', { class: 'star' }, `★ ${stars}`, el('small', {}, ` / ${LEVELS_PER_WORLD * 3}`)), el('span', {}, 'Stars')),
    el('div', { class: 'stat' }, el('b', {}, String(atlasAll.filter((g) => found.has(g.germ)).length), el('small', {}, ` / ${atlasAll.length}`)), el('span', {}, 'Germs found')));
  // dein Bakterium
  if (b) {
    const pts = ptsOf(b), free = pts - cost(b);
    fill($('#home-bact'), el('section', { class: 'card', 'aria-label': 'Your bacterium' },
      el('div', { class: 'bact-head' }, culture(b.color), el('span', { class: 'name' }, b.name),
        el('button', { class: 'btn link', onclick: () => openEditor(b, careerCtx(b, 'home')) }, 'Edit')),
      meterBars(normalize(b)),
      el('p', { class: `small ${free > 0 ? 'free-pts' : 'muted'}` }, free > 0 ? `${free} upgrade ${free === 1 ? 'point' : 'points'} left to spend` : `${cost(b)} / ${pts} upgrade points used`)));
  } else fill($('#home-bact'));
  const freeOpen = store.globalWon().includes(3);
  $('#home-free').classList.toggle('locked', !freeOpen);
  $('#home-free-sub').textContent = freeOpen ? 'Any budget, random foes' : 'Unlocks after level 3';
}

function playNext(b, n) {
  careerId = b.id;
  const probs = problems(b, limitsOf(b), ptsOf(b));
  if (probs.length) return openLevel(n);
  const lv = LEVELS[n - 1];
  store.updateSettings({ lastCareer: b.id });
  startMatch({ mode: 'level', level: n, careerId: b.id, player: b, opponents: levelOpponents(lv), ...lv.plate, seed: randomSeed() });
}

$('#home-free').addEventListener('click', () => {
  if (store.globalWon().includes(3)) go('setup');
  else toast('Free play unlocks when you win level 3.');
});
$('#home-career').addEventListener('click', () => {
  if (!store.getBacteria().length) openEditor(null, careerNewCtx('home'));
  else go('careers');
});

// ---------- Karriere-Übersicht ----------
onEnter.careers = () => {
  const list = store.getBacteria();
  fill($('#career-list'), ...(list.length ? list.map((b) => {
    const free = ptsOf(b) - cost(b);
    const w = WORLDS.find((x) => x.n === (b.world || 1));
    return el('button', { class: 'career-item', onclick: () => openCareer(b.id) },
      culture(b.color),
      el('span', { class: 'main' }, el('b', {}, b.name),
        el('small', {}, `World ${w.n} · ${w.name} · ${levelLabel(b)}`),
        free > 0 ? el('small', { class: 'free-pts' }, `${free} ${free === 1 ? 'point' : 'points'} to spend`) : null),
      ui('chevron', 'sm'));
  }) : [el('div', { class: 'empty' }, 'No bacterium yet. Create your first one!')]));
};
$('#career-new').addEventListener('click', () => openEditor(null, careerNewCtx('careers')));

// ---------- Eine Karriere ----------
let careerId = null;
const curCareer = () => store.getBacterium(careerId);

function openCareer(id) {
  careerId = id;
  store.updateSettings({ lastCareer: id });
  go('career');
}

function rewardIcon(r) {
  if (r.type === 'special') return specialIcon(r.key, 'sm');
  if (r.type === 'move') return icon(pathSvg(actionsOf({ type: r.key, size: 0, dir: 'R' })), 'sm');
  return ui('plus', 'sm');
}

onEnter.career = () => {
  const b = curCareer();
  if (!b) return go('careers');
  const won = b.career.won;
  const pts = ptsOf(b);
  const free = pts - cost(b);
  const probs = problems(b, limitsOf(b), pts);
  $('#cr-title').textContent = b.name;
  fill($('#cr-card'),
    el('div', { class: 'bact-head' }, culture(b.color), el('span', { class: 'name' }, b.name), el('span', { class: 'small muted' }, levelLabel(b))),
    meterBars(normalize(b)),
    probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
    el('button', { class: `btn ${free > 0 ? 'primary' : ''}`, onclick: () => openEditor(b, careerCtx(b)) },
      ui('flask'), free > 0 ? `Go to lab · ${free} ${free === 1 ? 'point' : 'points'} free` : 'Go to lab'));

  const nxt = nextLevel(won, LEVELS.length);
  const w = WORLDS.find((x) => x.n === (b.world || 1)) || WORLDS[0];
  fill($('#cr-world'),
    el('div', { class: 'world-head' }, ui('hand', 'md'),
      el('div', { class: 'main' }, el('small', {}, `World ${w.n}`), el('b', {}, w.name), el('small', {}, w.tagline)),
      el('span', { class: 'world-count' }, `${won.length}/${LEVELS_PER_WORLD}`)));
  fill($('#cr-next-worlds'),
    el('h3', {}, 'Coming next'),
    el('p', { class: 'small muted' }, 'Each world gets a new bacterium. Everything you unlock stays unlocked.'),
    el('div', { class: 'world-strip' }, WORLDS.filter((x) => x.n !== w.n).map((x) => el('button', {
      class: 'world-chip', onclick: () => toast(`${x.name}: ${x.tagline}. Coming soon!`),
    }, ui('lock', 'sm'), x.name))),
    el('p', { class: 'small muted' }, 'Later: ', EXPANSIONS.map((x) => x.name).join(' · ')));
  fill($('#cr-levels'), ...LEVELS.map((lv, i) => {
    const n = i + 1;
    const isWon = won.includes(n);
    const open = isWon || n === nxt;
    const boss = lv.boss;
    return el('button', {
      class: `level-tile ${isWon ? 'won' : ''} ${n === nxt ? 'next' : ''} ${open ? '' : 'locked'}`,
      onclick: () => (open ? openLevel(n) : toast(`Win level ${n - 1} first.`)),
      'aria-label': `Level ${n}: ${lv.name}${isWon ? `, ${starCount(b.career.stars[n] || 0)} of 3 stars` : open ? '' : ', locked'}`,
    },
    el('span', { class: 'lt-top' }, el('span', { class: 'lt-num' }, String(n)), open ? null : ui('lock', 'sm')),
    germPic(boss.germ, open ? boss.color : '#3a4434', 'lt-pic'),
    el('span', { class: 'lt-name' }, lv.name),
    isWon ? el('span', { class: 'lt-stars', style: 'color:var(--warning)' }, starsText(b.career.stars[n] || 0))
      : el('span', { class: 'lt-rewards' }, rewardsOf(n).map((r) => rewardIcon(r))));
  }),
  el('div', { class: 'level-tile soon' }, el('span', { class: 'lt-num' }, `${LEVELS.length + 1}–${LEVELS_PER_WORLD}`), el('span', { class: 'lt-name' }, 'More skin levels coming soon')));
};

$('#cr-delete').addEventListener('click', async () => {
  const b = curCareer();
  if (b && await confirmDialog('Delete bacterium?', `“${b.name}” and its career will be deleted for good.`, 'Delete')) {
    store.deleteBacterium(b.id);
    go('careers');
  }
});

const rewardRows = (level, withPoints) => [
  withPoints ? el('div', { class: 'reward' }, el('span', { class: 'badge' }, ui('plus')), el('span', { class: 'main' }, el('b', {}, `+${POINTS_PER_WIN} upgrade point`), el('small', {}, 'for this bacterium'))) : null,
  ...rewardsOf(level).map((r) => el('div', { class: 'reward' }, el('span', { class: 'badge' }, rewardIcon(r)), el('span', { class: 'main' }, el('b', {}, r.text), el('small', {}, 'stays unlocked in every world')))),
].filter(Boolean);

// ---------- Leveldetails ----------
let openLevelNo = 1;

const moveTag = (g) => el('span', { class: 'tag' }, icon(pathSvg(g.program), 'sm'), describeMove(moveFromProgram(g.program)));
const specialTag = (key) => el('span', { class: 'tag' }, specialIcon(key, 'sm'), SPECIALS[key].name);

function foeRow(o) {
  return el('div', { class: 'foe' },
    germPic(o.germ, o.color, o.boss ? 'foe-pic big' : 'foe-pic'),
    el('div', { class: 'foe-main' },
      el('b', { class: 'foe-name' }, o.name),
      el('div', { class: 'foe-tags' }, o.boss ? el('span', { class: 'tag' }, 'Boss') : null, ...specialsOf(o).map(specialTag), moveTag(o))));
}

function openLevel(n) {
  openLevelNo = n;
  go('level-detail');
}

onEnter['level-detail'] = () => {
  const b = curCareer();
  if (!b) return go('careers');
  const n = openLevelNo;
  const lv = LEVELS[n - 1];
  const [boss, ...others] = levelOpponents(lv);
  const won = b.career.won;
  const pl = lv.plate;
  $('#ld-title').textContent = `Level ${n}`;
  fill($('#ld-intro'),
    el('h1', {}, lv.name),
    el('p', { class: 'sub' }, lv.desc),
    el('div', { class: 'plate-chips' },
      el('span', { class: 'pchip' }, ui('dish', 'sm'), `${LABELS.size[pl.size]} plate`),
      el('span', { class: 'pchip' }, ui('food', 'sm'), `${LABELS.distribution[pl.distribution]} food`),
      el('span', { class: 'pchip' }, ui('restart', 'sm'), `${LABELS.regen[pl.regen]} regrowth`)));
  fill($('#ld-foes'),
    foeRow(boss), ...others.map(foeRow),
    el('div', { class: 'tip' }, ui('bulb'), el('span', {}, counterTips(boss, 1)[0])));
  const mask = b.career.stars[n] || 0;
  fill($('#ld-goals'),
    el('div', { class: 'goal-stars' }, STAR_GOALS.map((g) => el('div', { class: `goal ${mask & g.bit ? 'done' : ''}`, title: g.text },
      el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), el('span', {}, starLabel(g))))),
    won.includes(n) ? null : el('div', { class: 'reward-line' }, 'First win:',
      el('span', { class: 'plus' }, `+${POINTS_PER_WIN} point`),
      ...rewardsOf(n).map((r) => el('span', { class: 'rw' }, rewardIcon(r), r.short || r.text))));

  const pts = ptsOf(b);
  const free = pts - cost(b);
  const probs = problems(b, limitsOf(b), pts);
  fill($('#ld-me'),
    el('div', { class: 'bact-head' }, culture(b.color), el('span', { class: 'name' }, b.name),
      el('button', { class: 'btn small', onclick: () => openEditor(b, careerCtx(b, 'level-detail')) }, ui('flask', 'sm'), 'Lab')),
    probs.length ? el('p', { class: 'small warn' }, probs.join(' · '), ' – fix it in the lab.')
      : el('p', { class: `small ${free > 0 ? 'free-pts' : 'muted'}` }, free > 0 ? `${free} upgrade ${free === 1 ? 'point' : 'points'} left to spend` : `Ready · ${cost(b)} / ${pts} points used`));
  $('#ld-start').disabled = probs.length > 0;
  const coach = $('#ld-coach');
  coach.hidden = n !== 1 || won.includes(1);
  coach.textContent = 'Tap Start and watch – your bacterium plays on its own. Use 5× or 10× to fast-forward.';
};
const starLabel = (g) => ({ 1: 'Win', 2: 'Under 12 h', 4: '25 % plate' }[g.bit]);

$('#ld-start').addEventListener('click', () => {
  const b = curCareer();
  if (!b) return;
  const lv = LEVELS[openLevelNo - 1];
  store.updateSettings({ lastCareer: b.id });
  startMatch({ mode: 'level', level: openLevelNo, careerId: b.id, player: b, opponents: levelOpponents(lv), ...lv.plate, seed: randomSeed() });
});

// ---------- Editor ----------
let ed = null;
let edCtx = null;
const animator = new GrowthAnimator($('#ed-preview'));

function openEditor(b, ctx) {
  edCtx = ctx;
  ed = b ? normalize(JSON.parse(JSON.stringify(b))) : defaultGenome();
  if (b && b.id) ed.id = b.id;
  if (!b) {
    const used = new Set(store.getBacteria().map((x) => x.color));
    ed.color = PALETTE.find((c) => !used.has(c)) || PALETTE[0];
  }
  ed.move = moveFromProgram(ed.program) || ed.move || null;
  if (!ed.move) { ed.move = { type: 'gerade', size: 0, dir: 'R' }; ed.program = ['F']; }
  $('#ed-title').textContent = ctx.mode === 'free' ? 'Free play' : b ? 'Lab' : 'New bacterium';
  const w = WORLDS.find((x) => x.n === ctx.world);
  $('#ed-world').textContent = ctx.mode === 'free' ? '' : `${w ? w.name : 'Skin'} strain`;
  colony.sim = null;
  const coach = $('#ed-coach');
  coach.hidden = !!b || ctx.mode !== 'career';
  coach.textContent = 'Your first bacterium: name and colour, a movement, spend points under Traits, then save.';
  showTab(b ? 'traits' : 'move');
  go('editor');
  renderEditor();
  renderMove();
}

onEnter.editor = () => { animator.start(); colony.start(); };
onLeave.editor = () => { animator.stop(); colony.stop(); };

// Lässt das Bakterium allein auf einer kleinen Platte wachsen, damit man die Ausbreitung sieht.
const colony = {
  sim: null, r: null, raf: 0, hold: 0, timer: 0, changed: false,
  build() {
    clearTimeout(this.timer);
    const g = normalize({ ...ed, name: ed.name || 'Bacterium' });
    this.sim = new Simulation({ genomes: [g], size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal', seed: 4242 });
    this.r = new PlateRenderer($('#ed-colony'), this.sim);
    this.hold = 0;
    this.r.draw();
    if (this.changed) {
      const c = $('#ed-colony');
      c.classList.remove('fresh'); void c.offsetWidth; c.classList.add('fresh');
      this.changed = false;
    }
  },
  restart() {
    this.changed = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.build(), 150);
  },
  start() {
    cancelAnimationFrame(this.raf);
    if (!this.sim) this.build();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const sim = this.sim;
      if (!sim) return;
      if (sim.tick < 420 && !sim.done) {
        sim.step1(); sim.step1();
        this.r.draw();
        $('#ed-colony-label').textContent = `Preview · ${Math.round((BREW_HOURS * sim.tick) / MAX_TICKS)} h`;
      } else if (++this.hold > 90) this.build();
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); clearTimeout(this.timer); },
};

function lockReason(res) {
  const l = res.locked;
  if (l.kind === 'step') return unlockLevelOf('step', l.key);
  if (l.kind === 'repeat') return unlockLevelOf('repeat');
  return unlockLevelOf('program', l.key);
}

function setMove(move) {
  const res = compile(move, edCtx.limits);
  if (!res.program) return lockedToast(lockReason(res));
  ed.move = move;
  ed.program = res.program;
  renderMove();
  renderBudget();
  colony.restart();
}

// Bewegung: alle Arten als Kacheln (gesperrte mit Freischalt-Level), darunter die Mustergröße.
// Die Drehrichtung spielt auf der runden Platte keine Rolle mehr und ist fest „rechts herum“.
function renderMove() {
  const lim = edCtx.limits;
  const cur = ed.move;
  fill($('#ed-moves'), ...MOVES.map((m) => {
    const sizes = m.sizes ? m.sizes.length : 1;
    let firstOk = -1;
    for (let k = 0; k < sizes; k++) if (compile({ type: m.key, size: k, dir: 'R' }, lim).program) { firstOk = k; break; }
    const locked = firstOk < 0;
    const res = compile({ type: m.key, size: 0, dir: 'R' }, lim);
    const on = cur.type === m.key;
    return el('button', {
      class: `move-card ${on ? 'on' : ''} ${locked ? 'locked' : ''}`, role: 'radio', 'aria-checked': String(on),
      onclick: () => { if (locked) lockedToast(lockReason(res)); else if (!on) setMove({ type: m.key, size: firstOk, dir: 'R' }); },
    },
    icon(pathSvg(actionsOf({ type: m.key, size: Math.max(0, firstOk), dir: 'R' })), 'move-pic'),
    el('span', { class: 'move-name' }, m.name),
    el('span', { class: 'move-sub' }, locked ? `Level ${lockReason(res)}` : on ? 'Selected' : ''));
  }));
  const m = MOVE_BY_KEY[cur.type];
  const sizeRow = $('#ed-move-opts');
  sizeRow.parentElement.hidden = !m.sizes;
  if (m.sizes) {
    fill(sizeRow, el('div', { class: 'seg inline', role: 'radiogroup', 'aria-label': 'Pattern size' }, m.sizes.map((label, k) => {
      const r = compile({ ...cur, size: k, dir: 'R' }, lim);
      return el('button', {
        class: `${cur.size === k ? 'on' : ''} ${r.program ? '' : 'locked'}`, role: 'radio', 'aria-checked': String(cur.size === k),
        onclick: () => setMove({ ...cur, size: k, dir: 'R' }),
      }, label);
    })));
  }
  renderEnergy(energyProfile(normalize(ed)));
  animator.setProgram(ed.program, ed.color);
}

// Wirkung einer Stufe in Zahlen – direkt aus den Spielwerten der Simulation
const pct = (x) => `${Math.round(x * 100)} %`;
function beatChance(a, d) {
  // Kampf: Angriff + Zufall(0..3) gegen Abwehr + Energiebonus (~1) + Zufall(0..3)
  let w = 0;
  for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) if (a + (3 * (i + 0.5)) / 40 > d + 1 + (3 * (j + 0.5)) / 40) w++;
  return w / 1600;
}
function traitEffect(key, v) {
  const ph = phenotype({ ...defaultGenome(), [key]: v });
  switch (key) {
    case 'speed': return `Moves on ${pct(ph.moveChance)} of turns`;
    case 'lifespan': return `A cell lives up to ${fmtDuration(ph.maxAge)} of incubation`;
    case 'efficiency': return `Gets ${pct(ph.efficiency)} of the energy in its food`;
    case 'chemotaxis': return v ? `Heads for food on ${(ph.chemoChance * 100).toFixed(1).replace('.0', '')} % of moves` : 'Cannot smell food';
    case 'attack': return `Beats a defense-0 cell in ${pct(beatChance(ph.attack, 0))} of fights`;
    case 'defense': return `Survives ${pct(1 - beatChance(1, ph.defense))} of attacks by an attack-2 cell`;
    default: return '';
  }
}

const DIVIDE_AT = [26, 38, 52, 66, 80];
const UPTAKE = [2, 2.8, 3.6, 4.4, 5.2];
const BASAL = [0.22, 0.32, 0.43, 0.55, 0.68];
function freeVisual(t, v) {
  if (t.key === 'division') {
    const n = [6, 5, 4, 3, 2][v], size = [10, 14, 18, 24, 32][v];
    return [el('div', { class: 'free-vis', 'aria-hidden': 'true', style: `gap:${12 - v * 2}px` },
      Array.from({ length: n }, (_, i) => el('span', { class: 'cell', style: `width:${size}px;height:${size}px;opacity:${1 - i * 0.06}` }))),
    el('p', { class: 'small' }, 'Divides at ', el('b', { class: 'mono' }, String(DIVIDE_AT[v])), ' energy · each daughter starts with ', el('b', { class: 'mono' }, String(Math.round((DIVIDE_AT[v] - 2) / 2))))];
  }
  return [el('div', { class: 'free-vis bars', 'aria-hidden': 'true' },
    el('div', { class: 'vbar' }, el('span', {}, 'Eats'), el('div', {}, el('i', { style: `width:${(UPTAKE[v] / 5.2) * 100}%;background:var(--success)` }))),
    el('div', { class: 'vbar' }, el('span', {}, 'Burns'), el('div', {}, el('i', { style: `width:${(BASAL[v] / 0.68) * 100}%;background:var(--warning)` })))),
  el('p', { class: 'small' }, 'Eats up to ', el('b', { class: 'mono' }, UPTAKE[v].toFixed(1)), ' food per step · burns ', el('b', { class: 'mono' }, BASAL[v].toFixed(2)), ' just staying alive')];
}
const freeName = (t, v) => t.options[v][0].toUpperCase() + t.options[v].slice(1);
function freeCard(t) {
  const v = ed[t.key];
  const ends = t.key === 'division' ? ['Many small cells', 'Few strong cells'] : ['Frugal', 'Greedy'];
  const name = el('span', {}, freeName(t, v));
  const [vis0, text0] = freeVisual(t, v);
  const vis = el('div', {}, vis0), text = el('div', {}, text0);
  const slider = el('input', { type: 'range', min: '0', max: '4', step: '1', value: String(v), 'aria-label': t.label, 'aria-valuetext': freeName(t, v) });
  // nur die Anzeige neu zeichnen – der Regler selbst bleibt erhalten, sonst bricht das Ziehen ab
  const update = () => {
    const nv = Number(slider.value);
    if (nv === ed[t.key]) return;
    ed[t.key] = nv;
    const [a, b] = freeVisual(t, nv);
    fill(vis, a); fill(text, b);
    name.textContent = freeName(t, nv);
    slider.setAttribute('aria-valuetext', freeName(t, nv));
    renderEnergy(energyProfile(normalize(ed)));
    renderBudget();
    colony.restart();
  };
  slider.addEventListener('input', update);
  slider.addEventListener('change', update);
  return el('section', { class: 'card free-card' },
    el('div', { class: 'head' }, el('b', {}, t.label), name),
    vis, slider,
    el('div', { class: 'range-labels' }, el('span', {}, ends[0]), el('span', {}, ends[1])),
    text);
}

function renderEditor() {
  const lim = edCtx.limits;
  if (document.activeElement !== $('#ed-name')) $('#ed-name').value = ed.name;
  fill($('#ed-colors'), ...PALETTE.map((c) => el('button', {
    class: `swatch ${ed.color === c ? 'on' : ''}`, style: `background:${c}`, role: 'radio', 'aria-checked': String(ed.color === c),
    'aria-label': `Colour ${symbolOf(c)}`,
    onclick: () => { ed.color = c; renderEditor(); animator.setProgram(ed.program, ed.color); },
  }, symbolOf(c))));

  fill($('#ed-free'), ...FREE.map(freeCard));
  renderEnergy(energyProfile(normalize(ed)));

  const budget = edCtx.budget;
  const left = budget - cost(ed);
  fill($('#ed-costed'), ...COSTED.map((t) => {
    const v = ed[t.key];
    const canInc = v < t.max && left > 0;
    return el('div', { class: 'trait' },
      el('div', { class: 'trait-head' }, icon(TRAIT_ICONS[t.key]), el('b', {}, t.label),
        el('button', { class: 'step-btn', disabled: v <= 0, 'aria-label': `Lower ${t.label}`, onclick: () => { if (ed[t.key] > 0) { ed[t.key]--; renderEditor(); } } }, '−'),
        el('span', { class: 'trait-val', 'aria-live': 'polite' }, String(v)),
        el('button', {
          class: 'step-btn', disabled: !canInc, 'aria-label': `Raise ${t.label}`,
          onclick: () => { if (ed[t.key] < t.max && cost(ed) < budget) { ed[t.key]++; renderEditor(); } },
        }, '+')),
      el('div', { class: 'pips', 'aria-hidden': 'true' }, Array.from({ length: TRAIT_MAX }, (_, k) => el('i', { class: k < v ? 'on' : '' }))),
      el('span', { class: 'trait-effect' }, traitEffect(t.key, v)));
  }));

  // Spezialfähigkeiten: eigenes Symbol, Kosten nach Stärke; gesperrte zeigen, wo man sie bekommt
  const curCost = SPECIALS[ed.special].cost;
  const order = [...SPECIAL_KEYS].sort((a, b) => SPECIALS[a].cost - SPECIALS[b].cost);
  fill($('#ed-specials'), ...order.map((k) => {
    const sp = SPECIALS[k];
    const open = lim.specials.has(k);
    const on = ed.special === k;
    const lvl = unlockLevelOf('special', k);
    const lockText = lvl > LEVELS.length ? `World ${worldOfLevel(lvl).n}` : `Level ${lvl}`;
    return el('button', {
      class: `special-row ${on ? 'on' : ''} ${open ? '' : 'locked'}`, role: 'radio', 'aria-checked': String(on),
      onclick: () => {
        if (!open) return toast(`${sp.name} unlocks in ${lockText.toLowerCase()}.`);
        if (sp.cost - curCost > left) return toast(`${sp.name} costs ${sp.cost} points – take points away elsewhere first.`);
        ed.special = k; renderEditor();
      },
    },
    el('span', { class: 'sp-ico' }, specialIcon(k, 'md')),
    el('span', { class: 'main' }, el('b', {}, sp.name), el('small', {}, SPECIAL_SHORT[k]), open ? null : el('small', {}, ui('lock', 'xs'), ` ${lockText}`)),
    el('span', { class: 'cost' }, sp.cost ? `${sp.cost} pts` : '0'));
  }));
  renderBudget();
  colony.restart();
}

const SPECIAL_SHORT = {
  none: 'Keep all points for traits.',
  spores: 'Starving cells sleep as spores and wake when food returns.',
  capsule: 'Absorbs one deadly attack, then slowly grows back.',
  photo: 'A little energy from light, even where the food is gone.',
  biofilm: 'Cells that sit still build a tough slime mat.',
  predator: 'Eats the enemies it kills and gains a lot of energy.',
  toxin: 'A poison cloud weakens enemy neighbours.',
};

function renderBudget() {
  const budget = edCtx.budget;
  const c = cost(ed);
  fill($('#ed-cost'), String(c), el('small', {}, ` / ${budget}`));
  $('#ed-budget-label').textContent = edCtx.mode === 'free' ? 'Points (free play)' : 'Upgrade points';
  $('#ed-meter').style.width = `${Math.min(100, (c / budget) * 100)}%`;
  const over = c > budget;
  $('#ed-budget').classList.toggle('over', over);
  const left = $('#ed-left');
  left.className = `small ${over ? 'over' : c < budget ? 'left' : 'muted'}`;
  left.textContent = over ? `${c - budget} too many – take some away` : c < budget ? `${budget - c} ${budget - c === 1 ? 'point' : 'points'} left to spend` : 'All points spent';
  if (animator.div !== ed.division) { animator.div = ed.division; animator.setDivision(ed.division); }
}

// Editor-Bereiche: einer auf einmal, die Vorschau bleibt oben sichtbar
function showTab(tab) {
  document.querySelectorAll('#ed-tabs button').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
  document.querySelectorAll('#editor .pane').forEach((p) => { p.hidden = p.dataset.pane !== tab; });
}
$('#ed-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) { showTab(b.dataset.tab); play('tap'); }
});

$('#ed-name').addEventListener('input', (e) => { ed.name = e.target.value; });
$('#ed-dice').addEventListener('click', () => {
  ed.name = randomName(makeRng(randomSeed()), edCtx.mode === 'free' ? null : edCtx.world, takenNames(ed.id));
  $('#ed-name').value = ed.name;
  play('tap');
});
$('#ed-cancel').addEventListener('click', () => go(edCtx.returnTo));
$('#ed-save').addEventListener('click', () => {
  if (!ed.name.trim()) { $('#ed-name').focus(); return toast('Please give your bacterium a name.'); }
  const probs = problems(ed, edCtx.limits, edCtx.budget);
  if (probs.length) return toast(probs.join(' · '));
  if (edCtx.mode === 'free') {
    store.saveFree(ed);
    toast('Saved.');
    return go('setup');
  }
  const saved = store.saveBacterium({ ...ed, world: edCtx.world });
  toast(`“${saved.name}” saved.`);
  careerId = saved.id;
  store.updateSettings({ lastCareer: saved.id });
  go(edCtx.returnTo === 'careers' ? 'career' : edCtx.returnTo);
});

// Energiebilanz: Verbrauch (Grundumsatz + Bewegung) gegen Aufnahme bei voller Nahrung
const perHour = (x) => Math.round(x * ROUNDS_PER_HOUR);
function fmtDuration(rounds) {
  if (!Number.isFinite(rounds)) return 'unlimited';
  const min = Math.round((rounds * 60) / ROUNDS_PER_HOUR);
  return min < 60 ? `${Math.max(1, min)} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
function renderEnergy(ep) {
  const net = perHour(ep.intake - ep.cost);
  fill($('#ed-energy'),
    el('span', { class: 'echip', title: 'Energy per hour with plenty of food' }, 'Energy ', el('b', { class: net >= 0 ? '' : 'bad' }, `${net >= 0 ? '+' : ''}${net}`), ' /h'),
    el('span', { class: 'echip', title: 'With plenty of food a cell divides about this often' }, 'Divides every ', el('b', {}, fmtDuration(ep.roundsToDivide))),
    el('span', { class: 'echip', title: 'How long a cell survives without food' }, 'Lasts ', el('b', {}, fmtDuration(Math.min(ep.roundsWithoutFood, ep.maxAge))), ' without food'));
}

// ---------- Freies Spiel ----------
const freeLimits = () => getLimits(store.globalWon());
const freeCtx = () => ({ mode: 'free', world: null, budget: store.getSettings().budget, limits: freeLimits(), returnTo: 'setup' });

function segOption(label, key, values, labels) {
  const cur = store.getSettings()[key];
  const next = values[(values.indexOf(cur) + 1) % values.length];
  return el('button', {
    class: 'set-row', onclick: () => { store.updateSettings({ [key]: next }); play('tap'); onEnter.setup(); },
  }, el('span', { class: 'set-label' }, label), el('span', { class: 'set-value' }, labels[cur] ?? String(cur), ui('chevron', 'sm')));
}

function stepperOption(label, key, min, max, step) {
  const s = store.getSettings();
  const set = (v) => { store.updateSettings({ [key]: Math.max(min, Math.min(max, v)) }); onEnter.setup(); };
  return el('div', { class: 'set-row' }, el('span', { class: 'set-label' }, label),
    el('div', { class: 'stepper' },
      el('button', { class: 'step-btn', onclick: () => set(s[key] - step), 'aria-label': `Fewer ${label.toLowerCase()}`, disabled: s[key] <= min }, '−'),
      el('b', { class: 'set-num' }, String(s[key])),
      el('button', { class: 'step-btn', onclick: () => set(s[key] + step), 'aria-label': `More ${label.toLowerCase()}`, disabled: s[key] >= max }, '+')));
}

onEnter.setup = () => {
  const s = store.getSettings();
  const g = store.getFree();
  const me = $('#su-me');
  if (!g) {
    fill(me, el('h3', {}, 'Your bacterium'),
      el('p', { class: 'small muted' }, 'Free play has its own bacterium. You can spend all points right away.'),
      el('button', { class: 'btn primary', onclick: () => openEditor(null, freeCtx()) }, ui('plus'), 'Create bacterium'));
    $('#su-start').disabled = true;
  } else {
    const probs = problems(g, freeLimits(), s.budget);
    fill(me,
      el('div', { class: 'bact-head' }, culture(g.color), el('span', { class: 'name' }, g.name), el('span', { class: 'small muted mono' }, `${cost(g)} / ${s.budget}`)),
      meterBars(normalize(g)),
      probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
      el('button', { class: 'btn small', onclick: () => openEditor(g, freeCtx()) }, ui('upgrade', 'sm'), 'Edit'));
    $('#su-start').disabled = probs.length > 0;
  }
  fill($('#su-options'),
    stepperOption('Opponents', 'opponents', 1, 5, 1),
    stepperOption('Points', 'budget', MIN_BUDGET, MAX_BUDGET, 2),
    segOption('Plate size', 'size', ['klein', 'mittel', 'gross'], LABELS.size),
    segOption('Food layout', 'distribution', DISTRIBUTIONS, LABELS.distribution),
    segOption('Food amount', 'amount', ['wenig', 'normal', 'viel'], LABELS.amount),
    segOption('Regrowth', 'regen', ['aus', 'langsam', 'normal', 'schnell'], LABELS.regen));
};

function randomOpponents(n, budget, playerColor, seed) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const colors = PALETTE.filter((c) => c !== playerColor);
  const lim = freeLimits();
  const taken = [];
  return Array.from({ length: n }, (_, k) => {
    const name = randomName(rng, null, taken);
    taken.push(name);
    return { ...randomGenome(rng, budget, lim), name, color: colors[k % colors.length] };
  });
}

$('#su-start').addEventListener('click', () => {
  const g = store.getFree();
  if (!g) return;
  const s = store.getSettings();
  const seed = randomSeed();
  startMatch({
    mode: 'free', player: g,
    opponents: randomOpponents(s.opponents, s.budget, g.color, seed),
    size: s.size, distribution: s.distribution, amount: s.amount, regen: s.regen, seed,
  });
});

// ---------- Simulation ----------
const TICKS_PER_SECOND = 15;
const run = { cfg: null, sim: null, r: null, raf: 0, speed: 1, paused: false, last: 0, acc: 0, frame: 0, endTimer: 0, ev: null };

// Live-Ereignisse: eine Zeile direkt unter der Platte (nie über der Platte)
const banners = { queue: [], timer: 0 };
function banner(text, kind = '') {
  banners.queue.push({ text, kind });
  if (!banners.timer) nextBanner();
}
function nextBanner() {
  const b = $('#sim-banner');
  const item = banners.queue.shift();
  if (!item) { b.classList.remove('show'); banners.timer = 0; return; }
  b.textContent = item.text;
  b.className = `banner show ${item.kind}`;
  banners.timer = setTimeout(() => { b.classList.remove('show'); banners.timer = setTimeout(nextBanner, 250); }, 2200);
}
function resetBanners() {
  clearTimeout(banners.timer);
  banners.queue = []; banners.timer = 0;
  $('#sim-banner').className = 'banner';
}

const shortName = (g, i) => (i === 0 ? 'You' : g.name.split(' ')[0]);

function checkEvents() {
  const sim = run.sim, ev = run.ev;
  const names = run.genomes.map((g, i) => (i === 0 ? 'Your culture' : g.name.split(' ')[0]));
  if (!ev.contact && sim.contactTick >= 0) { ev.contact = true; banner('First contact'); play('contact'); }
  sim.players.forEach((p, i) => {
    if (p.count === 0 && !ev.dead.has(i)) {
      ev.dead.add(i);
      if (!sim.done || sim.players.length > 2) {
        banner(i === 0 ? 'Your culture died out' : `${names[i]} wiped out`, i === 0 ? 'bad' : 'good');
        play('extinct');
      }
    }
  });
  const alive = sim.players.filter((p) => p.count > 0).sort((a, b) => b.count - a.count);
  if (alive.length >= 2 && sim.tick > 150) {
    const lead = alive[0];
    if (ev.leader !== lead.id && lead.share - alive[1].share > 0.06 && sim.tick - ev.leaderTick > 150) {
      if (ev.leader) {
        banner(lead.id === 1 ? 'Lead change: you lead' : `Lead change: ${names[lead.id - 1]} leads`, lead.id === 1 ? 'good' : '');
        play('lead');
      }
      ev.leader = lead.id; ev.leaderTick = sim.tick;
    }
    if (!ev.slow && sim.tick >= MAX_TICKS - 250 && alive[0].share - alive[1].share < 0.12) {
      ev.slow = true; banner('Close race – slow motion'); play('alarm');
    }
  }
  if (!ev.sixH && sim.tick >= MAX_TICKS - 500) { ev.sixH = true; banner('6 hours of incubation left'); play('alarm'); }
}

function fixColors(player, opponents) {
  const used = new Set([player.color]);
  return opponents.map((o) => {
    let color = o.color;
    if (used.has(color)) color = PALETTE.find((c) => !used.has(c)) || color;
    used.add(color);
    return { ...o, color };
  });
}

function startMatch(cfg) {
  run.cfg = cfg;
  const player = normalize(cfg.player);
  const opponents = fixColors(player, cfg.opponents);
  run.genomes = [player, ...opponents];
  run.sim = new Simulation({
    genomes: run.genomes, size: cfg.size, distribution: cfg.distribution,
    amount: cfg.amount, regen: cfg.regen, seed: cfg.seed,
  });
  const theme = cfg.mode === 'level' ? worldOfLevel(cfg.level).theme : null;
  run.r = new PlateRenderer($('#plate'), run.sim, theme);
  run.paused = false;
  run.acc = 0;
  run.last = 0;
  run.ev = { contact: false, dead: new Set(), leader: 0, leaderTick: -999, slow: false, sixH: false, peakPlate: 0 };
  resetBanners();
  clearTimeout(run.endTimer);
  if (cfg.mode === 'level') {
    $('#sim-title').textContent = LEVELS[cfg.level - 1].name;
    $('#sim-sub').textContent = `World ${worldOfLevel(cfg.level).n} · Level ${cfg.level}`;
  } else {
    $('#sim-title').textContent = 'Free play';
    $('#sim-sub').textContent = `${run.genomes.length - 1} ${run.genomes.length === 2 ? 'opponent' : 'opponents'}`;
  }
  fill($('#sim-shares'), ...run.genomes.map((g) => el('div', { style: `background:${g.color}` })));
  fill($('#sim-legend'), ...run.genomes.map((g, i) => el('div', { class: 'legend-row', title: g.name },
    culture(g.color, 'sm'),
    el('span', { class: 'legend-name' }, shortName(g, i)),
    ...specialsOf(g).map((k) => specialIcon(k, 'xs')),
    el('span', { class: 'n' }, '0 %'))));
  $('#sim-goals').hidden = cfg.mode !== 'level';
  setSpeed(run.speed);
  go('sim');
  updateSimUi();
  run.r.draw();
  cancelAnimationFrame(run.raf);
  run.raf = requestAnimationFrame(simFrame);
  if (musicOn()) startMusic();
}

function setSpeed(v) {
  run.speed = v;
  document.querySelectorAll('#sim-speed button').forEach((b) => { const on = Number(b.dataset.speed) === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
}

const fmtHours = (h) => {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} h`;
};

function updateSimUi() {
  const sim = run.sim;
  const total = sim.players.reduce((s, p) => s + p.count, 0) || 1;
  const bars = $('#sim-shares').children;
  const rows = $('#sim-legend').children;
  sim.players.forEach((p, i) => {
    const pc = (p.count / total) * 100;
    bars[i].style.width = `${pc}%`;
    rows[i].querySelector('.n').textContent = `${Math.round(pc)} %`;
    rows[i].classList.toggle('dead', p.count === 0);
  });
  const frac = Math.min(1, sim.tick / MAX_TICKS);
  $('#clock-bar').style.width = `${frac * 100}%`;
  $('#clock-left').textContent = fmtHours(BREW_HOURS * (1 - frac));
  $('#clock-left').classList.toggle('urgent', frac > 0.85);
  // Sterne live: Sieg offen, „unter 12 h“ verfällt, „25 % Platte“ leuchtet auf
  if (run.cfg.mode === 'level') {
    const me = sim.players[0];
    const fastLost = sim.tick > 1000;
    const big = me.peakPlate >= 0.25;
    const won = sim.done && sim.winner === 1;
    fill($('#sim-goals'),
      el('div', { class: `goal-chip ${won ? 'done' : sim.done ? 'lost' : ''}` }, el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), 'Win'),
      el('div', { class: `goal-chip ${won && !fastLost ? 'done' : fastLost ? 'lost' : ''}` }, el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), 'Under 12 h'),
      el('div', { class: `goal-chip ${big ? 'done' : ''}` }, el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), '25 % plate'));
  }
  if (run.ev) checkEvents();
}

function simFrame(t) {
  run.raf = requestAnimationFrame(simFrame);
  const dt = Math.min(0.1, (t - (run.last || t)) / 1000);
  run.last = t;
  const sim = run.sim;
  if (!run.paused && !sim.done) {
    run.acc += dt * TICKS_PER_SECOND * (run.ev && run.ev.slow ? Math.min(run.speed, 1) : run.speed);
    let n = 0;
    while (run.acc >= 1 && n < 40 && !sim.done) { sim.step1(); run.acc--; n++; }
    if (n >= 40) run.acc = 0;
    run.r.draw();
    if (++run.frame % 4 === 0 || sim.done) updateSimUi();
    if (sim.done) {
      updateSimUi();
      run.endTimer = setTimeout(showResult, 1200);
    }
  }
}

$('#sim-speed').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-speed]');
  if (b) setSpeed(Number(b.dataset.speed));
});

function openPause() {
  if (current !== 'sim' || run.sim.done) return;
  run.paused = true;
  stopMusic();
  const sim = run.sim;
  const total = sim.players.reduce((s, p) => s + p.count, 0) || 1;
  const lead = [...sim.players].sort((a, b) => b.count - a.count)[0];
  const share = Math.round((sim.players[0].count / total) * 100);
  $('#pm-sub').textContent = `${fmtHours((BREW_HOURS * sim.tick) / MAX_TICKS)} in · ${lead.id === 1 ? `you lead with ${share} %` : `you have ${share} % of all cells`}`;
  $('#pm-restart').hidden = run.cfg.mode !== 'level' && run.cfg.mode !== 'free';
  $('#pause-modal').hidden = false;
  document.body.classList.add('modal-open');
}
function closePause(resume = true) {
  $('#pause-modal').hidden = true;
  document.body.classList.remove('modal-open');
  if (resume) { run.paused = false; run.last = 0; if (musicOn()) startMusic(); }
}
$('#sim-pause').addEventListener('click', openPause);
$('#pm-resume').addEventListener('click', () => closePause(true));
$('#pm-restart').addEventListener('click', () => { closePause(false); startMatch({ ...run.cfg, seed: randomSeed() }); });
$('#pm-quit').addEventListener('click', () => {
  closePause(false);
  clearTimeout(run.endTimer);
  go(run.cfg.mode === 'level' ? 'level-detail' : 'setup');
});
onLeave.sim = () => { cancelAnimationFrame(run.raf); stopMusic(); };
document.addEventListener('visibilitychange', () => {
  run.last = 0; demo.last = 0;
  if (document.hidden) openPause();
});

$('#set-reset').addEventListener('click', async () => {
  if (!await confirmDialog('Reset all progress?', 'All bacteria, stars, atlas entries and achievements will be deleted. This cannot be undone.', 'Delete everything')) return;
  localStorage.removeItem('agava.v2');
  location.reload();
});

// ---------- Ergebnis: das Wichtige oben, alle Details darunter auf einer Seite ----------
function showResult() {
  if (current !== 'sim') return;
  const { sim, cfg } = run;
  const won = sim.winner === 1;
  const title = $('#rs-title');
  title.textContent = won ? 'Victory' : sim.winner === 0 ? 'Draw' : 'Defeat';
  title.className = won ? 'win' : sim.winner === 0 ? '' : 'lose';
  const winnerName = sim.winner ? run.genomes[sim.winner - 1].name : null;
  const h = (BREW_HOURS * sim.tick) / MAX_TICKS;
  $('#rs-reason').textContent = `${sim.endReason}${winnerName && !won ? ` Winner: ${winnerName}.` : ''} After ${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min.`;
  $('#rs-where').textContent = cfg.mode === 'level' ? `Level ${cfg.level} · ${LEVELS[cfg.level - 1].name}` : 'Free play';

  const firstWin = cfg.mode === 'level' && won && store.markWon(cfg.careerId, cfg.level);
  const mask = cfg.mode === 'level' ? starMask(sim) : 0;
  const newStars = cfg.mode === 'level' ? store.addStars(cfg.careerId, cfg.level, mask) : 0;
  const newGerms = cfg.mode === 'level' && won ? store.discover(levelOpponents(LEVELS[cfg.level - 1]).map((o) => o.germ)) : [];
  const ctx = {
    sim, mode: cfg.mode, level: cfg.level, mask, genome: run.genomes[0], opponents: cfg.opponents.length,
    globalLimits: getLimits(store.globalWon()), atlasCount: store.getAtlas().length, atlasTotal: atlasGerms().length,
  };
  const newAch = ACHIEVEMENTS.filter((a) => a.check(ctx) && store.grantAchievement(a.key));

  go('result');
  const avg = sim.players.map((_, i) => sim.history.reduce((a, row) => a + (row[i] / (row.reduce((x, y) => x + y, 0) || 1)), 0) / (sim.history.length || 1));
  const total = avg.reduce((a, b) => a + b, 0) || 1;
  fill($('#rs-shares'), ...sim.players.map((p, i) => el('div', { style: `background:${run.genomes[i].color};width:${(avg[i] / total) * 100}%` })));
  fill($('#rs-legend'), ...sim.players.map((p, i) => el('span', { class: 'legend-row' },
    culture(run.genomes[i].color, 'sm'), el('span', {}, shortName(run.genomes[i], i)), el('span', { class: 'n' }, `${Math.round((avg[i] / total) * 100)} %`))));

  // Sterne
  const sb = $('#rs-stars');
  sb.hidden = cfg.mode !== 'level';
  if (cfg.mode === 'level') {
    const all = store.getBacterium(cfg.careerId)?.career.stars[cfg.level] || mask;
    fill(sb, ...STAR_GOALS.map((g) => {
      const got = mask & g.bit, old = all & g.bit;
      return el('div', { class: 'star-col', title: g.text },
        el('span', { class: `big-star ${got ? 'got' : old ? 'old' : ''} ${newStars & g.bit ? 'new' : ''}`, 'aria-hidden': 'true' }, '★'),
        el('small', {}, starLabel(g)),
        el('span', { class: 'state' }, got ? (newStars & g.bit ? 'New' : 'Earned') : old ? 'Earned before' : 'Missed'));
    }));
    if (newStars && (all & 7) === 7) toast('All three stars! +1 upgrade point');
  }
  // Belohnungen
  const rw = $('#rs-rewards');
  const rewardKids = [
    ...(firstWin ? rewardRows(cfg.level, true) : []),
    ...newAch.map((a) => el('div', { class: 'reward' }, el('span', { class: 'badge' }, icon(ACH_ICONS[a.key])), el('span', { class: 'main' }, el('b', {}, a.name), el('small', {}, a.desc)))),
    newGerms.length ? el('div', { class: 'reward' }, el('span', { class: 'badge' }, ui('atlas')), el('span', { class: 'main' }, el('b', {}, 'New in your atlas'), el('small', {}, newGerms.map((k) => GERMS[k].name).join(', ')))) : null,
  ].filter(Boolean);
  rw.hidden = !rewardKids.length;
  fill(rw, ...rewardKids);

  // Details
  fill($('#rs-analysis'), ...analyze(sim, run.genomes, mask).map((a) =>
    el('div', { class: `insight kind-${a.kind}` }, el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', {}, a.text))));
  const rc = $('#rs-plate');
  rc.width = sim.N; rc.height = sim.N;
  rc.getContext('2d').drawImage($('#plate'), 0, 0);
  $('#rs-plate-note').textContent = `At ${fmtHours(h)} · dark agar = food eaten up`;
  drawHistory($('#rs-chart'), sim.history, run.genomes.map((g) => g.color));
  const rows = sim.players.map((p, i) => {
    const g = run.genomes[i];
    const status = sim.winner === p.id ? 'Winner' : p.count === 0 ? `† ${Math.round((BREW_HOURS * p.extinctAt) / MAX_TICKS)} h` : 'Alive';
    return el('tr', {},
      el('td', {}, culture(g.color, 'sm'), ' ', i === 0 ? el('b', {}, 'You') : g.name.split(' ')[0]),
      el('td', {}, p.count.toLocaleString('en-US')),
      el('td', {}, p.peak.toLocaleString('en-US')),
      el('td', {}, p.kills.toLocaleString('en-US')),
      el('td', { class: sim.winner === p.id ? 'win' : '' }, status));
  });
  fill($('#rs-table'), el('table', {},
    el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Culture'), el('th', { class: 'num', scope: 'col' }, 'End'), el('th', { class: 'num', scope: 'col' }, 'Max'), el('th', { class: 'num', scope: 'col' }, 'Kills'), el('th', { class: 'num', scope: 'col' }, 'Status'))),
    el('tbody', {}, rows)));

  const lvMode = cfg.mode === 'level';
  // genau ein grüner Knopf: „Nächstes Level“ nach einem Sieg, sonst „Nochmal“
  const next = lvMode && won && cfg.level < LEVELS.length;
  $('#rs-next').hidden = !next;
  $('#rs-upgrade').hidden = !lvMode;
  $('#rs-new').hidden = lvMode;
  const again = $('#rs-rematch');
  again.className = next ? 'btn' : 'btn primary';
  fill(again, ui('restart'), lvMode ? (won ? 'Again' : 'Try again') : 'Rematch');
  const stack = document.querySelector('#result .cta-stack');
  const two = $('#rs-more');
  if (next) { if (again.parentElement !== two) two.append(again); } else stack.insertBefore(again, two);
  two.classList.toggle('single', two.querySelectorAll('button:not([hidden])').length === 1);
  play(won ? 'win' : 'lose');
  if (newStars) setTimeout(() => play('star'), 700);
  if (firstWin) showWinModal(cfg.level);
}

function showWinModal(level) {
  const lv = LEVELS[level - 1];
  const germ = GERMS[lv.boss.germ];
  fill($('#win-sub'), 'You beat ', el('i', {}, germ.name), ` and cleared level ${level}.`);
  $('#win-germ').innerHTML = germSvg(germ.shape, lv.boss.color);
  $('#win-fact').textContent = germ.fact;
  fill($('#win-rewards'), ...rewardRows(level, true));
  $('#win-modal').hidden = false;
  $('#win-modal').scrollTop = 0;
  document.body.classList.add('modal-open');
  setTimeout(() => play('unlock'), 400);
}
function closeWin(e) {
  if (e && e.target.closest('.modal-box') && !e.target.closest('#win-ok')) return;
  if (e && e.type === 'touchend') e.preventDefault();
  $('#win-modal').hidden = true;
  document.body.classList.remove('modal-open');
}
$('#win-modal').addEventListener('click', closeWin);
$('#win-ok').addEventListener('touchend', closeWin);

$('#rs-back').addEventListener('click', () => go(run.cfg.mode === 'level' ? 'career' : 'setup'));
$('#rs-rematch').addEventListener('click', () => {
  const cfg = run.cfg;
  if (cfg.mode === 'level') {
    const b = store.getBacterium(cfg.careerId);
    if (!b) return go('careers');
    const probs = problems(b, limitsOf(b), ptsOf(b));
    if (probs.length) return toast(probs.join(' · '));
    startMatch({ ...cfg, player: b, seed: randomSeed() });
  } else {
    startMatch({ ...cfg, player: store.getFree() || cfg.player });
  }
});
$('#rs-new').addEventListener('click', () => {
  const cfg = run.cfg;
  const s = store.getSettings();
  const seed = randomSeed();
  const player = store.getFree() || cfg.player;
  startMatch({ ...cfg, player, seed, opponents: randomOpponents(cfg.opponents.length, s.budget, player.color, seed) });
});
$('#rs-next').addEventListener('click', () => { careerId = run.cfg.careerId; openLevel(run.cfg.level + 1); });
$('#rs-upgrade').addEventListener('click', () => {
  const b = store.getBacterium(run.cfg.careerId);
  if (b) openEditor(b, careerCtx(b, 'result'));
});

// ---------- Atlas ----------
// alle Keime der Level in der Reihenfolge ihres ersten Auftretens
function atlasGerms() {
  const seen = [];
  LEVELS.forEach((lv, i) => levelOpponents(lv).forEach((o) => { if (!seen.find((x) => x.germ === o.germ)) seen.push({ germ: o.germ, color: o.color, level: i + 1, boss: o.boss, ability: o.boss ? rewardsOf(i + 1) : [] }); }));
  return seen;
}

let atlasWorld = 1;
onEnter.atlas = () => {
  const found = new Set(store.getAtlas());
  const list = atlasGerms();
  fill($('#atlas-worlds'), ...WORLDS.map((w) => el('button', {
    class: `chip ${atlasWorld === w.n ? 'on' : ''} ${w.playable ? '' : 'locked'}`, role: 'tab', 'aria-selected': String(atlasWorld === w.n),
    onclick: () => { atlasWorld = w.n; onEnter.atlas(); },
  }, w.playable ? null : ui('lock', 'xs'), w.name)));
  const w = WORLDS.find((x) => x.n === atlasWorld);
  const germs = list.filter((g) => GERMS[g.germ].world === w.n);
  const waiting = Object.entries(GERMS).filter(([k, x]) => x.world === w.n && !list.find((g) => g.germ === k));
  const known = germs.filter((g) => found.has(g.germ)).length;
  const totalHere = w.playable ? germs.length : waiting.length;
  fill($('#atlas-progress'),
    el('div', { class: 'row between' }, el('b', {}, w.name), el('span', { class: 'mono' }, String(known), el('span', { class: 'muted' }, ` / ${totalHere}`))),
    el('div', { class: 'meter' }, el('div', { style: `width:${totalHere ? (known / totalHere) * 100 : 0}%` })),
    el('p', { class: 'small muted' }, w.playable ? w.habitat : `Coming soon · ${waiting.length} germs are waiting here.`));
  const card = (g) => {
    const isKnown = found.has(g.germ);
    const germ = GERMS[g.germ];
    return el('button', {
      class: `germ-card ${isKnown ? '' : 'unknown'}`, 'aria-label': isKnown ? germ.name : `Undiscovered germ, beat level ${g.level}`,
      onclick: () => (isKnown ? openGerm(g) : toast(`Beat level ${g.level} to discover this germ.`)),
    },
    el('span', { class: `pic ${isKnown && PHOTOS[g.germ] ? 'photo' : ''}` },
      isKnown && PHOTOS[g.germ] ? el('img', { src: PHOTOS[g.germ].src, alt: '', loading: 'lazy' }) : germPic(g.germ, isKnown ? g.color : '#3a4434')),
    el('b', {}, isKnown ? germ.name : 'Undiscovered'),
    el('small', {}, isKnown ? `Level ${g.level}${g.boss ? ' · boss' : ''}` : `Beat level ${g.level}`));
  };
  fill($('#atlas-list'), ...(w.playable ? germs.map(card) : waiting.map(([k]) => el('div', { class: 'germ-card unknown' },
    el('span', { class: 'pic' }, germPic(k, '#3a4434')), el('b', {}, 'Undiscovered'), el('small', {}, 'Coming soon')))));
};

function openGerm(g) {
  const germ = GERMS[g.germ];
  fill($('#gm-body'),
    PHOTOS[g.germ] ? el('figure', { class: 'atlas-photo' },
      el('img', { src: PHOTOS[g.germ].src, alt: germ.name, loading: 'lazy' }),
      el('figcaption', {}, `Photo: ${PHOTOS[g.germ].author} · ${PHOTOS[g.germ].license} · Wikimedia Commons`)) : el('div', { class: 'gm-pic' }, germPic(g.germ, g.color)),
    el('h2', { id: 'gm-title' }, germ.name),
    el('p', { class: 'small muted' }, `World ${germ.world} · Level ${g.level}${g.boss ? ' · boss' : ''}`),
    el('dl', { class: 'gm-facts' },
      el('dt', {}, 'Lives in'), el('dd', {}, germ.home),
      el('dt', {}, 'Unlocks'), el('dd', {}, g.ability.length ? g.ability.map((r) => r.short || r.text).join(', ') : '–')),
    el('p', { class: 'win-fact' }, germ.fact));
  $('#germ-modal').hidden = false;
  document.body.classList.add('modal-open');
}
function closeGerm(e) {
  if (e && e.target.closest('.modal-box') && !e.target.closest('#gm-close')) return;
  $('#germ-modal').hidden = true;
  document.body.classList.remove('modal-open');
}
$('#germ-modal').addEventListener('click', closeGerm);

// ---------- Auszeichnungen ----------
onEnter.awards = () => {
  const list = store.getBacteria();
  // Sterne: das Bakterium der aktuellen Welt mit den meisten Sternen
  const best = [...list].sort((a, b) => Object.values(b.career.stars).reduce((s, m) => s + starCount(m), 0) - Object.values(a.career.stars).reduce((s, m) => s + starCount(m), 0))[0];
  const starsOf = (b) => (b ? Object.values(b.career.stars).reduce((s, m) => s + starCount(m), 0) : 0);
  const got = ACHIEVEMENTS.filter((a) => store.hasAchievement(a.key)).length;
  const found = new Set(store.getAtlas());
  const atlasAll = atlasGerms();
  fill($('#aw-totals'),
    el('div', { class: 'stat' }, el('b', { class: 'star' }, String(starsOf(best)), el('small', {}, ` / ${LEVELS_PER_WORLD * 3}`)), el('span', {}, 'Stars')),
    el('div', { class: 'stat' }, el('b', {}, String(got), el('small', {}, ` / ${ACHIEVEMENTS.length}`)), el('span', {}, 'Achievements')),
    el('div', { class: 'stat' }, el('b', {}, String(atlasAll.filter((g) => found.has(g.germ)).length), el('small', {}, ` / ${atlasAll.length}`)), el('span', {}, 'Germs found')));
  fill($('#aw-stars'),
    el('div', { class: 'row between' }, el('h2', {}, 'Skin stars'), best ? el('span', { class: 'small muted' }, el('i', {}, best.name)) : null),
    el('div', { class: 'star-grid' }, Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
      const n = i + 1, m = best ? best.career.stars[n] || 0 : 0, soon = n > LEVELS.length;
      return el('div', { class: `star-cell ${soon ? 'soon' : ''}`, 'aria-label': `Level ${n}${soon ? ', coming soon' : `, ${starCount(m)} of 3 stars`}` },
        el('b', {}, String(n)),
        el('span', { 'aria-hidden': 'true' }, [1, 2, 4].map((bit) => el('i', { class: m & bit ? 'on' : '' }, '★'))));
    })),
    el('p', { class: 'small muted' }, '★ Win · ★ Under 12 h · ★ 25 % of the plate. All three in a level give +1 upgrade point.'));
  $('#ach-count').textContent = `${got} / ${ACHIEVEMENTS.length}`;
  const when = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  fill($('#ach-list'), ...ACHIEVEMENTS.map((a) => {
    const ts = store.achievementTime(a.key);
    return el('div', { class: `ach-row ${ts ? 'got' : ''}` },
      el('span', { class: 'ach-badge', 'aria-hidden': 'true' }, icon(ACH_ICONS[a.key], 'md')),
      el('span', { class: 'main' }, el('b', {}, a.name), el('small', {}, a.desc)),
      el('span', { class: 'when' }, ts ? when(ts) : 'Locked'));
  }));
  const master = store.hasAchievement('master');
  fill($('#aw-titles'),
    el('div', { class: 'reward' }, el('span', { class: 'badge' }, master ? icon(ACH_ICONS.master) : ui('lock')),
      el('span', { class: 'main' }, el('b', {}, 'Title “Wound Healer”'), el('small', {}, master ? 'Earned – you beat the chapter boss of the skin.' : 'Beat the chapter boss in level 10.'))));
};

// ---------- Start ----------
// Bakterien aus der alten Punkteskala passen evtl. nicht ins neue Budget: die stärksten Eigenschaften kürzen
function fitToBudget() {
  let changed = 0;
  for (const b of store.getBacteria()) {
    const budget = ptsOf(b);
    if (cost(b) <= budget) continue;
    const g = normalize(JSON.parse(JSON.stringify(b)));
    if (SPECIALS[g.special].cost > budget / 2) g.special = 'none';
    while (cost(g) > budget) {
      const t = [...COSTED].sort((x, y) => g[y.key] - g[x.key])[0];
      if (!g[t.key]) { g.special = 'none'; continue; }
      g[t.key]--;
    }
    store.saveBacterium({ ...g, id: b.id, world: b.world });
    changed++;
  }
  if (changed) setTimeout(() => toast('Your bacteria were adapted to the new point system.'), 600);
}
fitToBudget();
hydrateIcons();
store.discover(store.globalWon().filter((n) => LEVELS[n - 1]).flatMap((n) => levelOpponents(LEVELS[n - 1]).map((o) => o.germ)));
refreshSoundButtons();
refreshMusicButtons();
go('home');

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
