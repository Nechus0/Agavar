// Oberfläche: Bildschirme, Karriere, Editor, Spielablauf – im Agava-Design-System („Lab at night“).
import {
  COSTED, FREE, SPECIALS, SPECIAL_KEYS, PALETTE, TRAIT_MAX, SLOT2_COST, stepCost,
  defaultGenome, cost, normalize, randomGenome, specialsOf,
} from './genome.js';
import { Simulation, DISTRIBUTIONS, MAX_TICKS, energyProfile, phenotype, ROUNDS_PER_HOUR, between, FREE_TABLES, upkeepOf } from './sim.js';
import { PlateRenderer, drawHistory, GrowthAnimator } from './render.js';
import { makeRng, randomSeed } from './rng.js';
import { randomName } from './names.js';
import { LEVELS, levelOpponents, adaptation } from './levels.js';
import { GERMS, germSvg } from './germs.js';
import {
  getLimits, unlockLevelOf, rewardsOf, problems, careerPoints, nextLevel, START_POINTS, POINTS_PER_WIN,
  STAR_GOALS, starMask, starCount, challengeOf,
} from './progression.js';
import { analyze, ACHIEVEMENTS, deathBreakdown, plateReport } from './insights.js';
import { SPECIAL_ICONS, TRAIT_ICONS, UI_ICONS, ACH_ICONS, ELEMENT_ICONS } from './icons.js';
import { ELEMENTS, elementsOf } from './elements.js';
import { MUTATIONS, mutationChoices } from './mutations.js';
import { MOVES, MOVE_BY_KEY, actionsOf, compile, moveFromProgram, describeMove, pathSvg } from './movement.js';
import * as store from './storage.js';
import { meters, METER_INFO, counterTips } from './meters.js';
import { play, setSoundEnabled } from './sound.js';
import { WORLDS, EXPANSIONS, LEVELS_PER_WORLD, worldOfLevel } from './worlds.js';
import { startMusic, stopMusic, setIntensity } from './music.js';

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
const culture = (color, cls = '') => el('span', { class: `culture ${cls}`, style: `background:${color}`, 'aria-hidden': 'true' });
const COLOR_NAMES = { '#38C8FF': 'Cyan', '#FF5A6E': 'Coral', '#FF9A3D': 'Orange', '#FFD23F': 'Yellow', '#2EF2B4': 'Mint', '#6E7BFF': 'Indigo', '#C46BFF': 'Violet', '#FF6BC1': 'Pink' };
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
  } else if (e.target.closest('.music-toggle')) {
    store.updateSettings({ music: !musicOn() });
    refreshMusicButtons();
    if (musicOn()) startMusic(); else stopMusic();
  }
});

const LABELS = {
  size: { klein: 'Small', mittel: 'Medium', gross: 'Large' },
  distribution: { gleichmaessig: 'Even', flecken: 'Patches', ring: 'Ring', zentrum: 'Center', rauschen: 'Noise', poren: 'Pores', schnitt: 'Cut' },
  amount: { wenig: 'Little', normal: 'Normal', viel: 'Lots' },
  amountLong: { wenig: 'Scarce', normal: 'Normal', viel: 'Plenty' },
  regen: { aus: 'Off', langsam: 'Slow', normal: 'Normal', schnell: 'Fast' },
};

// ---------- Navigation ----------
let current = 'home';
let settingsFrom = 'home';
const onLeave = {};
const onEnter = {};

function go(id) {
  const prev = current;
  document.body.classList.toggle('sim-open', id === 'sim');
  if (onLeave[current]) onLeave[current]();
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
  current = id;
  window.scrollTo(0, 0);
  // die Leiste unten ist immer erreichbar; Unterseiten gehören zu Start bzw. Einstellungen
  const tab = { atlas: 'atlas', awards: 'awards', editor: 'lab' }[id] || 'home';
  // Einstellungen: Zahnrad oben rechts auf den Hauptseiten
  if (id === 'settings' && prev !== 'help' && prev !== 'settings') settingsFrom = prev;
  $('#settings-btn').hidden = !['home', 'atlas', 'awards'].includes(id);
  $('#bottom-nav').hidden = false;
  document.body.classList.add('has-nav');
  document.querySelectorAll('#bottom-nav button').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === tab);
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  refreshResumeBar();
  if (onEnter[id]) onEnter[id]();
}

// Wer eine laufende Runde über die Leiste verlässt, pausiert sie und kann jederzeit zurück.
function refreshResumeBar() {
  const live = typeof run !== 'undefined' && run.sim && !run.sim.done && current !== 'sim';
  $('#resume-bar').hidden = !live;
  document.body.classList.toggle('has-resume', !!live);
}
function resumeMatch() {
  go('sim');
  run.paused = false;
  run.last = 0;
  cancelAnimationFrame(run.raf);
  run.raf = requestAnimationFrame(simFrame);
  if (musicOn()) startMusic();
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
// Pro Welt gibt es genau ein Bakterium. Freigeschaltete Fähigkeiten bleiben: Level früherer Welten
// zählen für die Bakterien späterer Welten mit.
const worldBact = (n) => store.getBacteria().find((b) => (b.world || 1) === n) || null;
const currentWorld = () => WORLDS.find((w) => w.playable && !(worldBact(w.n) && nextLevel(worldBact(w.n).career.won, LEVELS.length) > LEVELS.length)) || WORLDS[0];
const wonBefore = (world) => store.globalWon().filter((n) => worldOfLevel(n).n < world);
const limitsOf = (b) => getLimits([...b.career.won, ...wonBefore(b.world || 1)]);
const ptsOf = (b) => careerPoints(b.career.won, b.career.stars);
const takenNames = (exceptId = null) => [
  ...store.getBacteria().filter((b) => b.id !== exceptId).map((b) => b.name),
  ...LEVELS.flatMap((lv) => levelOpponents(lv).map((o) => o.name)),
];
const careerCtx = (b, returnTo = 'home') => ({
  mode: 'career', id: b.id, world: b.world || 1, budget: ptsOf(b), limits: limitsOf(b), returnTo,
});
const careerNewCtx = (returnTo = 'home') => {
  const w = currentWorld();
  return { mode: 'career', id: null, world: w.n, budget: START_POINTS, limits: getLimits(wonBefore(w.n)), returnTo };
};
// das Bakterium der aktuellen Welt
const lastCareer = () => worldBact(currentWorld().n) || store.getBacteria()[0] || null;
let careerId = null;
const curCareer = () => store.getBacterium(careerId) || lastCareer();

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

// Start: das nächste Level als Karte, darunter alle Level der Welt mit ihren Sternen
function renderHome() {
  const world = currentWorld();
  const b = worldBact(world.n);
  careerId = b ? b.id : null;
  if (!b) {
    fill($('#home-next'), el('section', { class: 'card next-card' },
      el('div', { class: 'meta' }, el('span', {}, `World ${world.n} · ${world.name}`), el('span', { class: 'mono' }, `Level 1 / ${LEVELS_PER_WORLD}`)),
      el('h2', {}, 'Create your bacterium'),
      el('p', { class: 'sub' }, `One bacterium for the whole ${world.name.toLowerCase()} world. Design it, name it, then play.`),
      el('button', { class: 'btn primary big', onclick: () => openEditor(null, careerNewCtx('home')) }, ui('plus'), 'New bacterium')));
  } else {
    const n = nextLevel(b.career.won, LEVELS.length);
    if (n > LEVELS.length) {
      fill($('#home-next'), el('section', { class: 'card next-card' },
        el('div', { class: 'meta' }, el('span', {}, `World ${world.n} · ${world.name}`), el('span', { class: 'mono' }, `${b.career.won.length} / ${LEVELS_PER_WORLD}`)),
        el('h2', {}, 'Every level so far is won'),
        el('p', { class: 'sub' }, 'More levels are on the way. Collect missing stars in the meantime.')));
    } else {
      const lv = LEVELS[n - 1];
      const [boss, ...others] = levelOpponents(lv);
      fill($('#home-next'), el('section', { class: 'card next-card', 'aria-label': 'Next level' },
        el('div', { class: 'meta' }, el('span', {}, `World ${world.n} · ${world.name}`), el('span', { class: 'mono' }, `Level ${n} / ${LEVELS_PER_WORLD}`)),
        el('div', {}, el('h2', {}, lv.name),
          el('p', { class: 'sub' }, 'Boss: ', el('i', {}, boss.name), others.length ? ` + ${others.length} more` : '')),
        el('button', { class: 'btn primary big', onclick: () => playNext(b, n) }, ui('play'), `Play level ${n}`)));
    }
  }
  // alle Level der Welt: antippen öffnet das Level
  const won = b ? b.career.won : [];
  const nxt = b ? nextLevel(won, LEVELS.length) : 0;
  fill($('#home-world'),
    el('div', { class: 'row between' }, el('h2', {}, `${world.name} levels`), el('span', { class: 'small muted mono' }, `★ ${b ? Object.values(b.career.stars).reduce((a, m) => a + starCount(m), 0) : 0} / ${LEVELS_PER_WORLD * 3}`)),
    el('div', { class: 'card' }, el('div', { class: 'star-grid' }, Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
      const lvn = i + 1, m = b ? b.career.stars[lvn] || 0 : 0;
      const exists = lvn <= LEVELS.length, isWon = won.includes(lvn), open = b && exists && (isWon || lvn === nxt);
      return el('button', {
        class: `star-cell ${open ? '' : 'locked'} ${lvn === nxt ? 'next' : ''} ${exists ? '' : 'soon'}`,
        'aria-label': `Level ${lvn}${exists ? '' : ', coming soon'}${isWon ? `, ${starCount(m)} of 3 stars` : ''}`,
        onclick: () => {
          if (!b) return toast('Create your bacterium first.');
          if (!exists) return toast('More levels are coming soon.');
          if (!open) return toast(`Win level ${lvn - 1} first.`);
          openLevel(lvn);
        },
      }, el('b', {}, String(lvn)), el('span', { 'aria-hidden': 'true' }, [1, 2, 4].map((bit) => el('i', { class: m & bit ? 'on' : '' }, '★'))));
    })),
    el('p', { class: 'small muted' }, '★ Win · ★ Under 12 h · ★ the level challenge. All three in a level give +1 upgrade point.')));
}

