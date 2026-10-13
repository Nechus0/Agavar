// Oberfläche: Bildschirme, Karriere, Editor, Spielablauf.
import {
  COSTED, FREE, SPECIALS, SPECIAL_KEYS, PALETTE,
  MIN_BUDGET, MAX_BUDGET, defaultGenome, cost, normalize, randomGenome, specialsOf,
} from './genome.js';
import { Simulation, DISTRIBUTIONS, MAX_TICKS, energyProfile, ROUNDS_PER_HOUR } from './sim.js';
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
import { SPECIAL_ICONS, SPECIAL_COLORS, TRAIT_ICONS, LOCK_ICON, UNLOCK_ICON } from './icons.js';
import { MOVES, MOVE_BY_KEY, actionsOf, compile, moveFromProgram, describeMove, pathSvg } from './movement.js';
import * as store from './storage.js';
import { meters, METER_INFO, counterTips } from './meters.js';
import { play, setSoundEnabled } from './sound.js';
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

// Drei Leisten (Ausbreitung, Kampfkraft, Ausdauer); mit `other` als Vergleich „Du vs. Gegner“
function meterBars(g, other = null, otherLabel = '') {
  const a = meters(g);
  const b = other ? meters(other) : null;
  return el('div', { class: `meters ${b ? 'versus' : ''}` },
    b ? el('div', { class: 'm-legend small muted' }, el('span', {}, el('i', { class: 'm-you' }), 'You'), el('span', {}, el('i', { class: 'm-them' }), otherLabel)) : null,
    METER_INFO.map((m) => el('div', { class: 'm-row', title: m.label },
      el('span', { class: 'm-label' }, `${m.icon} ${m.label}`),
      el('div', { class: 'm-bars' },
        el('div', { class: 'm-bar' }, el('i', { style: `width:${a[m.key] * 10}%;background:${m.color}` })),
        b ? el('div', { class: 'm-bar them' }, el('i', { style: `width:${b[m.key] * 10}%` })) : null),
      el('b', { class: 'm-val' }, b ? `${Math.round(a[m.key])}:${Math.round(b[m.key])}` : String(Math.round(a[m.key]))))));
}

// Ton an/aus (Einstellung wird gespeichert)
function refreshSoundButtons() {
  const on = store.getSettings().sound !== false;
  setSoundEnabled(on);
  document.querySelectorAll('.sound-toggle').forEach((b) => { b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(on)); });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.sound-toggle')) return;
  store.updateSettings({ sound: store.getSettings().sound === false });
  refreshSoundButtons();
  toast(store.getSettings().sound ? '🔊 Sound on' : '🔇 Sound off');
  play('tap');
});

// Music on/off (only plays during a simulation)
const musicOn = () => store.getSettings().music !== false;
function refreshMusicButtons() {
  document.querySelectorAll('.music-toggle').forEach((b) => { b.classList.toggle('off', !musicOn()); b.setAttribute('aria-pressed', String(musicOn())); });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.music-toggle')) return;
  store.updateSettings({ music: !musicOn() });
  refreshMusicButtons();
  toast(musicOn() ? '🎵 Music on' : '🎵 Music off');
  if (current === 'sim' && musicOn() && !run.paused) startMusic(); else stopMusic();
});

// Inhalt ersetzen, leere Einträge (null/false) überspringen
function fill(node, ...kids) {
  node.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
}

// SVG-Grafik (nur eigene, feste Strings aus icons.js / germs.js)
function icon(svg, cls = '', color = '') {
  const s = el('span', { class: `ico ${cls}`, style: color ? `color:${color}` : null });
  s.innerHTML = svg;
  return s;
}
function germPic(germ, color, cls = '') {
  const s = el('span', { class: `germ-pic ${cls}` });
  s.innerHTML = germSvg(GERMS[germ].shape, color);
  return s;
}

// Bewegung als kleine Bahnzeichnung + Beschreibung
const moveChip = (g) => el('span', { class: 'move-chip' }, icon(pathSvg(g.program), 'path-ico'), describeMove(moveFromProgram(g.program)));
const specialBadge = (key, cls = '') => icon(SPECIAL_ICONS[key], cls, SPECIAL_COLORS[key]);
const specialTag = (key) => el('span', { class: 'sp-tag', style: `--c:${SPECIAL_COLORS[key]}` }, specialBadge(key, 'sm'), SPECIALS[key].name);