function playNext(b, n) {
  careerId = b.id;
  const probs = problems(b, limitsOf(b), ptsOf(b));
  if (probs.length) return openLevel(n);
  const lv = LEVELS[n - 1];
  startMatch({ mode: 'level', level: n, careerId: b.id, player: b, opponents: levelOpponents(lv, normalize(b)), ...lv.plate, seed: randomSeed() });
}

// Lab in der Leiste: das Bakterium der aktuellen Welt (oder das erste anlegen)
$('#nav-lab').addEventListener('click', () => {
  if (current === 'editor') return;
  const b = worldBact(currentWorld().n);
  if (b) { careerId = b.id; openEditor(b, careerCtx(b, 'home')); } else openEditor(null, careerNewCtx('home'));
});

function rewardIcon(r) {
  if (r.type === 'special') return specialIcon(r.key, 'sm');
  if (r.type === 'move') return icon(pathSvg(actionsOf({ type: r.key, size: 0, dir: 'R' })), 'sm');
  return ui('plus', 'sm');
}

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
  if (!b) return go('home');
  const n = openLevelNo;
  const lv = LEVELS[n - 1];
  const [boss, ...others] = levelOpponents(lv, normalize(b));
  const ad = adaptation(lv, normalize(b));
  const won = b.career.won;
  const pl = lv.plate;
  $('#ld-title').textContent = `Level ${n}`;
  fill($('#ld-intro'),
    el('h1', {}, lv.name),
    el('p', { class: 'sub' }, lv.desc));
  const preview = el('canvas', { class: 'plate', role: 'img', 'aria-label': `Plate preview: ${LABELS.distribution[pl.distribution].toLowerCase()} food` });
  const els = elementsOf(pl);
  fill($('#ld-plate'),
    el('div', { class: 'plate-top' },
      el('div', { class: 'plate-ring preview-ring' }, preview),
      el('div', { class: 'plate-facts' },
        lv.note ? el('p', { class: 'lab-note' }, lv.note) : null,
        // kurze Fakten als kleine Marken; Elemente als Marken, Antippen zeigt die Erklärung
        el('div', { class: 'fact-chips' },
          el('span', { class: 'fchip' }, ui('food', 'xs'), LABELS.amountLong[pl.amount]),
          el('span', { class: 'fchip' }, ui('dish', 'xs'), LABELS.distribution[pl.distribution]),
          el('span', { class: 'fchip' }, ui('restart', 'xs'), `Regrowth ${LABELS.regen[pl.regen].toLowerCase()}`),
          ...els.map((k) => el('button', { class: 'fchip el', onclick: () => openSheet(ELEMENTS[k].name, el('div', { class: 'el-intro' }, el('span', { class: 'el-ico big' }, elIcon(k, 'lg')), el('p', {}, ELEMENTS[k].effect))) }, elIcon(k, 'xs'), ELEMENTS[k].name))))));
  drawPreview(preview, lv, n);
  showNewElements(els);
  fill($('#ld-foes'),
    foeRow(boss), ...others.map(foeRow),
    lv.adapts ? el('div', { class: 'tip adapt' }, ui('restart'), el('span', {}, ad
      ? `This strain adapts to you: against your ${SPECIALS[ad.against].name.toLowerCase()} it brings ${SPECIALS[ad.counter].name.toLowerCase()}.`
      : 'This strain adapts to your bacterium and brings a counter to your ability.')) : null);
  const mask = b.career.stars[n] || 0;
  fill($('#ld-goals'),
    el('div', { class: 'goal-stars' }, STAR_GOALS.map((g) => el('div', { class: `goal ${mask & g.bit ? 'done' : ''}`, title: g.bit === 4 ? challengeOf(lv).text : g.text },
      el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), el('span', {}, starLabel(g, lv))))),
    won.includes(n) ? null : el('div', { class: 'reward-line' }, 'First win:',
      el('span', { class: 'plus' }, `+${POINTS_PER_WIN} point`),
      ...rewardsOf(n).map((r) => el('span', { class: 'rw' }, rewardIcon(r), r.short || r.text))));

  const pts = ptsOf(b);
  const free = pts - cost(b);
  const probs = problems(b, limitsOf(b), pts);
  fill($('#ld-me'),
    el('div', { class: 'bact-head' }, culture(b.color), el('span', { class: 'name' }, b.name),
      el('button', { class: 'btn small', onclick: () => openEditor(b, careerCtx(b, 'level-detail')) }, ui('flask', 'sm'), 'Lab')),
    el('div', { class: 'glance' }, meterBars(normalize(b), boss, boss.name.split(' ')[0])),
    probs.length ? el('p', { class: 'small warn' }, probs.join(' · '), ' – fix it in the lab.')
      : el('p', { class: `small ${free > 0 ? 'free-pts' : 'muted'}` }, free > 0 ? `${free} upgrade ${free === 1 ? 'point' : 'points'} left to spend` : `Ready · ${cost(b)} / ${pts} points used`));
  $('#ld-start').disabled = probs.length > 0;
  const coach = $('#ld-coach');
  coach.hidden = n !== 1 || won.includes(1);
  coach.textContent = 'Tap Start and watch – your bacterium plays on its own. Use 5× or 10× to fast-forward.';
};
// Vorschau der Platte zu Spielbeginn: Futterverteilung, Elemente und Startpunkte
function drawPreview(canvas, lv, n) {
  const opp = levelOpponents(lv);
  const me = curCareer();
  const sim = new Simulation({ genomes: [normalize(me || opp[0]), ...fixColors(normalize(me || opp[0]), opp)], ...lv.plate, seed: 1000 + n });
  new PlateRenderer(canvas, sim, worldOfLevel(n).theme).draw();
}

const elIcon = (k, cls = 'sm') => icon(ELEMENT_ICONS[k], cls);
function elementRow(k) {
  const e = ELEMENTS[k];
  return el('div', { class: 'el-row' }, el('span', { class: 'el-ico' }, elIcon(k, 'md')), el('div', { class: 'main' }, el('b', {}, e.name), el('small', {}, e.effect)));
}

// Neues Element: einmalig ein Info-Blatt mit Bild, Name und Wirkung
function showNewElements(keys) {
  const seen = new Set(store.getSettings().seenElements || []);
  const fresh = keys.filter((k) => !seen.has(k));
  if (!fresh.length) return;
  store.updateSettings({ seenElements: [...seen, ...fresh] });
  setTimeout(() => {
    if (current !== 'level-detail') return;
    openSheet('New on the plate', ...fresh.map((k) => el('div', { class: 'el-intro' },
      el('span', { class: 'el-ico big' }, elIcon(k, 'lg')),
      el('b', {}, ELEMENTS[k].name),
      el('small', { class: 'muted' }, ELEMENTS[k].look),
      el('p', {}, ELEMENTS[k].effect))));
  }, 350);
}

const starLabel = (g, lv) => ({ 1: 'Win', 2: 'Under 12 h', 4: challengeOf(lv).short }[g.bit]);

$('#ld-start').addEventListener('click', () => {
  const b = curCareer();
  if (!b) return;
  const lv = LEVELS[openLevelNo - 1];
  store.updateSettings({ lastCareer: b.id });
  startMatch({ mode: 'level', level: openLevelNo, careerId: b.id, player: b, opponents: levelOpponents(lv, normalize(b)), ...lv.plate, seed: randomSeed() });
});

// ---------- Lab ----------
// Eine Seite wie ein Ausrüstungs-Bildschirm: Name und Farbe, Punkte mit Vorschau, dann
// Bewegung und Fähigkeiten als antippbare Plätze (Auswahl im Blatt von unten), Eigenschaften und Körper.
let ed = null;
let edCtx = null;

function openEditor(b, ctx) {
  edCtx = ctx;
  ed = b ? normalize(JSON.parse(JSON.stringify(b))) : defaultGenome();
  if (b && b.id) ed.id = b.id;
  if (!b) {
    const used = new Set(store.getBacteria().map((x) => x.color));
    ed.color = PALETTE.find((c) => !used.has(c)) || PALETTE[0];
    ed.name = randomName(makeRng(randomSeed()), ctx.world, takenNames());
  }
  ed.move = moveFromProgram(ed.program) || ed.move || null;
  if (!ed.move) { ed.move = { type: 'gerade', size: 0, dir: 'R' }; ed.program = ['F']; }
  $('#ed-title').textContent = b ? 'Lab' : 'New bacterium';
  colony.sim = null;
  const coach = $('#ed-coach');
  coach.hidden = !!b;
  coach.textContent = 'Your bacterium for this world: spend your points on traits, pick a movement, then save.';
  go('editor');
  renderEditor();
}

onEnter.editor = () => { colony.start(); };
onLeave.editor = () => { colony.stop(); closeSheet(); };

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
      if (sim.tick < 420 && !sim.done) { sim.step1(); sim.step1(); this.r.draw(); } else if (++this.hold > 90) this.build();
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); clearTimeout(this.timer); },
};

// ---- Blatt von unten (Farbe, Bewegung, Fähigkeiten) ----
let sheetAnimator = null;
function openSheet(title, ...body) {
  $('#sheet-title').textContent = title;
  fill($('#sheet-body'), ...body);
  $('#sheet').hidden = false;
  document.body.classList.add('modal-open');
}
function closeSheet() {
  if (sheetAnimator) { sheetAnimator.stop(); sheetAnimator = null; }
  $('#sheet').hidden = true;
  document.body.classList.remove('modal-open');
}
// schließen nur über „Fertig“ oder einen Tipp auf den abgedunkelten Hintergrund
$('#sheet').addEventListener('click', (e) => {
  if (e.target === $('#sheet') || e.target.closest('#sheet-close')) closeSheet();
});

// Farbe: nur die gewählte steht neben dem Namen; Antippen öffnet die Auswahl
function colorSheet() {
  openSheet('Colour', el('div', { class: 'color-grid', role: 'radiogroup', 'aria-label': 'Colour' }, PALETTE.map((c) => el('button', {
    class: `swatch ${ed.color === c ? 'on' : ''}`, style: `background:${c}`, role: 'radio', 'aria-checked': String(ed.color === c),
    'aria-label': COLOR_NAMES[c] || c,
    onclick: () => { ed.color = c; renderEditor(); closeSheet(); },
  }))));
}
$('#ed-color').addEventListener('click', colorSheet);

function lockReason(res) {
  const l = res.locked;
  if (l.kind === 'step') return unlockLevelOf('step', l.key);
  if (l.kind === 'repeat') return unlockLevelOf('repeat');
  return unlockLevelOf('program', l.key);
}

function setMove(move) {
  const res = compile(move, edCtx.limits);
  if (!res.program) { lockedToast(lockReason(res)); return false; }
  ed.move = move;
  ed.program = res.program;
  renderEditor();
  return true;
}