const LABELS = {
  size: { klein: 'Small', mittel: 'Medium', gross: 'Large' },
  distribution: { gleichmaessig: 'Even', flecken: 'Patches', ring: 'Ring', zentrum: 'Center', rauschen: 'Noise' },
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

const lockedToast = (level) => toast(`🔒 Unlocks when you win level ${level}.`);

// ---------- Startbildschirm mit Demo-Platte ----------
const demo = { sim: null, r: null, raf: 0, last: 0, acc: 0 };

function startDemo() {
  const rng = makeRng(randomSeed());
  const genomes = [0, 1, 2].map((k) => ({ ...randomGenome(rng, 20), color: PALETTE[(k * 3 + rng.int(2)) % PALETTE.length] }));
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

onEnter.home = () => {
  $('#home-hint').hidden = store.getBacteria().length > 0;
  if (!demo.sim) startDemo();
  demo.last = 0;
  cancelAnimationFrame(demo.raf);
  demo.raf = requestAnimationFrame(demoFrame);
};
onLeave.home = () => cancelAnimationFrame(demo.raf);

$('#home-career').addEventListener('click', () => {
  if (!store.getBacteria().length) openEditor(null, careerNewCtx('home'));
  else go('careers');
});

// ---------- Karriere-Übersicht ----------
const ptsOf = (b) => careerPoints(b.career.won, b.career.stars);
const starsText = (mask) => '★'.repeat(starCount(mask)) + '☆'.repeat(3 - starCount(mask));
const careerCtx = (b, returnTo = 'career') => ({
  mode: 'career', id: b.id, budget: ptsOf(b), limits: getLimits(b.career.won),
  label: 'Upgrade points', returnTo,
});
const careerNewCtx = (returnTo = 'careers') => ({
  mode: 'career', id: null, budget: START_POINTS, limits: getLimits([]), label: 'Upgrade points', returnTo,
});

function levelBadge(b) {
  const n = nextLevel(b.career.won, LEVELS.length);
  return n > LEVELS.length ? '🏆 Master' : `Level ${n} of ${LEVELS.length}`;
}

onEnter.careers = () => {
  const list = store.getBacteria();
  fill($('#career-list'), ...(list.length ? list.map((b) => {
    const pts = ptsOf(b);
    const free = pts - cost(b);
    return el('button', { class: 'lab-item career-item', onclick: () => openCareer(b.id) },
      el('div', { class: 'title' },
        el('span', { class: 'dot', style: `background:${b.color}` }),
        el('b', {}, b.name),
        el('span', { class: 'cost' }, levelBadge(b))),
      free > 0 ? el('div', { class: 'small free-pts' }, `${free} ${free === 1 ? 'point' : 'points'} free!`) : null);
  }) : [el('div', { class: 'empty' }, 'No bacterium yet. Create your first one!')]));
};
$('#career-new').addEventListener('click', () => openEditor(null, careerNewCtx('careers')));

// ---------- Eine Karriere ----------
let careerId = null;
const curCareer = () => store.getBacterium(careerId);

function openCareer(id) {
  careerId = id;
  go('career');
}

onEnter.career = () => {
  const b = curCareer();
  if (!b) return go('careers');
  const won = b.career.won;
  const pts = ptsOf(b);
  const free = pts - cost(b);
  const lim = getLimits(won);
  const probs = problems(b, lim, pts);
  $('#cr-title').textContent = b.name;
  fill($('#cr-card'),
    el('div', { class: 'title row gap' }, el('span', { class: 'dot big-dot', style: `background:${b.color}` }), el('b', { class: 'big-name' }, b.name), el('span', { class: 'cost' }, levelBadge(b))),
    meterBars(normalize(b)),
    probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
    el('button', { class: `btn ${free > 0 ? 'primary' : ''}`, onclick: () => openEditor(b, careerCtx(b)) },
      free > 0 ? `🔧 Upgrade · ${free} ${free === 1 ? 'point' : 'points'} free` : '🔧 Upgrade'));

  const nxt = nextLevel(won, LEVELS.length);
  fill($('#cr-levels'), ...LEVELS.map((lv, i) => {
    const n = i + 1;
    const isWon = won.includes(n);
    const open = isWon || n === nxt;
    const boss = lv.boss;
    return el('button', {
      class: `level-tile ${isWon ? 'won' : ''} ${n === nxt ? 'next' : ''} ${open ? '' : 'locked'}`,
      onclick: () => (open ? openLevel(n) : toast(`Win level ${n - 1} first.`)),
      'aria-label': `Level ${n}: ${lv.name}`,
    },
    el('span', { class: 'lt-num' }, open ? String(n) : '🔒'),
    germPic(boss.germ, open ? boss.color : '#3a4554', 'lt-pic'),
    el('span', { class: 'lt-name' }, lv.name),
    isWon ? el('span', { class: 'lt-stars' }, starsText(b.career.stars[n] || 0))
      : el('span', { class: 'lt-rewards' }, rewardsOf(n).map((r) => rewardIcon(r))));
  }));
};

$('#cr-delete').addEventListener('click', async () => {
  const b = curCareer();
  if (b && await confirmDialog('Delete bacterium?', `“${b.name}” and its career will be deleted for good.`, 'Delete')) {
    store.deleteBacterium(b.id);
    go('careers');
  }
});

function rewardIcon(r) {
  if (r.type === 'special') return specialBadge(r.key, 'sm');
  if (r.type === 'move') return icon(pathSvg(actionsOf({ type: r.key, size: 1, dir: 'R' })), 'sm reward-step');
  return icon(UNLOCK_ICON, 'sm reward-step');
}
const rewardRows = (level, withPoints) => [
  withPoints ? el('div', { class: 'reward' }, el('span', { class: 'plus' }, `+${POINTS_PER_WIN}`), 'upgrade points for your bacterium') : null,
  ...rewardsOf(level).map((r) => el('div', { class: 'reward' }, rewardIcon(r), r.text)),
].filter(Boolean);

// ---------- Leveldetails ----------
let openLevelNo = 1;

// eine Zeile pro Gegner: Bild, Name, Fähigkeiten, Bewegung
function foeRow(o) {
  return el('div', { class: `foe ${o.boss ? 'boss' : ''}` },
    germPic(o.germ, o.color, o.boss ? 'foe-pic big' : 'foe-pic'),
    el('div', { class: 'foe-main' },
      el('b', { class: 'foe-name' }, o.boss ? '★ ' : '', o.name),
      el('div', { class: 'foe-tags' }, ...specialsOf(o).map(specialTag), moveChip(o))));
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
  $('#ld-title').textContent = `Level ${n}`;
  fill($('#ld-desc'), el('b', {}, lv.name), ' – ', lv.desc);
  const pl = lv.plate;
  fill($('#ld-foes'),
    foeRow(boss), ...others.map(foeRow),
    el('div', { class: 'tip small' }, '💡 ', counterTips(boss, 1)[0]),
    el('div', { class: 'plate-line small muted' },
      `🧫 ${LABELS.size[pl.size]} · 🍯 ${LABELS.distribution[pl.distribution]}, ${LABELS.amount[pl.amount].toLowerCase()} · 🔁 ${LABELS.regen[pl.regen].toLowerCase()}`));
  // Ziele: drei Sterne in einer Zeile, darunter die Belohnung als Symbole
  const mask = b.career.stars[n] || 0;
  fill($('#ld-goals'),
    el('div', { class: 'goal-stars' }, STAR_GOALS.map((g) => el('div', { class: `goal ${mask & g.bit ? 'done' : ''}`, title: g.text },
      el('span', { class: 'star' }, mask & g.bit ? '★' : '☆'), el('small', {}, `${g.icon} ${g.short}`)))),
    won.includes(n) ? null : el('div', { class: 'reward-line small' }, 'A win gives ',
      el('span', { class: 'plus' }, `+${POINTS_PER_WIN}`),
      ...rewardsOf(n).map((r) => el('span', { class: 'rw' }, rewardIcon(r), r.short || r.text))));

  const pts = ptsOf(b);
  const free = pts - cost(b);
  const probs = problems(b, getLimits(won), pts);
  fill($('#ld-me'),
    el('div', { class: 'title row gap' }, el('span', { class: 'dot', style: `background:${b.color}` }), el('b', {}, b.name),
      el('span', { class: `cost ${free > 0 ? 'free-pts' : ''}` }, free > 0 ? `${free} pts free` : `${pts} pts`),
      el('button', { class: 'btn small', onclick: () => openEditor(b, careerCtx(b, 'level-detail')) }, '🔧 Upgrade')),
    meterBars(normalize(b), boss, boss.name.split(' ')[0]),
    probs.length ? el('p', { class: 'small warn' }, '⚠ ', probs.join(' · ')) : null);
  $('#ld-start').disabled = probs.length > 0;
};

$('#ld-start').addEventListener('click', () => {
  const b = curCareer();
  if (!b) return;
  const lv = LEVELS[openLevelNo - 1];
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
  // Bewegungsart aus dem Muster ableiten (ältere Spielstände kennen sie noch nicht)
  ed.move = moveFromProgram(ed.program) || ed.move || null;
  if (!ed.move) { ed.move = { type: 'gerade', size: 0, dir: 'R' }; ed.program = ['F']; }
  $('#ed-title').textContent = ctx.mode === 'free' ? 'Free play' : b ? 'Upgrade' : 'New bacterium';
  colony.sim = null;
  showTab('move');
  go('editor');
  renderEditor();
  renderMove();
}

onEnter.editor = () => { animator.start(); colony.start(); };
onLeave.editor = () => { animator.stop(); colony.stop(); };

// Lässt das Bakterium allein auf einer kleinen Platte wachsen, damit man die Ausbreitung sieht.
// Läuft in Schleife; jede Änderung im Editor startet sie sofort sichtbar neu.
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
      // kurzes Aufblitzen, damit man den Neustart erkennt
      const c = $('#ed-colony');
      c.classList.remove('fresh'); void c.offsetWidth; c.classList.add('fresh');
      this.changed = false;
    }
  },
  // nach Änderungen: kurz bündeln (z. B. beim Schieben eines Reglers), dann neu starten
  restart() {
    this.changed = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.build(), 150);
    $('#ed-colony-label').textContent = 'The colony · restarted';
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
        if (!this.changed) $('#ed-colony-label').textContent = `The colony · ${Math.round((BREW_HOURS * sim.tick) / MAX_TICKS)} h`;
      } else if (++this.hold > 90) {
        this.build(); // Schleife: von vorn beginnen
      }
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
  colony.restart();
}

function renderMove() {
  const lim = edCtx.limits;
  const cur = ed.move;
  // Karten der Bewegungsarten (gesperrte nur als kurzer Hinweis)
  const cards = MOVES.map((m) => {
    const sizes = m.sizes ? m.sizes.length : 1;
    let firstOk = -1;
    for (let k = 0; k < sizes; k++) if (compile({ type: m.key, size: k, dir: 'R' }, lim).program) { firstOk = k; break; }
    return { m, firstOk, res: compile({ type: m.key, size: 0, dir: 'R' }, lim) };
  });
  const lockedMoves = cards.filter((c) => c.firstOk < 0);
  fill($('#ed-moves'), ...cards.filter((c) => c.firstOk >= 0).map(({ m, firstOk }) => el('button', {
    class: `move-card ${cur.type === m.key ? 'on' : ''}`,
    onclick: () => { if (cur.type !== m.key) setMove({ type: m.key, size: firstOk, dir: cur.dir || 'R' }); },
  },
  icon(pathSvg(actionsOf({ type: m.key, size: firstOk, dir: 'R' })), 'move-pic'),
  el('span', { class: 'move-name' }, m.name))),
  lockedMoves.length ? el('button', {
    class: 'move-card locked',
    onclick: () => toast(`🔒 ${lockedMoves.map((c) => `${c.m.name} (Level ${lockReason(c.res)})`).join(', ')}`),
  }, el('span', { class: 'move-more' }, `🔒 +${lockedMoves.length}`), el('span', { class: 'move-name' }, 'later')) : null);

  // Größe und Richtung der gewählten Art
  const m = MOVE_BY_KEY[cur.type];
  const opts = [];
  if (m.sizes) {
    opts.push(el('div', { class: 'seg grow' }, m.sizes.map((label, k) => {
      const r = compile({ ...cur, size: k }, lim);
      return el('button', {
        class: `${cur.size === k ? 'on' : ''} ${r.program ? '' : 'locked'}`,
        onclick: () => setMove({ ...cur, size: k }),
      }, r.program ? label : `🔒 ${label}`);
    })));
  }
  if (m.turn) {
    opts.push(el('button', {
      class: 'btn small dir-btn', 'aria-label': 'Richtung wechseln',
      onclick: () => setMove({ ...cur, dir: cur.dir === 'L' ? 'R' : 'L' }),
    }, cur.dir === 'L' ? '↺' : '↻'));
  }
  fill($('#ed-move-opts'), ...opts);
  renderEnergy(energyProfile(normalize(ed)));
  fill($('#ed-meters'), meterBars(normalize(ed)));
  animator.setProgram(ed.program, ed.color);
}