// Bewegung: 3×3 Kacheln, darunter die Größe und die Bahn einer Zelle (läuft live mit)
function moveSheet() {
  const lim = edCtx.limits;
  const grid = el('div', { class: 'move-grid', role: 'radiogroup', 'aria-label': 'Movement pattern' });
  const sizeRow = el('div', { class: 'size-row' });
  const desc = el('p', { class: 'small muted move-desc' });
  const canvas = el('canvas', { class: 'path-preview', 'aria-hidden': 'true' });
  const choose = (move) => { if (setMove(move)) { draw(); sheetAnimator.setProgram(ed.program, ed.color); } };
  const draw = () => {
    const cur = ed.move;
    const m = MOVE_BY_KEY[cur.type];
    fill(grid, ...MOVES.map((mv) => {
      const sizes = mv.sizes ? mv.sizes.length : 1;
      let firstOk = -1;
      for (let k = 0; k < sizes; k++) if (compile({ type: mv.key, size: k, dir: 'R' }, lim).program) { firstOk = k; break; }
      const locked = firstOk < 0;
      const res = compile({ type: mv.key, size: 0, dir: 'R' }, lim);
      const on = cur.type === mv.key;
      return el('button', {
        class: `move-card ${on ? 'on' : ''} ${locked ? 'locked' : ''}`, role: 'radio', 'aria-checked': String(on),
        onclick: () => { if (locked) lockedToast(lockReason(res)); else if (!on) choose({ type: mv.key, size: firstOk, dir: 'R' }); },
      },
      icon(pathSvg(actionsOf({ type: mv.key, size: Math.max(0, firstOk), dir: 'R' })), 'move-pic'),
      el('span', { class: 'move-name' }, mv.name),
      el('span', { class: 'move-sub' }, locked ? `Level ${lockReason(res)}` : ''));
    }));
    sizeRow.classList.toggle('off', !m.sizes);
    if (!m.sizes) fill(sizeRow, el('span', {}, 'Size'), el('span', { class: 'small muted' }, 'Fixed'));
    else fill(sizeRow, el('span', {}, 'Size'), el('div', { class: 'seg inline', role: 'radiogroup', 'aria-label': 'Pattern size' }, m.sizes.map((label, k) => {
      const r = compile({ ...cur, size: k, dir: 'R' }, lim);
      return el('button', {
        class: `${cur.size === k ? 'on' : ''} ${r.program ? '' : 'locked'}`, role: 'radio', 'aria-checked': String(cur.size === k),
        onclick: () => choose({ ...cur, size: k, dir: 'R' }),
      }, label);
    })));
    desc.textContent = m.desc;
  };
  draw();
  openSheet('Movement', el('div', { class: 'path-card' }, canvas, desc), grid, sizeRow);
  sheetAnimator = new GrowthAnimator(canvas);
  sheetAnimator.setDivision(ed.division);
  sheetAnimator.setProgram(ed.program, ed.color);
  sheetAnimator.start();
}

// Fähigkeiten: Platz 1 und – gegen Punkte – Platz 2
const SPECIAL_SHORT = {
  none: 'Keep the points for traits – and save the upkeep.',
  spores: 'Starving cells sleep as spores and wake when food returns.',
  capsule: 'A slime coat absorbs hits and grows back fast.',
  photo: 'A little energy from light, even where the food is gone.',
  biofilm: 'Cells that sit still build a tough, thrifty slime mat.',
  predator: 'Hunts and eats enemy cells for a lot of energy.',
  toxin: 'Strong poison clouds that kill enemy neighbours.',
};
// Jede Fähigkeit ist stark für bestimmte Lagen – und hat eine Achillesferse
const SPECIAL_MATCH = {
  spores: ['Survives hunger and old age', 'Sleeping spores do not grow or fight'],
  capsule: ['Blocks hits, phages and immune cells', 'Slow and costly to divide · toxins and antibiotics go through'],
  photo: ['Energy without food, in the light', 'Little help in the shade'],
  biofilm: ['Resting cells resist attacks, toxins, antibiotics and currents · saves energy', 'Only while sitting still · mats eat less · phages and predators thrive'],
  predator: ['Big energy from every kill', 'Barely feeds on agar – starves when enemies are rare or armoured'],
  toxin: ['Kills crowds of enemies, even through capsules', 'Spoils food and burns energy · useless against biofilm'],
};
const unlockText = (k) => { const lvl = unlockLevelOf('special', k); return lvl > LEVELS.length ? `World ${worldOfLevel(lvl).n}` : `Level ${lvl}`; };

function abilitySheet(slot) {
  const lim = edCtx.limits;
  const field = slot === 1 ? 'special' : 'bonusSpecial';
  const other = slot === 1 ? ed.bonusSpecial : ed.special;
  const cur = ed[field] || 'none';
  const order = [...SPECIAL_KEYS].sort((a, b) => SPECIALS[a].cost - SPECIALS[b].cost);
  const left = edCtx.budget - cost(ed);
  openSheet(slot === 1 ? 'Ability' : 'Second ability',
    slot === 2 ? el('p', { class: 'small muted' }, `The second slot costs ${SLOT2_COST} points on top of the ability.`) : null,
    el('div', { class: 'list-card', role: 'radiogroup' }, order.filter((k) => k === 'none' || k !== other).map((k) => {
      const sp = SPECIALS[k];
      const open = lim.specials.has(k);
      const on = cur === k;
      const extra = k === 'none' ? 0 : (sp.cost + (slot === 2 && cur === 'none' ? SLOT2_COST : 0)) - (cur === 'none' ? 0 : SPECIALS[cur].cost);
      return el('button', {
        class: `special-row ${on ? 'on' : ''} ${open ? '' : 'locked'}`, role: 'radio', 'aria-checked': String(on),
        onclick: () => {
          if (!open) return toast(`${sp.name} unlocks in ${unlockText(k).toLowerCase()}.`);
          if (extra > left) return toast(`Not enough points – take some away from traits first.`);
          if (k === 'none' && slot === 2) delete ed.bonusSpecial; else ed[field] = k;
          closeSheet(); renderEditor();
        },
      },
      el('span', { class: 'sp-ico' }, specialIcon(k, 'md')),
      el('span', { class: 'main' }, el('b', {}, k === 'none' ? (slot === 2 ? 'Empty slot' : 'None') : sp.name), el('small', {}, SPECIAL_SHORT[k]),
        SPECIAL_MATCH[k] ? el('small', { class: 'match' }, el('span', { class: 'pro' }, '+ ', SPECIAL_MATCH[k][0]), el('span', { class: 'con' }, '− ', SPECIAL_MATCH[k][1])) : null,
        open ? null : el('small', {}, ui('lock', 'xs'), ` ${unlockText(k)}`)),
      el('span', { class: 'cost' }, k === 'none' ? '0' : `${sp.cost + (slot === 2 ? SLOT2_COST : 0)} pts`));
    })));
}

function slotTile(slot) {
  const lim = edCtx.limits;
  const key = slot === 1 ? ed.special : ed.bonusSpecial || 'none';
  const row = (cls, ico, name, sub, right, onclick) => el('button', { class: `slot-row ${cls}`, onclick },
    el('span', { class: 'sp-ico' }, ico), el('span', { class: 'main' }, el('b', {}, name), el('small', {}, sub)), right);
  if (slot === 2 && (lim.slots || 1) < 2) {
    return row('locked', ui('lock', 'sm'), 'Second ability', `Unlocks after level ${unlockLevelOf('slot')}`, null,
      () => toast(`The second slot unlocks after level ${unlockLevelOf('slot')}.`));
  }
  const empty = key === 'none';
  const pts = empty ? null : SPECIALS[key].cost + (slot === 2 ? SLOT2_COST : 0);
  return row(empty ? 'empty' : '', empty ? ui('plus', 'sm') : specialIcon(key, 'sm'),
    empty ? (slot === 1 ? 'Choose an ability' : 'Second ability') : SPECIALS[key].name,
    empty ? (slot === 1 ? 'Optional' : `Slot costs ${SLOT2_COST} pts extra`) : SPECIAL_SHORT[key],
    el('span', { class: 'row-end' }, pts ? el('span', { class: 'cost' }, `${pts} pts`) : null, ui('chevron', 'sm')),
    () => abilitySheet(slot));
}