function renderEditor() {
  const lim = edCtx.limits;
  $('#ed-name').value = ed.name;
  fill($('#ed-colors'), ...PALETTE.map((c) => el('button', {
    class: `swatch ${ed.color === c ? 'on' : ''}`, style: `background:${c}`, 'aria-label': c,
    onclick: () => { ed.color = c; renderEditor(); animator.setProgram(ed.program, ed.color); },
  })));

  // Kostenlose Abwägungen
  const ep = energyProfile(normalize(ed));
  fill($('#ed-free'), ...FREE.map((t) => el('div', { class: 'trait' },
    el('div', { class: 'trait-head' }, el('span', { class: 'trait-name' }, icon(TRAIT_ICONS[t.key], 'ti'), el('b', {}, t.label))),
    el('div', { class: 'seg free-seg' }, t.options.map((label, k) => el('button', {
      class: ed[t.key] === k ? 'on' : '', onclick: () => { ed[t.key] = k; renderEditor(); },
    }, label))))));
  renderEnergy(ep);
  fill($('#ed-meters'), meterBars(normalize(ed)));

  // Eigenschaften mit Punktekosten
  const budget = edCtx.budget;
  const c = cost(ed);
  fill($('#ed-costed'), ...COSTED.map((t) => {
    const pips = [];
    for (let k = 0; k < t.max; k++) pips.push(el('i', { class: k < ed[t.key] ? 'on' : '' }));
    return el('div', { class: 'trait' },
      el('div', { class: 'trait-head' },
        el('span', { class: 'trait-name' }, icon(TRAIT_ICONS[t.key], 'ti'), el('b', {}, t.label)),
        el('div', { class: 'stepper' },
          el('button', { onclick: () => { if (ed[t.key] > 0) { ed[t.key]--; renderEditor(); } }, 'aria-label': 'less' }, '−'),
          el('div', { class: 'pips' }, pips),
          el('button', {
            onclick: () => {
              if (ed[t.key] >= t.max) return;
              if (cost(ed) + 1 > budget) return toast('No points left. Beat opponents to earn more.');
              ed[t.key]++; renderEditor();
            },
            'aria-label': 'more',
          }, '+'))));
  }));

  // Spezialfähigkeit als Kacheln mit Symbol (gesperrte nur als kurzer Hinweis)
  const lockedSp = SPECIAL_KEYS.filter((k) => !lim.specials.has(k));
  fill($('#ed-specials'), ...SPECIAL_KEYS.filter((k) => lim.specials.has(k)).map((k) => el('button', {
    class: `special ${ed.special === k ? 'on' : ''}`,
    onclick: () => {
      const extra = SPECIALS[k].cost - SPECIALS[ed.special].cost;
      if (cost(ed) + extra > budget) return toast(`${SPECIALS[k].name} costs ${SPECIALS[k].cost} points – take points away elsewhere first.`);
      ed.special = k; renderEditor();
    },
  },
  specialBadge(k, 'big'),
  el('span', { class: 'special-name' }, SPECIALS[k].name))),
  lockedSp.length ? el('button', {
    class: 'special locked',
    onclick: () => toast(`🔒 ${lockedSp.map((k) => `${SPECIALS[k].name} (Level ${unlockLevelOf('special', k)})`).join(', ')}`),
  }, el('span', { class: 'move-more' }, `🔒 +${lockedSp.length}`), el('span', { class: 'special-name' }, 'later')) : null);
  $('#ed-special-hint').hidden = ed.special === 'none';
  fill($('#ed-special-hint'), el('b', {}, `${SPECIALS[ed.special].name}: `), SPECIALS[ed.special].hint);

  // Budget
  $('#ed-cost').textContent = `${c} / ${budget}`;
  $('#ed-left').textContent = c <= budget ? `${budget - c} ${budget - c === 1 ? 'point' : 'points'} left` : `${c - budget} too many`;
  if (animator.div !== ed.division) { animator.div = ed.division; animator.setDivision(ed.division); }
  $('#ed-budget-label').textContent = edCtx.mode === 'free' ? 'Points (free play)' : 'Upgrade points';
  $('#ed-meter').style.width = `${Math.min(100, (c / budget) * 100)}%`;
  const over = c > budget;
  $('#ed-budget').classList.toggle('over', over);
  const warn = $('#ed-warn');
  warn.hidden = !over && c >= budget;
  if (over) warn.textContent = `${c - budget} points too many – take some away.`;
  else if (c < budget) warn.textContent = `${budget - c} ${budget - c === 1 ? 'point' : 'points'} left to spend.`;
  warn.classList.toggle('ok', !over);
  colony.restart();
}