// Wirkung einer Stufe in Zahlen – direkt aus den Spielwerten der Simulation
const pct = (x) => `${Math.round(x * 100)} %`;
function beatChance(a, d) {
  let w = 0;
  for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) if (a + (3 * (i + 0.5)) / 40 > d + 1 + (3 * (j + 0.5)) / 40) w++;
  return w / 1600;
}
function traitEffect(key, v) {
  const ph = phenotype({ ...defaultGenome(), [key]: v });
  switch (key) {
    case 'speed': return `Moves on ${pct(ph.moveChance)} of turns`;
    case 'lifespan': return `Lives up to ${fmtDuration(ph.maxAge)}`;
    case 'efficiency': return `Gets ${pct(ph.efficiency)} of the energy in its food`;
    case 'chemotaxis': return v ? `Heads for food on ${Math.round(ph.chemoChance * 100)} % of moves` : 'Cannot smell food';
    case 'attack': return `Beats a defense-0 cell in ${pct(beatChance(ph.attack, 0))} of fights`;
    case 'defense': return `Survives ${pct(1 - beatChance(1, ph.defense))} of attacks by an attack-2 cell`;
    default: return '';
  }
}

const freeName = (t, v) => { const o = t.options[Math.round(v)]; return o[0].toUpperCase() + o.slice(1); };
const freeText = (t, v) => {
  if (t.key === 'size') {
    const z = (v - 2) / 2;
    if (Math.abs(z) < 0.15) return 'Normal-sized cells';
    return z < 0 ? `Divides ${Math.round(-25 * z)} % sooner and burns ${Math.round(-20 * z)} % less – but fragile`
      : `+${(1.2 * z).toFixed(1)} defense and eats ${Math.round(18 * z)} % more – but slower and hungrier`;
  }
  if (t.key === 'division') {
    const at = Math.round(between(FREE_TABLES.divideAt, v));
    return `Divides at ${at} energy – ${v < 1.5 ? 'many small cells' : v > 2.5 ? 'few strong cells' : 'balanced'}`;
  }
  return `Eats up to ${between(FREE_TABLES.uptake, v).toFixed(1)} per step, burns ${between(FREE_TABLES.basal, v).toFixed(2)} just staying alive`;
};
function freeRow(t) {
  const v = ed[t.key];
  const name = el('span', { class: 'small' }, freeName(t, v));
  const text = el('span', { class: 'trait-effect' }, freeText(t, v));
  const slider = el('input', { type: 'range', min: '0', max: '4', step: '0.1', value: String(v), 'aria-label': t.label, 'aria-valuetext': freeName(t, v) });
  // nur Text neu setzen – der Regler bleibt erhalten, sonst bricht das Ziehen ab
  const update = () => {
    const nv = Number(slider.value);
    if (nv === ed[t.key]) return;
    ed[t.key] = nv;
    name.textContent = freeName(t, nv);
    text.textContent = freeText(t, nv);
    slider.setAttribute('aria-valuetext', freeName(t, nv));
    renderEnergy(energyProfile(normalize(ed)));
    colony.restart();
  };
  slider.addEventListener('input', update);
  slider.addEventListener('change', update);
  const ends = t.key === 'division' ? ['Early', 'Late'] : t.key === 'size' ? ['Small', 'Large'] : ['Frugal', 'Greedy'];
  // eine Zeile: Symbol, Name, Regler, aktueller Wert
  return el('div', { class: 'trait compact free', title: t.hint },
    icon(TRAIT_ICONS[t.key]), el('b', {}, t.label), slider, name);
}

function renderEditor() {
  if (document.activeElement !== $('#ed-name')) $('#ed-name').value = ed.name;
  const dot = $('#ed-color');
  dot.style.background = ed.color;
  dot.setAttribute('aria-label', `Colour: ${COLOR_NAMES[ed.color] || ed.color}. Tap to change`);

  const m = MOVE_BY_KEY[ed.move.type];
  fill($('#ed-move-row'),
    icon(pathSvg(ed.program), 'move-pic'),
    el('span', { class: 'main' }, el('b', {}, m.name), el('small', {}, describeMove(ed.move).replace(/ · (clockwise|counter-clockwise)/, '').split(' · ').slice(1).join(' · ') || 'Tap to change')),
    ui('chevron', 'sm'));
  fill($('#ed-slots'), slotTile(1), slotTile(2));

  const budget = edCtx.budget;
  const left = budget - cost(ed);
  fill($('#ed-costed'), ...COSTED.map((t) => {
    const v = ed[t.key];
    const next = stepCost(v + 1);
    const canInc = v < t.max && left >= next;
    // eine Zeile pro Eigenschaft: Symbol, Name, Balken, Wert, −/+ (die Wirkung steht oben in den Gesamtwerten)
    return el('div', { class: 'trait compact', title: t.hint },
      icon(TRAIT_ICONS[t.key]), el('b', {}, t.label),
      el('div', { class: 'pips', 'aria-hidden': 'true' }, Array.from({ length: TRAIT_MAX }, (_, k) => el('i', { class: `${k < v ? 'on' : ''} ${k >= 4 ? (k >= 7 ? 'c3' : 'c2') : ''}` }))),
      el('button', { class: 'step-btn', disabled: v <= 0, 'aria-label': `Lower ${t.label}`, onclick: () => { if (ed[t.key] > 0) { ed[t.key]--; renderEditor(); } } }, '−'),
      el('span', { class: 'trait-val', 'aria-live': 'polite' }, String(v)),
      el('button', {
        class: 'step-btn', disabled: !canInc, 'aria-label': `Raise ${t.label} for ${next} ${next === 1 ? 'point' : 'points'}`,
        onclick: () => { if (canInc) { ed[t.key]++; renderEditor(); } },
      }, '+', next > 1 && v < t.max ? el('sup', {}, String(next)) : null));
  }));
  fill($('#ed-free'), ...FREE.map(freeRow));
  renderEnergy(energyProfile(normalize(ed)));
  renderBudget();
  colony.restart();
}

function renderBudget() {
  const budget = edCtx.budget;
  const c = cost(ed);
  fill($('#ed-cost'), String(c), el('small', {}, ` / ${budget}`));
  $('#ed-meter').style.width = `${Math.min(100, (c / budget) * 100)}%`;
  const over = c > budget;
  $('#ed-budget').classList.toggle('over', over);
  const left = $('#ed-left');
  left.className = `points-left ${over ? 'over' : c < budget ? 'left' : 'done'}`;
  left.textContent = over ? `${c - budget} too many` : c < budget ? `${budget - c} left` : 'all spent';
}

$('#ed-move-row').addEventListener('click', moveSheet);
$('#ed-name').addEventListener('input', (e) => { ed.name = e.target.value; });
$('#ed-dice').addEventListener('click', () => {
  ed.name = randomName(makeRng(randomSeed()), edCtx.world, takenNames(ed.id));
  $('#ed-name').value = ed.name;
});
$('#ed-cancel').addEventListener('click', () => go(edCtx.returnTo));
$('#ed-save').addEventListener('click', () => {
  if (!ed.name.trim()) { $('#ed-name').focus(); return toast('Please give your bacterium a name.'); }
  const probs = problems(ed, edCtx.limits, edCtx.budget);
  if (probs.length) return toast(probs.join(' · '));
  const saved = store.saveBacterium({ ...ed, world: edCtx.world });
  toast(`“${saved.name}” saved.`);
  careerId = saved.id;
  go(edCtx.returnTo === 'result' ? 'home' : edCtx.returnTo);
});

const perHour = (x) => Math.round(x * ROUNDS_PER_HOUR);
function fmtDuration(rounds) {
  if (!Number.isFinite(rounds)) return 'unlimited';
  const min = Math.round((rounds * 60) / ROUNDS_PER_HOUR);
  return min < 60 ? `${Math.max(1, min)} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
// Gesamtwerte des Bakteriums – mit Zellgröße, Mutationen und Unterhalt, so wie es auf der Platte spielt
function renderEnergy(ep) {
  const g = normalize(ed);
  const ph = phenotype(g);
  const net = perHour(ep.intake - ep.cost);
  const stat = (label, value, bad = false) => [el('dt', {}, label), el('dd', { class: bad ? 'bad' : '' }, value)];
  fill($('#ed-energy'),
    ...stat('Energy', `${net >= 0 ? '+' : ''}${net}/h`, net < 0),
    ...stat('Divides', fmtDuration(ep.roundsToDivide)),
    ...stat('No food', fmtDuration(Math.min(ep.roundsWithoutFood, ep.maxAge))),
    ...stat('Lives', fmtDuration(ph.maxAge)),
    ...stat('Moves', pct(ph.moveChance)),
    ...stat('Smell', pct(ph.chemoChance)),
    ...stat('Attack', pct(beatChance(ph.attack, 0))),
    ...stat('Defense', pct(1 - beatChance(1, ph.defense))),
    ...stat('Upkeep', `${perHour(upkeepOf(g))}/h`));
}

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
  while (sim.notices && ev.notice < sim.notices.length) {
    const nt = sim.notices[ev.notice++];
    const who = nt.target ? (nt.target === 1 ? 'your colony' : `${names[nt.target - 1]}'s colony`) : '';
    const text = {
      'sugar-warn': 'Honey drop in 1 h – see the blinking ring',
      disc: who ? `Antibiotic disc placed on ${who}` : 'Antibiotic disc placed',
      mould: 'Mould spores landed on the plate',
      phage: `Phage outbreak in ${who}`,
      immune: 'Immune cells arrive',
    }[nt.kind];
    if (text) { banner(text, nt.target === 1 ? 'bad' : ''); play('alarm'); }
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
    amount: cfg.amount, regen: cfg.regen, elements: cfg.elements, seed: cfg.seed,
  });
  const theme = cfg.mode === 'level' ? worldOfLevel(cfg.level).theme : null;
  run.r = new PlateRenderer($('#plate'), run.sim, theme);
  run.paused = false;
  run.acc = 0;
  run.last = 0;
  run.fight = null;
  run.ev = { contact: false, dead: new Set(), leader: 0, leaderTick: -999, slow: false, sixH: false, peakPlate: 0, notice: 0 };
  const elKeys = elementsOf(cfg);
  $('#sim-elements').hidden = !elKeys.length;
  fill($('#sim-elements'), ...elKeys.map((k) => el('span', { class: 'el-chip' }, elIcon(k, 'xs'), ELEMENTS[k].name)));
  // geplante Ereignisse als Marken auf der Zeitleiste
  const marks = [];
  for (const p of run.sim.pulses || []) marks.push(p.at);
  for (const d of run.sim.discs || []) if (d.at > 0) marks.push(d.at);
  for (const m of run.sim.moulds || []) if (m.at > 0) marks.push(m.at);
  for (const t of run.sim.phageAt || []) marks.push(t);
  if ((run.sim.immune || []).length) marks.push(run.sim.immuneAt);
  fill($('#clock-marks'), ...marks.filter((t) => t > 0 && t < MAX_TICKS).map((t) => el('i', { style: `left:${(t / MAX_TICKS) * 100}%` })));
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
  // Anzeigetafel oben: Anteil jeder Kultur, groß und ohne Scrollen sichtbar
  fill($('#sim-legend'), ...run.genomes.map((g, i) => el('div', { class: 'legend-row score', title: g.name },
    el('b', { class: 'n' }, '0 %'),
    el('span', { class: 'score-name' }, culture(g.color, 'sm'), el('span', {}, i === 0 ? 'You' : g.name.split(' ')[0])))));
  $('#sim-legend').style.gridTemplateColumns = `repeat(${run.genomes.length}, minmax(0, 1fr))`;
  $('#sim-goals').hidden = cfg.mode !== 'level';
  setSpeed(1); // jede Runde beginnt mit 1×
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
    rows[i].querySelector('.n').textContent = `${Math.round(pc)}%`;
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
    const lv = LEVELS[run.cfg.level - 1];
    const ch = challengeOf(lv);
    const chOk = ch.ok(sim, run.genomes[0]);
    const chLost = (ch.fixed && !chOk) || (ch.failed && ch.failed(sim)) || (sim.done && !(sim.winner === 1 && chOk));
    const won = sim.done && sim.winner === 1;
    fill($('#sim-goals'),
      el('div', { class: `goal-chip ${won ? 'done' : sim.done ? 'lost' : ''}` }, el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), 'Win'),
      el('div', { class: `goal-chip ${won && !fastLost ? 'done' : fastLost ? 'lost' : ''}` }, el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), 'Under 12 h'),
      el('div', { class: `goal-chip ${chLost ? 'lost' : chOk && !ch.fixed ? 'done' : ''}`, title: ch.text }, el('span', { class: 'star', 'aria-hidden': 'true' }, '★'), ch.progress && !chOk ? ch.progress(sim) : ch.short));
  }
  if (run.ev) checkEvents();
  fightLevel();
}

// Wie heftig wird gerade gekämpft? Getötete Zellen pro Runde im Vergleich zum üblichen Grenzgeplänkel:
// nur ein echter Anstieg lässt die Musik anziehen, danach beruhigt sie sich wieder
function fightLevel() {
  const sim = run.sim;
  const kills = sim.players.reduce((a, p) => a + p.kills, 0);
  const f = run.fight || (run.fight = { kills, tick: sim.tick, rate: 0, base: 0 });
  const dt = sim.tick - f.tick;
  if (dt >= 10) {
    const rate = (kills - f.kills) / dt;
    f.rate = f.rate * 0.6 + rate * 0.4;
    f.base = f.base * 0.97 + f.rate * 0.03;
    f.kills = kills; f.tick = sim.tick;
  }
  const surge = (f.rate - Math.max(0.8, f.base * 1.15)) / 3;
  // sobald die Runde läuft, spielt die Musik mit Puls; je später und je heftiger gekämpft wird, desto mehr
  const base = 0.32 + 0.2 * Math.min(1, sim.tick / MAX_TICKS);
  setIntensity(sim.done || run.paused ? 0 : Math.max(base, Math.min(1, base + surge)));
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
  setIntensity(0);
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
  run.sim = null;
  go('level-detail');
});
onLeave.sim = () => { cancelAnimationFrame(run.raf); run.paused = true; setIntensity(0); };
$('#resume-bar').addEventListener('click', resumeMatch);
document.addEventListener('visibilitychange', () => {
  run.last = 0; demo.last = 0;
  if (document.hidden) openPause();
});