// Editor tabs: one section at a time, the previews stay visible above
function showTab(tab, screen = 'editor') {
  document.querySelectorAll(`#${screen} .tabs button`).forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll(`#${screen} .pane`).forEach((p) => { p.hidden = p.dataset.pane !== tab; });
  // the chart needs a visible canvas to know its width
  if (screen === 'result' && tab === 'history' && run.sim) drawHistory($('#rs-chart'), run.sim.history, run.genomes.map((g) => g.color));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.tabs button[data-tab]');
  if (b) { showTab(b.dataset.tab, b.closest('.screen').id); play('tap'); }
});

$('#ed-name').addEventListener('input', (e) => { ed.name = e.target.value; });
$('#ed-dice').addEventListener('click', () => {
  ed.name = randomName(makeRng(randomSeed()));
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
  const saved = store.saveBacterium(ed);
  toast(`“${saved.name}” saved.`);
  careerId = saved.id;
  go(edCtx.returnTo === 'home' || edCtx.returnTo === 'careers' ? 'career' : edCtx.returnTo);
});

// Energiebilanz im Editor: Verbrauch (Grundumsatz + Bewegung) gegen Aufnahme bei voller Nahrung
const perHour = (x) => Math.round(x * ROUNDS_PER_HOUR);
function fmtDuration(rounds) {
  if (!Number.isFinite(rounds)) return 'unbegrenzt';
  const min = (rounds * 60) / ROUNDS_PER_HOUR;
  return min < 60 ? `${Math.max(1, Math.round(min))} min` : `${(min / 60).toFixed(1)} h`;
}
function renderEnergy(ep) {
  const net = perHour(ep.intake - ep.cost);
  fill($('#ed-energy'),
    el('span', { class: 'echip', title: 'Energy per hour with plenty of food (intake minus use, incl. movement)' },
      '⚡ ', el('b', { class: net >= 0 ? 'good' : 'bad' }, `${net >= 0 ? '+' : ''}${net}`), ' /h'),
    el('span', { class: 'echip', title: 'With plenty of food a cell divides about this often' }, '➗ every ', el('b', {}, fmtDuration(ep.roundsToDivide))),
    el('span', { class: 'echip', title: 'How long a cell survives without food' }, '🍽 ', el('b', {}, fmtDuration(Math.min(ep.roundsWithoutFood, ep.maxAge))), ' without food'));
}

// ---------- Freies Spiel ----------
const freeLimits = () => getLimits(store.globalWon());
const freeCtx = () => ({ mode: 'free', budget: store.getSettings().budget, limits: freeLimits(), returnTo: 'setup' });

// Settings as a compact list: tap a row to cycle through its values
function segOption(label, key, values, labels, icon = '') {
  const cur = store.getSettings()[key];
  const next = values[(values.indexOf(cur) + 1) % values.length];
  return el('button', {
    class: 'set-row',
    onclick: () => { store.updateSettings({ [key]: next }); play('tap'); onEnter.setup(); },
  }, el('span', { class: 'set-label' }, icon ? `${icon} ` : '', label), el('span', { class: 'set-value' }, labels[cur] ?? String(cur), el('i', {}, '›')));
}

function stepperOption(label, key, min, max, step, fmt = (v) => v, icon = '') {
  const s = store.getSettings();
  const set = (v) => { store.updateSettings({ [key]: Math.max(min, Math.min(max, v)) }); onEnter.setup(); };
  return el('div', { class: 'set-row' }, el('span', { class: 'set-label' }, icon ? `${icon} ` : '', label),
    el('div', { class: 'stepper' },
      el('button', { onclick: () => set(s[key] - step), 'aria-label': 'less' }, '−'),
      el('b', { class: 'set-num' }, fmt(s[key])),
      el('button', { onclick: () => set(s[key] + step), 'aria-label': 'more' }, '+')));
}