$('#set-back').addEventListener('click', () => go(settingsFrom));

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
  $('#rs-where').textContent = `Level ${cfg.level} · ${LEVELS[cfg.level - 1].name}`;

  const firstWin = cfg.mode === 'level' && won && store.markWon(cfg.careerId, cfg.level);
  const mask = cfg.mode === 'level' ? starMask(sim, LEVELS[cfg.level - 1], run.genomes[0]) : 0;
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
        el('small', {}, starLabel(g, LEVELS[cfg.level - 1])),
        el('span', { class: 'state' }, got ? (newStars & g.bit ? 'New' : 'Earned') : old ? 'Earned before' : 'Missed'));
    }));
  }
  const tripleNow = cfg.mode === 'level' && newStars && ((store.getBacterium(cfg.careerId)?.career.stars[cfg.level] || 0) & 7) === 7;
  // Neues kommt gesammelt in einem Fenster am Ende der Runde – nach Art sortiert
  const me = store.getBacterium(cfg.careerId);
  const gain = (firstWin ? POINTS_PER_WIN : 0) + (tripleNow ? 1 : 0);
  const after = me ? ptsOf(me) : 0;
  const unlocks = {
    level: firstWin ? cfg.level : 0,
    mask,
    points: gain ? { gain, before: after - gain, after, name: me ? me.name : '', triple: tripleNow } : null,
    rewards: firstWin ? rewardsOf(cfg.level) : [],
    achievements: newAch,
    germs: newGerms,
    // neue Mutation zur Wahl nach jedem ersten Sieg
    mutation: firstWin && me ? { id: me.id, choices: mutationChoices(me, cfg.level, seenElements(cfg.level)) } : null,
  };
  if (unlocks.mutation && !unlocks.mutation.choices.length) unlocks.mutation = null;
  const hasNews = unlocks.mutation || unlocks.points || unlocks.rewards.length || newAch.length || newGerms.length;
  $('#rs-rewards').hidden = true;
  // Details
  renderSummary(sim, mask);
  const rc = $('#rs-plate');
  const pc = $('#plate'); rc.width = pc.width; rc.height = pc.height;
  rc.getContext('2d').drawImage($('#plate'), 0, 0);
  $('#rs-plate-note').textContent = `At ${fmtHours(h)} · dark agar = food eaten up`;
  drawHistory($('#rs-chart'), sim.history, run.genomes.map((g) => g.color));
  $('#rs-more-details').open = false;
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
  const again = $('#rs-rematch');
  again.className = next ? 'btn' : 'btn primary';
  fill(again, ui('restart'), lvMode ? (won ? 'Again' : 'Try again') : 'Rematch');
  const stack = document.querySelector('#result .cta-stack');
  const two = $('#rs-more');
  if (next) { if (again.parentElement !== two) two.append(again); } else stack.insertBefore(again, two);
  two.classList.toggle('single', two.querySelectorAll('button:not([hidden])').length === 1);
  play(won ? 'win' : 'lose');
  if (newStars) setTimeout(() => play('star'), 700);
  if (hasNews) setTimeout(() => showUnlocks(unlocks), 900);
}

// eine Zeile im Gewinn-Fenster: Art (klein) über dem Namen, darunter was es bedeutet
const rewardRow = (ico, kind, title, sub, tone = '') => el('div', { class: `reward ${tone}` },
  el('span', { class: 'badge' }, ico),
  el('span', { class: 'main' }, kind ? el('span', { class: 'kind' }, kind) : null, el('b', {}, title), sub ? el('small', {}, sub) : null));
const REWARD_KIND = { move: 'New movement', special: 'New ability', slot: 'New slot', bigger: 'Bigger patterns', title: 'New title' };
const rewardSub = (r) => ({
  move: 'Pick it under Movement in the Lab',
  special: 'Choose it under Abilities in the Lab',
  slot: 'Add a second ability in the Lab',
  bigger: 'More sizes for your movement patterns',
  title: 'Shown on your profile',
}[r.type] || '');
const winSection = (label, ...rows) => el('section', { class: 'win-section' }, el('h3', { class: 'win-label' }, label), el('div', { class: 'rewards' }, ...rows));

// Auswertung: Kennzahlen, woran die eigenen Zellen starben, was die Platte bewirkt hat, Hinweise
const DEATH_COLORS = { starve: 'var(--plate-full)', age: 'var(--text-secondary)', fight: 'var(--danger)', toxin: '#8ab83c', env: 'var(--selection)' };
function renderSummary(sim, mask) {
  const me = sim.players[0];
  const fmt = (x) => x.toLocaleString('en-US');
  const deaths = deathBreakdown(me);
  const lost = deaths.reduce((a, d) => a + d.n, 0);
  const tile = (value, label) => el('div', { class: 'sum-tile' }, el('b', {}, value), el('small', {}, label));
  const block = (title, ...kids) => el('div', { class: 'sum-block' }, el('h3', { class: 'win-label' }, title), ...kids);
  const plate = plateReport(sim);
  const notes = analyze(sim, run.genomes, mask, run.cfg.mode === 'level' ? LEVELS[run.cfg.level - 1] : null);
  fill($('#rs-analysis'),
    el('div', { class: 'sum-tiles' },
      tile(`${Math.round(me.peakPlate * 100)} %`, 'of the plate at best'),
      tile(fmt(me.peak), 'cells at most'),
      tile(fmt(me.kills), 'enemies killed'),
      tile(fmt(lost), 'cells died in total')),
    lost ? block('How your cells died',
      el('div', { class: 'death-bar', 'aria-hidden': 'true' }, deaths.map((d) => el('i', { style: `flex:${d.n};background:${DEATH_COLORS[d.key]}` }))),
      el('div', { class: 'death-legend' }, deaths.map((d) => el('span', {}, el('i', { style: `background:${DEATH_COLORS[d.key]}` }), `${d.label} `, el('b', {}, `${Math.round((d.n / lost) * 100)} %`))))) : null,
    plate.length ? block('The plate', ...plate.map((r) => el('div', { class: 'el-row' }, el('span', { class: 'el-ico' }, elIcon(r.type, 'md')), el('div', { class: 'main' }, el('b', {}, ELEMENTS[r.type].name), el('small', {}, r.text))))) : null,
    notes.length ? block('Worth knowing', ...notes.map((a) =>
      el('div', { class: `insight kind-${a.kind}` }, el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', {}, a.text)))) : null);
}

// Elemente der nächsten Level (für passende Mutationen)
// Gefahren, die bis einschließlich dieses Levels schon vorkamen
const seenElements = (level) => new Set(LEVELS.slice(0, level).flatMap((lv) => elementsOf(lv.plate)));

// Fenster mit allem, was in dieser Runde neu dazukam: besiegter Keim, Belohnungen, Erfolge
function showUnlocks(u) {
  const lv = u.level ? LEVELS[u.level - 1] : null;
  const boss = lv ? lv.boss : null;
  const germ = boss ? GERMS[boss.germ] : null;
  const starsGot = starCount(u.mask);
  const ok = $('#win-ok');
  ok.disabled = false;
  $('#win-title').textContent = lv ? 'Level cleared' : 'New unlocks';
  fill($('#win-sub'), lv ? `Level ${u.level} · ${lv.name}` : '', u.mask ? el('span', { class: 'win-stars', 'aria-label': `${starsGot} of 3 stars` }, [0, 1, 2].map((k) => el('span', { class: k < starsGot ? 'on' : '' }, '★'))) : null);
  // Schritt 1: kurz und knapp – besiegter Keim, Belohnungen, Erfolge als kleine Marken
  const sections = [];
  if (germ) {
    sections.push(el('section', { class: 'win-germ-card' },
      germPic(boss.germ, boss.color, 'win-germ'),
      el('div', { class: 'main' },
        el('span', { class: 'kind' }, 'Defeated'),
        el('b', { class: 'germ-name' }, germ.name),
        u.germs.includes(boss.germ) ? el('span', { class: 'atlas-tag' }, ui('atlas', 'xs'), 'Added to your atlas') : null)));
  }
  const rewards = [];
  if (u.points) rewards.push(rewardRow(ui('plus'), 'Upgrade points', `+${u.points.gain} (${u.points.before} → ${u.points.after})`, '', 'gold'));
  for (const r of u.rewards) rewards.push(rewardRow(r.type === 'move' ? icon(pathSvg(actionsOf({ type: r.key, size: 0, dir: 'R' })), 'md') : rewardIcon(r), REWARD_KIND[r.type] || 'Unlocked', r.short || r.text, ''));
  const otherGerms = u.germs.filter((k) => !boss || k !== boss.germ);
  if (otherGerms.length) rewards.push(rewardRow(ui('atlas'), 'New in your atlas', otherGerms.map((k) => GERMS[k].name).join(', '), ''));
  if (rewards.length) sections.push(winSection('Rewards', ...rewards));
  if (u.achievements.length) {
    sections.push(el('section', { class: 'win-section' }, el('h3', { class: 'win-label' }, 'Achievements'),
      el('div', { class: 'ach-chips' }, u.achievements.map((a) => el('span', { class: 'ach-chip', title: a.desc }, icon(ACH_ICONS[a.key], 'sm'), a.name)))));
  }
  fill($('#win-body'), ...sections);
  ok.textContent = u.mutation ? 'Choose a mutation' : 'Continue';
  pendingMutation = u.mutation;
  $('#win-modal').hidden = false;
  $('#win-modal').scrollTop = 0;
  document.body.classList.add('modal-open');
  setTimeout(() => play('unlock'), 300);
}

let pendingMutation = null;
// Mutationswahl als eigenes Fenster
function showMutationStep(m) {
  const ok = $('#mut-ok');
  ok.disabled = true;
  const cards = m.choices.map((k) => el('button', {
    class: 'mut-card', 'aria-pressed': 'false',
    onclick: (e) => {
      store.addMutation(m.id, k);
      cards.forEach((c) => { c.classList.toggle('on', c === e.currentTarget); c.setAttribute('aria-pressed', String(c === e.currentTarget)); c.disabled = true; });
      ok.disabled = false;
      play('star');
    },
  }, el('span', { class: 'mut-ico' }, ui('flask', 'md')), el('b', {}, MUTATIONS[k].name), el('small', {}, MUTATIONS[k].text)));
  fill($('#mut-cards'), ...cards);
  $('#mut-modal').hidden = false;
  document.body.classList.add('modal-open');
}
$('#mut-ok').addEventListener('click', () => {
  if ($('#mut-ok').disabled) return;
  $('#mut-modal').hidden = true;
  document.body.classList.remove('modal-open');
});

function closeWin(e) {
  if ($('#win-ok').disabled) return; // erst eine Mutation wählen
  if (e && e.target.closest('.modal-box') && !e.target.closest('#win-ok')) return;
  if (e && e.type === 'touchend') e.preventDefault();
  // nach dem ersten Schritt geht es zur Mutationswahl weiter
  $('#win-modal').hidden = true;
  document.body.classList.remove('modal-open');
  if (pendingMutation) { const m = pendingMutation; pendingMutation = null; setTimeout(() => showMutationStep(m), 250); }
}
$('#win-modal').addEventListener('click', closeWin);
$('#win-ok').addEventListener('touchend', closeWin);

$('#rs-back').addEventListener('click', () => go('home'));
// Diagramm erst zeichnen, wenn die Details aufgeklappt sind (vorher hat es keine Breite)
$('#rs-more-details').addEventListener('toggle', () => { if ($('#rs-more-details').open && run.sim) drawHistory($('#rs-chart'), run.sim.history, run.genomes.map((g) => g.color)); });
$('#rs-rematch').addEventListener('click', () => {
  const b = store.getBacterium(run.cfg.careerId);
  if (!b) return go('home');
  const probs = problems(b, limitsOf(b), ptsOf(b));
  if (probs.length) return toast(probs.join(' · '));
  startMatch({ ...run.cfg, player: b, seed: randomSeed() });
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
    el('span', { class: 'pic' }, germPic(g.germ, isKnown ? g.color : '#3a4434')),
    el('b', {}, isKnown ? germ.name : 'Undiscovered'),
    el('small', {}, isKnown ? `Level ${g.level}${g.boss ? ' · boss' : ''}` : `Beat level ${g.level}`));
  };
  fill($('#atlas-list'), ...(w.playable ? germs.map(card) : waiting.map(([k]) => el('div', { class: 'germ-card unknown' },
    el('span', { class: 'pic' }, germPic(k, '#3a4434')), el('b', {}, 'Undiscovered'), el('small', {}, 'Coming soon')))));
};

function openGerm(g) {
  const germ = GERMS[g.germ];
  fill($('#gm-body'),
    el('div', { class: 'gm-pic' }, germPic(g.germ, g.color)),
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

// ---------- Auszeichnungen: nur die Erfolge ----------
onEnter.awards = () => {
  const got = ACHIEVEMENTS.filter((a) => store.hasAchievement(a.key)).length;
  $('#ach-count').textContent = `${got} of ${ACHIEVEMENTS.length} achievements`;
  const when = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  fill($('#ach-list'), ...ACHIEVEMENTS.map((a) => {
    const ts = store.achievementTime(a.key);
    return el('div', { class: `ach-row ${ts ? 'got' : ''}` },
      el('span', { class: 'ach-badge', 'aria-hidden': 'true' }, icon(ACH_ICONS[a.key], 'md')),
      el('span', { class: 'main' }, el('b', {}, a.name), el('small', {}, a.desc)),
      el('span', { class: 'when' }, ts ? when(ts) : 'Locked'));
  }));
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
// pro Welt nur ein Bakterium: bei mehreren bleibt das mit den meisten gewonnenen Leveln
function onePerWorld() {
  const byWorld = {};
  for (const b of store.getBacteria()) (byWorld[b.world || 1] ||= []).push(b);
  for (const list of Object.values(byWorld)) {
    if (list.length < 2) continue;
    list.sort((x, y) => y.career.won.length - x.career.won.length || Object.keys(y.career.stars).length - Object.keys(x.career.stars).length);
    list.slice(1).forEach((b) => store.deleteBacterium(b.id));
  }
}
onePerWorld();
fitToBudget();
hydrateIcons();
store.discover(store.globalWon().filter((n) => LEVELS[n - 1]).flatMap((n) => levelOpponents(LEVELS[n - 1]).map((o) => o.germ)));
refreshSoundButtons();
refreshMusicButtons();
go('home');
// Musik läuft durchgehend (startet hörbar nach der ersten Berührung)
if (musicOn()) startMusic();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    // beim Zurückkehren in die App nach einer neuen Version suchen
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  // neue Version aktiv: einmal neu laden, aber nie mitten in einer Runde
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || current === 'sim') return;
    reloaded = true;
    location.reload();
  });
}