onEnter.setup = () => {
  const s = store.getSettings();
  const g = store.getFree();
  const me = $('#su-me');
  if (!g) {
    fill(me, el('h3', {}, 'Your bacterium'),
      el('p', { class: 'small muted' }, 'Free play has its own bacterium. You can spend all points right away.'),
      el('button', { class: 'btn primary', onclick: () => openEditor(null, freeCtx()) }, 'Create bacterium'));
    $('#su-start').disabled = true;
  } else {
    const probs = problems(g, freeLimits(), s.budget);
    fill(me, el('h3', {}, 'Your bacterium'),
      el('div', { class: 'title row gap' }, el('span', { class: 'dot', style: `background:${g.color}` }), el('b', {}, g.name), el('span', { class: 'cost' }, `${cost(g)} / ${s.budget} Pkt`)),
      meterBars(normalize(g)),
      probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
      el('button', { class: 'btn small', onclick: () => openEditor(g, freeCtx()) }, 'Edit'));
    $('#su-start').disabled = probs.length > 0;
  }
  fill($('#su-options'), 
    el('h3', {}, 'Settings'),
    stepperOption('Opponents', 'opponents', 1, 5, 1, (v) => v, '🦠'),
    stepperOption('Points', 'budget', MIN_BUDGET, MAX_BUDGET, 1, (v) => v, '⭐'),
    segOption('Plate size', 'size', ['klein', 'mittel', 'gross'], LABELS.size, '🧫'),
    segOption('Food layout', 'distribution', DISTRIBUTIONS, LABELS.distribution, '🍯'),
    segOption('Food amount', 'amount', ['wenig', 'normal', 'viel'], LABELS.amount, '🥣'),
    segOption('Regrowth', 'regen', ['aus', 'langsam', 'normal', 'schnell'], LABELS.regen, '🔁'),
    el('p', { class: 'small muted' }, 'Special abilities and special movements are unlocked in your career – for you and the random opponents.'),
  );
};

function randomOpponents(n, budget, playerColor, seed) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const colors = PALETTE.filter((c) => c !== playerColor);
  const lim = freeLimits();
  return Array.from({ length: n }, (_, k) => ({
    ...randomGenome(rng, budget, lim), name: randomName(rng), color: colors[k % colors.length],
  }));
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

// Live-Ereignisse während der Simulation (Banner über der Platte)
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
  banners.timer = setTimeout(() => { b.classList.remove('show'); banners.timer = setTimeout(nextBanner, 250); }, 1900);
}
function resetBanners() {
  clearTimeout(banners.timer);
  banners.queue = []; banners.timer = 0;
  $('#sim-banner').className = 'banner';
}

function checkEvents() {
  const sim = run.sim, ev = run.ev;
  const names = run.genomes.map((g, i) => (i === 0 ? 'Your culture' : g.name));
  if (!ev.contact && sim.contactTick >= 0) { ev.contact = true; banner('⚔️ First contact – the fight begins!'); play('contact'); }
  sim.players.forEach((p, i) => {
    if (p.count === 0 && !ev.dead.has(i)) {
      ev.dead.add(i);
      if (!sim.done || sim.players.length > 2) {
        banner(i === 0 ? '☠️ Your culture died out!' : `☠️ ${names[i]} wiped out!`, i === 0 ? 'bad' : 'good');
        play('extinct');
      }
    }
  });
  const alive = sim.players.filter((p) => p.count > 0).sort((a, b) => b.count - a.count);
  if (alive.length >= 2 && sim.tick > 150) {
    const lead = alive[0];
    if (ev.leader !== lead.id && lead.share - alive[1].share > 0.06 && sim.tick - ev.leaderTick > 150) {
      if (ev.leader) {
        banner(lead.id === 1 ? '🔄 Turning point! You take the lead!' : `🔄 Turning point! ${names[lead.id - 1]} takes the lead`, lead.id === 1 ? 'good' : '');
        play('lead');
      }
      ev.leader = lead.id; ev.leaderTick = sim.tick;
    }
    // Knappes Rennen kurz vor Schluss: Zeitlupe
    // (3 h Brutzeit = 250 Simulationsschritte)
    if (!ev.slow && sim.tick >= MAX_TICKS - 250 && alive[0].share - alive[1].share < 0.12) {
      ev.slow = true; banner('🎬 Close race – slow motion!'); play('alarm');
    }
  }
  if (!ev.sixH && sim.tick >= MAX_TICKS - 500) { ev.sixH = true; banner('⏰ 6 hours of incubation left!'); play('alarm'); }
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
  run.r = new PlateRenderer($('#plate'), run.sim);
  run.paused = false;
  run.acc = 0;
  run.last = 0;
  run.ev = { contact: false, dead: new Set(), leader: 0, leaderTick: -999, slow: false, sixH: false };
  resetBanners();
  clearTimeout(run.endTimer);
  $('#sim-pause').textContent = '⏸';
  $('#sim-title').textContent = cfg.mode === 'level' ? `Level ${cfg.level}` : 'Free play';
  fill($('#sim-shares'), ...run.genomes.map((g) => el('div', { style: `background:${g.color}` })));
  fill($('#sim-legend'), ...run.genomes.map((g, i) => el('div', { class: 'legend-row' },
    el('span', { class: 'dot', style: `background:${g.color}` }),
    el('span', { class: 'legend-name' }, i === 0 ? el('b', {}, `${g.name} (you)`) : g.boss ? el('span', {}, '★ ', g.name) : g.name),
    ...specialsOf(g).map((k) => specialBadge(k, 'sm')),
    el('span', { class: 'n' }, '0'))));
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
  document.querySelectorAll('#sim-speed button').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === v));
}

const fmtHours = (h) => {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${hh}:${String(mm).padStart(2, '0')} h`;
};

function updateSimUi() {
  const sim = run.sim;
  const total = sim.players.reduce((s, p) => s + p.count, 0) || 1;
  const bars = $('#sim-shares').children;
  const rows = $('#sim-legend').children;
  sim.players.forEach((p, i) => {
    const pc = (p.count / total) * 100;
    bars[i].style.width = `${pc}%`;
    bars[i].textContent = pc >= 9 ? `${Math.round(pc)}%` : '';
    rows[i].querySelector('.n').textContent = p.count.toLocaleString('en-US');
    rows[i].classList.toggle('dead', p.count === 0);
  });
  // ablaufende Uhr
  const frac = Math.min(1, sim.tick / MAX_TICKS);
  $('#clock-arc').setAttribute('stroke-dashoffset', String(100.5 * frac));
  $('#clock-hand').setAttribute('transform', `rotate(${frac * 360} 20 20)`);
  $('#clock-left').textContent = fmtHours(BREW_HOURS * (1 - frac));
  $('#clock-elapsed').textContent = `${Math.floor(BREW_HOURS * frac)} / ${BREW_HOURS} h`;
  $('#clock-left').classList.toggle('urgent', frac > 0.85);
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
$('#sim-pause').addEventListener('click', () => {
  run.paused = !run.paused;
  $('#sim-pause').textContent = run.paused ? '▶' : '⏸';
  if (run.paused) stopMusic(); else if (musicOn()) startMusic();
});
$('#sim-quit').addEventListener('click', async () => {
  const wasPaused = run.paused;
  run.paused = true;
  if (run.sim.done || await confirmDialog('Quit simulation?', 'The current game will be cancelled.', 'Quit')) {
    clearTimeout(run.endTimer);
    go(run.cfg.mode === 'level' ? 'level-detail' : 'setup');
  } else run.paused = wasPaused;
});
onLeave.sim = () => { cancelAnimationFrame(run.raf); stopMusic(); };
document.addEventListener('visibilitychange', () => { run.last = 0; demo.last = 0; });

// ---------- Ergebnis ----------
function showResult() {
  if (current !== 'sim') return;
  const { sim, cfg } = run;
  const won = sim.winner === 1;
  const title = $('#rs-title');
  title.textContent = won ? 'Victory!' : sim.winner === 0 ? 'Draw' : 'Defeat';
  title.className = won ? 'win' : sim.winner === 0 ? '' : 'lose';
  const winnerName = sim.winner ? run.genomes[sim.winner - 1].name : null;
  const hours = Math.round((BREW_HOURS * sim.tick) / MAX_TICKS);
  $('#rs-reason').textContent = `${sim.endReason}${winnerName && !won ? ` Winner: ${winnerName}.` : ''} (after ${hours} h of incubation)`;

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
  // average share of all cells over the whole game (the final share is often just 100 %)
  const avg = sim.players.map((_, i) => sim.history.reduce((a, h) => a + (h[i] / (h.reduce((x, y) => x + y, 0) || 1)), 0) / (sim.history.length || 1));
  const total = avg.reduce((a, b) => a + b, 0) || 1;
  fill($('#rs-shares'), ...sim.players.map((p, i) => {
    const pc = (avg[i] / total) * 100;
    return el('div', { style: `background:${run.genomes[i].color};width:${pc}%` }, pc >= 9 ? `${Math.round(pc)}%` : '');
  }));
  const rc = $('#rs-plate');
  rc.width = sim.N; rc.height = sim.N;
  rc.getContext('2d').drawImage($('#plate'), 0, 0);
  drawHistory($('#rs-chart'), sim.history, run.genomes.map((g) => g.color));

  const rows = sim.players.map((p, i) => {
    const g = run.genomes[i];
    const status = sim.winner === p.id ? '🏆' : p.count === 0 ? `✝ ${Math.round((BREW_HOURS * p.extinctAt) / MAX_TICKS)} h` : 'alive';
    return el('tr', {},
      el('td', {}, el('span', { class: 'dot', style: `background:${g.color};vertical-align:-2px;margin-right:6px` }), i === 0 ? el('b', {}, g.name) : g.name),
      el('td', { class: 'num' }, p.count.toLocaleString('en-US')),
      el('td', { class: 'num' }, p.peak.toLocaleString('en-US')),
      el('td', { class: 'num' }, p.kills.toLocaleString('en-US')),
      el('td', { class: 'num' }, status));
  });
  fill($('#rs-table'), el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Culture'), el('th', { class: 'num' }, 'End'), el('th', { class: 'num' }, 'Max.'), el('th', { class: 'num' }, 'Kills'), el('th', { class: 'num' }, 'Status'))),
    el('tbody', {}, rows)));

  // Sterne
  const sb = $('#rs-stars');
  sb.hidden = cfg.mode !== 'level';
  if (cfg.mode === 'level') {
    const all = store.getBacterium(cfg.careerId)?.career.stars[cfg.level] || mask;
    fill(sb, ...STAR_GOALS.map((g) => el('div', { class: 'star-col', title: g.text },
      el('span', { class: `big-star ${mask & g.bit ? 'got' : all & g.bit ? 'old' : ''} ${newStars & g.bit ? 'new' : ''}` }, mask & g.bit || all & g.bit ? '★' : '☆'),
      el('small', {}, `${g.icon} ${g.short}`))));
    if (newStars && (all & 7) === 7) toast('All three stars! +1 upgrade point');
  }
  // Analyse
  fill($('#rs-analysis'), el('h3', {}, won ? 'Summary' : 'What went wrong?'), ...analyze(sim, run.genomes, mask).map((a) =>
    el('div', { class: `insight ${a.kind}` }, el('span', { class: 'insight-ico' }, a.kind === 'tip' ? '💡' : a.kind === 'good' ? '👍' : '📊'), a.text)));
  // neue Erfolge & Atlas
  const ach = $('#rs-achievements');
  ach.hidden = !newAch.length && !newGerms.length;
  fill(ach, el('h3', {}, 'Newly unlocked'),
    ...newAch.map((a) => el('div', { class: 'ach-row got' }, el('span', { class: 'ach-ico' }, a.icon), el('div', {}, el('b', {}, a.name), el('div', { class: 'small muted' }, a.desc)))),
    newGerms.length ? el('div', { class: 'ach-row got' }, el('span', { class: 'ach-ico' }, '📖'), el('div', {}, el('b', {}, 'New in the atlas'), el('div', { class: 'small muted' }, newGerms.map((k) => GERMS[k].name).join(', ')))) : null);

  const lvMode = cfg.mode === 'level';
  $('#rs-next').hidden = !(lvMode && won && cfg.level < LEVELS.length);
  $('#rs-upgrade').hidden = !lvMode;
  $('#rs-new').hidden = lvMode;
  $('#rs-rematch').textContent = lvMode ? '↻ Again' : '↻ Rematch';
  showTab('summary', 'result');
  play(won ? 'win' : 'lose');
  if (newStars) setTimeout(() => play('star'), 700);
  if (firstWin) showWinModal(cfg.level);
}

function showWinModal(level) {
  const lv = LEVELS[level - 1];
  const germ = GERMS[lv.boss.germ];
  fill($('#win-sub'), 'You beat ', el('b', {}, germ.name), ` and cleared level ${level}!`);
  const pic = $('#win-germ');
  pic.innerHTML = germSvg(germ.shape, lv.boss.color);
  $('#win-fact').textContent = germ.fact;
  fill($('#win-rewards'), ...rewardRows(level, true));
  $('#win-modal').hidden = false;
  $('#win-modal').scrollTop = 0;
  document.body.classList.add('modal-open');
  setTimeout(() => play('unlock'), 400);
}

// ---------- Atlas & Erfolge ----------
// alle Keime in der Reihenfolge ihres ersten Auftretens
function atlasGerms() {
  const seen = [];
  LEVELS.forEach((lv, i) => levelOpponents(lv).forEach((o) => { if (!seen.find((x) => x.germ === o.germ)) seen.push({ germ: o.germ, color: o.color, level: i + 1, boss: o.boss, ability: o.boss ? rewardsOf(i + 1) : [] }); }));
  return seen;
}

onEnter.atlas = () => {
  const found = new Set(store.getAtlas());
  const list = atlasGerms();
  $('#atlas-count').textContent = `${list.filter((g) => found.has(g.germ)).length} of ${list.length} germs discovered`;
  fill($('#atlas-list'), ...list.map((g) => {
    const known = found.has(g.germ);
    const germ = GERMS[g.germ];
    return el('div', { class: `atlas-card ${known ? '' : 'unknown'}` },
      germPic(g.germ, known ? g.color : '#3a4554', 'atlas-pic'),
      el('div', { class: 'atlas-text' },
        el('b', {}, known ? germ.name : '???'),
        known ? el('p', { class: 'small' }, germ.fact) : el('p', { class: 'small muted' }, `Beat level ${g.level} to discover this germ.`),
        known && g.ability.length ? el('p', { class: 'small atlas-ability' }, 'Unlocks: ', g.ability.map((r) => r.text).join(', ')) : null));
  }));
  const got = ACHIEVEMENTS.filter((a) => store.hasAchievement(a.key)).length;
  $('#ach-count').textContent = `${got} of ${ACHIEVEMENTS.length} achievements`;
  fill($('#ach-list'), ...ACHIEVEMENTS.map((a) => {
    const has = store.hasAchievement(a.key);
    return el('div', { class: `ach-row ${has ? 'got' : ''}` }, el('span', { class: 'ach-ico' }, has ? a.icon : '🔒'), el('div', {}, el('b', {}, a.name), el('div', { class: 'small muted' }, a.desc)));
  }));
};
// Schließen per Knopf oder Tipp daneben. touchend zusätzlich, weil iOS-In-App-Browser
// Klicks auf feststehenden Ebenen manchmal verschlucken.
function closeWin(e) {
  if (e && e.target.closest('.modal-box') && !e.target.closest('#win-ok')) return;
  if (e && e.type === 'touchend') e.preventDefault();
  $('#win-modal').hidden = true;
  document.body.classList.remove('modal-open');
}
$('#win-modal').addEventListener('click', closeWin);
$('#win-ok').addEventListener('touchend', closeWin);
// Diagramm neu zeichnen, sobald die Details aufgeklappt werden (vorher hat es keine Breite)

$('#rs-back').addEventListener('click', () => go(run.cfg.mode === 'level' ? 'career' : 'setup'));
$('#rs-rematch').addEventListener('click', () => {
  const cfg = run.cfg;
  if (cfg.mode === 'level') {
    const b = store.getBacterium(cfg.careerId);
    if (!b) return go('careers');
    const probs = problems(b, getLimits(b.career.won), ptsOf(b));
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
  if (b) openEditor(b, careerCtx(b, 'career'));
});

// ---------- Start ----------
// Atlas nachtragen: Keime aus bereits gewonnenen Leveln gelten als entdeckt
store.discover(store.globalWon().filter((n) => LEVELS[n - 1]).flatMap((n) => levelOpponents(LEVELS[n - 1]).map((o) => o.germ)));
refreshSoundButtons();
refreshMusicButtons();
go('home');

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
