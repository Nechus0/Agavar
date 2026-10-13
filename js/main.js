// Oberfläche: Bildschirme, Karriere, Editor, Spielablauf.
import {
  COSTED, FREE, SPECIALS, SPECIAL_KEYS, PALETTE,
  MIN_BUDGET, MAX_BUDGET, defaultGenome, cost, normalize, randomGenome, specialsOf,
} from './genome.js';
import { Simulation, DISTRIBUTIONS, MAX_TICKS } from './sim.js';
import { PlateRenderer, drawHistory, PathAnimator } from './render.js';
import { makeRng, randomSeed } from './rng.js';
import { randomName } from './names.js';
import { LEVELS, levelOpponents } from './levels.js';
import { GERMS, germSvg } from './germs.js';
import {
  getLimits, unlockLevelOf, rewardsOf, problems, careerPoints, nextLevel, START_POINTS, POINTS_PER_WIN,
} from './progression.js';
import { SPECIAL_ICONS, SPECIAL_COLORS, TRAIT_ICONS, LOCK_ICON, UNLOCK_ICON } from './icons.js';
import { MOVES, MOVE_BY_KEY, actionsOf, compile, moveFromProgram, describeMove, pathSvg } from './movement.js';
import * as store from './storage.js';

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
const traitRow = (g) => el('div', { class: 'trait-row' }, COSTED.map((t) =>
  el('span', { class: 'tchip', title: t.label }, icon(TRAIT_ICONS[t.key], 'xs'), String(g[t.key]))));

const LABELS = {
  size: { klein: 'Klein', mittel: 'Mittel', gross: 'Groß' },
  distribution: { gleichmaessig: 'Gleichmäßig', flecken: 'Flecken', ring: 'Ring', zentrum: 'Zentrum', rauschen: 'Rauschen' },
  amount: { wenig: 'Wenig', normal: 'Normal', viel: 'Viel' },
  regen: { aus: 'Aus', langsam: 'Langsam', normal: 'Normal', schnell: 'Schnell' },
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

function confirmDialog(title, text, yes = 'Ja') {
  return new Promise((resolve) => {
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    const done = (v) => { $('#modal').hidden = true; resolve(v); };
    fill($('#modal-buttons'), 
      el('button', { class: 'btn', onclick: () => done(false) }, 'Abbrechen'),
      el('button', { class: 'btn primary', onclick: () => done(true) }, yes));
    $('#modal').hidden = false;
  });
}

const lockedToast = (level) => toast(`🔒 Wird freigeschaltet, wenn du Level ${level} gewinnst.`);

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
const careerCtx = (b, returnTo = 'career') => ({
  mode: 'career', id: b.id, budget: careerPoints(b.career.won), limits: getLimits(b.career.won),
  label: 'Ausbaupunkte', returnTo,
});
const careerNewCtx = (returnTo = 'careers') => ({
  mode: 'career', id: null, budget: START_POINTS, limits: getLimits([]), label: 'Ausbaupunkte', returnTo,
});

function levelBadge(b) {
  const n = nextLevel(b.career.won, LEVELS.length);
  return n > LEVELS.length ? '🏆 Meister' : `Level ${n} von ${LEVELS.length}`;
}

onEnter.careers = () => {
  const list = store.getBacteria();
  fill($('#career-list'), ...(list.length ? list.map((b) => {
    const pts = careerPoints(b.career.won);
    const free = pts - cost(b);
    return el('button', { class: 'lab-item career-item', onclick: () => openCareer(b.id) },
      el('div', { class: 'title' },
        el('span', { class: 'dot', style: `background:${b.color}` }),
        el('b', {}, b.name),
        el('span', { class: 'cost' }, levelBadge(b))),
      el('div', { class: 'stats' }, moveChip(b), b.special !== 'none' ? specialTag(b.special) : null),
      traitRow(b),
      el('div', { class: 'small muted' }, `${cost(b)} von ${pts} Ausbaupunkten verteilt`, free > 0 ? el('span', { class: 'free-pts' }, ` · ${free} frei!`) : null));
  }) : [el('div', { class: 'empty' }, 'Noch kein Bakterium. Erstelle dein erstes!')]));
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
  const pts = careerPoints(won);
  const free = pts - cost(b);
  const lim = getLimits(won);
  const probs = problems(b, lim, pts);
  $('#cr-title').textContent = b.name;
  fill($('#cr-card'), 
    el('div', { class: 'title row gap' }, el('span', { class: 'dot big-dot', style: `background:${b.color}` }), el('b', { class: 'big-name' }, b.name), el('span', { class: 'cost' }, levelBadge(b))),
    el('div', { class: 'stats' }, moveChip(b), b.special !== 'none' ? specialTag(b.special) : null),
    traitRow(b),
    el('div', { class: `points-box ${free > 0 ? 'has-free' : ''}` },
      el('span', {}, el('b', {}, `${cost(b)} / ${pts}`), ' Ausbaupunkte verteilt'),
      free > 0 ? el('span', { class: 'free-pts' }, `${free} ${free === 1 ? 'Punkt' : 'Punkte'} frei!`) : null),
    probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
    el('button', { class: 'btn primary', onclick: () => openEditor(b, careerCtx(b)) }, 'Bakterium ausbauen'));

  const nxt = nextLevel(won, LEVELS.length);
  fill($('#cr-levels'), ...LEVELS.map((lv, i) => {
    const n = i + 1;
    const isWon = won.includes(n);
    const open = isWon || n === nxt;
    const boss = lv.boss;
    return el('button', {
      class: `level-row ${isWon ? 'won' : ''} ${n === nxt ? 'next' : ''} ${open ? '' : 'locked'}`,
      onclick: () => (open ? openLevel(n) : toast(`Gewinne zuerst Level ${n - 1}.`)),
    },
    el('span', { class: 'lv-state' }, isWon ? '✓' : n === nxt ? '▶' : '🔒'),
    germPic(boss.germ, boss.color, 'mini'),
    el('span', { class: 'lv-main' },
      el('b', {}, `${n}. ${lv.name}`),
      el('span', { class: 'small muted' }, GERMS[boss.germ].name)),
    el('span', { class: 'lv-rewards' }, rewardsOf(n).map((r) => rewardIcon(r))));
  }));
};

$('#cr-delete').addEventListener('click', async () => {
  const b = curCareer();
  if (b && await confirmDialog('Bakterium löschen?', `„${b.name}“ und seine Karriere werden endgültig gelöscht.`, 'Löschen')) {
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
  withPoints ? el('div', { class: 'reward' }, el('span', { class: 'plus' }, `+${POINTS_PER_WIN}`), 'Ausbaupunkte für dein Bakterium') : null,
  ...rewardsOf(level).map((r) => el('div', { class: 'reward' }, rewardIcon(r), r.text)),
].filter(Boolean);

// ---------- Leveldetails ----------
let openLevelNo = 1;

function opponentCard(o) {
  return el('div', { class: 'opp' },
    germPic(o.germ, o.color, 'mini'),
    el('div', {},
      el('b', {}, o.name),
      el('div', { class: 'stats' }, moveChip(o), ...specialsOf(o).map(specialTag)),
      traitRow(o)));
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
  fill($('#ld-desc'), el('b', {}, lv.name), el('br'), lv.desc);
  const rewards = rewardsOf(n);
  fill($('#ld-boss'), 
    el('div', { class: 'boss-label' }, '★ Besonderer Gegner'),
    germPic(boss.germ, boss.color, 'large'),
    el('h3', { class: 'boss-name' }, boss.name),
    el('div', { class: 'stats center-row' }, ...specialsOf(boss).map(specialTag), moveChip(boss)),
    traitRow(boss),
    rewards.length && !won.includes(n)
      ? el('p', { class: 'small boss-teaser' }, 'Besiege ihn, um freizuschalten: ', el('b', {}, rewards.map((r) => r.text).join(', ')))
      : null);
  $('#ld-others-card').hidden = !others.length;
  fill($('#ld-opponents'), ...others.map(opponentCard));
  const pl = lv.plate;
  $('#ld-plate').textContent = `Platte: ${LABELS.size[pl.size]} · Nährboden: ${LABELS.distribution[pl.distribution]}, ${LABELS.amount[pl.amount]}, Nachwachsen ${LABELS.regen[pl.regen].toLowerCase()}`;
  $('#ld-rewards-card').hidden = won.includes(n);
  fill($('#ld-rewards'), ...rewardRows(n, true));

  const pts = careerPoints(won);
  const probs = problems(b, getLimits(won), pts);
  fill($('#ld-me'), 
    el('h3', {}, 'Dein Bakterium'),
    el('div', { class: 'title row gap' }, el('span', { class: 'dot', style: `background:${b.color}` }), el('b', {}, b.name), el('span', { class: 'cost' }, `${cost(b)} / ${pts} Pkt`)),
    el('div', { class: 'stats' }, moveChip(b), b.special !== 'none' ? specialTag(b.special) : null),
    traitRow(b),
    probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
    pts - cost(b) > 0 ? el('p', { class: 'small free-pts' }, `Du hast noch ${pts - cost(b)} ${pts - cost(b) === 1 ? 'Punkt' : 'Punkte'} frei!`) : null,
    el('button', { class: 'btn small', onclick: () => openEditor(b, careerCtx(b, 'level-detail')) }, 'Ausbauen'));
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
const animator = new PathAnimator($('#ed-preview'), null);

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
  $('#ed-title').textContent = ctx.mode === 'free' ? 'Freies Spiel' : b ? 'Ausbauen' : 'Neues Bakterium';
  go('editor');
  renderEditor();
  renderMove();
}

onEnter.editor = () => { animator.start(); colony.start(); };
onLeave.editor = () => { animator.stop(); colony.stop(); };

// Lässt das Bakterium allein auf einer kleinen Platte wachsen, damit man die Ausbreitung sieht.
const colony = {
  sim: null, r: null, raf: 0, hold: 0, timer: 0,
  restart() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const g = normalize({ ...ed, name: ed.name || 'Bakterium' });
      this.sim = new Simulation({ genomes: [g], size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal', seed: 4242 });
      this.r = new PlateRenderer($('#ed-colony'), this.sim);
      this.hold = 0;
      this.r.draw();
    }, 120);
  },
  start() {
    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const sim = this.sim;
      if (!sim) return;
      if (sim.tick < 420 && !sim.done) {
        sim.step1(); sim.step1();
        this.r.draw();
        $('#ed-colony-label').textContent = `Die Kolonie · ${Math.round((BREW_HOURS * sim.tick) / MAX_TICKS)} h`;
      } else if (++this.hold > 90) this.restart();
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
  // Karten der Bewegungsarten
  fill($('#ed-moves'), ...MOVES.map((m) => {
    const sizes = m.sizes ? m.sizes.length : 1;
    let firstOk = -1;
    for (let k = 0; k < sizes; k++) if (compile({ type: m.key, size: k, dir: 'R' }, lim).program) { firstOk = k; break; }
    const locked = firstOk < 0;
    const res = compile({ type: m.key, size: 0, dir: 'R' }, lim);
    return el('button', {
      class: `move-card ${cur.type === m.key ? 'on' : ''} ${locked ? 'locked' : ''}`,
      onclick: () => {
        if (locked) return lockedToast(lockReason(res));
        if (cur.type === m.key) return;
        setMove({ type: m.key, size: firstOk, dir: cur.dir || 'R' });
      },
    },
    icon(pathSvg(actionsOf({ type: m.key, size: Math.max(0, firstOk), dir: 'R' })), 'move-pic'),
    el('span', { class: 'move-name' }, m.name),
    locked ? el('span', { class: 'move-lock' }, `🔒 Level ${lockReason(res)}`) : null);
  }));

  // Größe und Richtung der gewählten Art
  const m = MOVE_BY_KEY[cur.type];
  const opts = [];
  if (m.sizes) {
    opts.push(el('div', { class: 'opt' }, el('span', {}, m.key === 'sitzen' ? 'Aktivität' : 'Größe'),
      el('div', { class: 'seg' }, m.sizes.map((label, k) => {
        const r = compile({ ...cur, size: k }, lim);
        return el('button', {
          class: `${cur.size === k ? 'on' : ''} ${r.program ? '' : 'locked'}`,
          onclick: () => setMove({ ...cur, size: k }),
        }, r.program ? label : `🔒 ${label}`);
      }))));
  }
  if (m.turn) {
    opts.push(el('div', { class: 'opt' }, el('span', {}, 'Richtung'),
      el('div', { class: 'seg' },
        el('button', { class: cur.dir !== 'L' ? 'on' : '', onclick: () => setMove({ ...cur, dir: 'R' }) }, '↻ rechts herum'),
        el('button', { class: cur.dir === 'L' ? 'on' : '', onclick: () => setMove({ ...cur, dir: 'L' }) }, '↺ links herum'))));
  }
  fill($('#ed-move-opts'), ...opts);
  fill($('#ed-move-desc'), el('b', {}, `${m.name}: `), m.desc);
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
  fill($('#ed-free'), ...FREE.map((t) => {
    const input = el('input', { type: 'range', min: 0, max: t.max, step: 1, value: ed[t.key] });
    input.addEventListener('input', () => { ed[t.key] = Number(input.value); colony.restart(); });
    return el('div', { class: 'trait' },
      el('div', { class: 'trait-head' }, el('span', { class: 'trait-name' }, icon(TRAIT_ICONS[t.key], 'ti'), el('b', {}, t.label))),
      el('div', { class: 'hint' }, t.hint),
      input,
      el('div', { class: 'range-labels' }, el('span', {}, t.low), el('span', {}, t.high)));
  }));

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
          el('button', { onclick: () => { if (ed[t.key] > 0) { ed[t.key]--; renderEditor(); } }, 'aria-label': 'weniger' }, '−'),
          el('div', { class: 'pips' }, pips),
          el('button', {
            onclick: () => {
              if (ed[t.key] >= t.max) return;
              if (cost(ed) + 1 > budget) return toast('Keine Punkte mehr frei. Besiege Gegner, um mehr zu bekommen.');
              ed[t.key]++; renderEditor();
            },
            'aria-label': 'mehr',
          }, '+'))),
      el('div', { class: 'hint' }, t.hint));
  }));

  // Spezialfähigkeit als Kacheln mit Symbol
  fill($('#ed-specials'), ...SPECIAL_KEYS.map((k) => {
    const locked = !lim.specials.has(k);
    return el('button', {
      class: `special ${ed.special === k ? 'on' : ''} ${locked ? 'locked' : ''}`,
      onclick: () => {
        if (locked) return lockedToast(unlockLevelOf('special', k));
        const extra = SPECIALS[k].cost - SPECIALS[ed.special].cost;
        if (cost(ed) + extra > budget) return toast(`${SPECIALS[k].name} kostet ${SPECIALS[k].cost} Punkte – nimm dafür woanders Punkte weg.`);
        ed.special = k; renderEditor();
      },
    },
    specialBadge(k, 'big'),
    el('span', { class: 'special-name' }, SPECIALS[k].name),
    el('span', { class: 'special-cost' }, locked ? `🔒 Level ${unlockLevelOf('special', k)}` : `${SPECIALS[k].cost} Pkt`));
  }));
  fill($('#ed-special-hint'), el('b', {}, `${SPECIALS[ed.special].name}: `), SPECIALS[ed.special].hint);

  // Budget
  $('#ed-cost').textContent = `${c} / ${budget}`;
  $('#ed-budget-label').textContent = edCtx.mode === 'free' ? 'Punkte (freies Spiel)' : 'Ausbaupunkte';
  $('#ed-meter').style.width = `${Math.min(100, (c / budget) * 100)}%`;
  const over = c > budget;
  $('#ed-budget').classList.toggle('over', over);
  const warn = $('#ed-warn');
  warn.hidden = !over && c >= budget;
  if (over) warn.textContent = `${c - budget} Punkte zu viel – nimm Punkte weg.`;
  else if (c < budget) warn.textContent = `Noch ${budget - c} ${budget - c === 1 ? 'Punkt' : 'Punkte'} zu verteilen.`;
  warn.classList.toggle('ok', !over);
  colony.restart();
}

$('#ed-name').addEventListener('input', (e) => { ed.name = e.target.value; });
$('#ed-cancel').addEventListener('click', () => go(edCtx.returnTo));
$('#ed-save').addEventListener('click', () => {
  if (!ed.name.trim()) { $('#ed-name').focus(); return toast('Bitte gib deinem Bakterium einen Namen.'); }
  const probs = problems(ed, edCtx.limits, edCtx.budget);
  if (probs.length) return toast(probs.join(' · '));
  if (edCtx.mode === 'free') {
    store.saveFree(ed);
    toast('Gespeichert.');
    return go('setup');
  }
  const saved = store.saveBacterium(ed);
  toast(`„${saved.name}“ gespeichert.`);
  careerId = saved.id;
  go(edCtx.returnTo === 'home' || edCtx.returnTo === 'careers' ? 'career' : edCtx.returnTo);
});

// ---------- Freies Spiel ----------
const freeLimits = () => getLimits(store.globalWon());
const freeCtx = () => ({ mode: 'free', budget: store.getSettings().budget, limits: freeLimits(), returnTo: 'setup' });

function segOption(label, key, values, labels) {
  const s = store.getSettings();
  const seg = el('div', { class: 'seg' }, values.map((v) => el('button', {
    class: s[key] === v ? 'on' : '',
    onclick: () => { store.updateSettings({ [key]: v }); onEnter.setup(); },
  }, labels[v] ?? String(v))));
  return el('div', { class: 'opt' }, el('span', {}, label), seg);
}

function stepperOption(label, key, min, max, step, fmt = (v) => v) {
  const s = store.getSettings();
  const set = (v) => { store.updateSettings({ [key]: Math.max(min, Math.min(max, v)) }); onEnter.setup(); };
  return el('div', { class: 'opt' }, el('span', {}, label),
    el('div', { class: 'stepper' },
      el('button', { onclick: () => set(s[key] - step) }, '−'),
      el('b', { style: 'min-width:64px;text-align:center' }, fmt(s[key])),
      el('button', { onclick: () => set(s[key] + step) }, '+')));
}

onEnter.setup = () => {
  const s = store.getSettings();
  const g = store.getFree();
  const me = $('#su-me');
  if (!g) {
    fill(me, el('h3', {}, 'Dein Bakterium'),
      el('p', { class: 'small muted' }, 'Für das freie Spiel hast du ein eigenes Bakterium. Du kannst sofort alle Punkte verteilen.'),
      el('button', { class: 'btn primary', onclick: () => openEditor(null, freeCtx()) }, 'Bakterium erstellen'));
    $('#su-start').disabled = true;
  } else {
    const probs = problems(g, freeLimits(), s.budget);
    fill(me, el('h3', {}, 'Dein Bakterium'),
      el('div', { class: 'title row gap' }, el('span', { class: 'dot', style: `background:${g.color}` }), el('b', {}, g.name), el('span', { class: 'cost' }, `${cost(g)} / ${s.budget} Pkt`)),
      el('div', { class: 'stats' }, moveChip(g), g.special !== 'none' ? specialTag(g.special) : null),
      traitRow(g),
      probs.length ? el('p', { class: 'small warn' }, probs.join(' · ')) : null,
      el('button', { class: 'btn small', onclick: () => openEditor(g, freeCtx()) }, 'Bearbeiten'));
    $('#su-start').disabled = probs.length > 0;
  }
  fill($('#su-options'), 
    el('h3', {}, 'Einstellungen'),
    stepperOption('Anzahl Gegner', 'opponents', 1, 5, 1),
    stepperOption('Punktebudget (für dich und die Gegner)', 'budget', MIN_BUDGET, MAX_BUDGET, 1, (v) => `${v} Pkt`),
    segOption('Plattengröße', 'size', ['klein', 'mittel', 'gross'], LABELS.size),
    segOption('Nährboden-Verteilung', 'distribution', DISTRIBUTIONS, LABELS.distribution),
    segOption('Nährstoffmenge', 'amount', ['wenig', 'normal', 'viel'], LABELS.amount),
    segOption('Nachwachsen', 'regen', ['aus', 'langsam', 'normal', 'schnell'], LABELS.regen),
    el('p', { class: 'small muted' }, 'Spezialfähigkeiten und besondere Schritte schaltest du in der Karriere frei – für dich und die Zufallsgegner.'),
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
const run = { cfg: null, sim: null, r: null, raf: 0, speed: 1, paused: false, last: 0, acc: 0, frame: 0, endTimer: 0 };

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
  clearTimeout(run.endTimer);
  $('#sim-pause').textContent = '⏸';
  $('#sim-title').textContent = cfg.mode === 'level' ? `Level ${cfg.level}` : 'Freies Spiel';
  fill($('#sim-shares'), ...run.genomes.map((g) => el('div', { style: `background:${g.color}` })));
  fill($('#sim-legend'), ...run.genomes.map((g, i) => el('div', { class: 'legend-row' },
    el('span', { class: 'dot', style: `background:${g.color}` }),
    el('span', { class: 'legend-name' }, i === 0 ? el('b', {}, `${g.name} (du)`) : g.boss ? el('span', {}, '★ ', g.name) : g.name),
    ...specialsOf(g).map((k) => specialBadge(k, 'sm')),
    el('span', { class: 'n' }, '0'))));
  setSpeed(run.speed);
  go('sim');
  updateSimUi();
  run.r.draw();
  cancelAnimationFrame(run.raf);
  run.raf = requestAnimationFrame(simFrame);
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
    bars[i].style.width = `${(p.count / total) * 100}%`;
    rows[i].querySelector('.n').textContent = p.count.toLocaleString('de-DE');
    rows[i].classList.toggle('dead', p.count === 0);
  });
  // ablaufende Uhr
  const frac = Math.min(1, sim.tick / MAX_TICKS);
  $('#clock-arc').setAttribute('stroke-dashoffset', String(100.5 * frac));
  $('#clock-hand').setAttribute('transform', `rotate(${frac * 360} 20 20)`);
  $('#clock-left').textContent = fmtHours(BREW_HOURS * (1 - frac));
  $('#clock-elapsed').textContent = `${Math.floor(BREW_HOURS * frac)} / ${BREW_HOURS} h`;
  $('#clock-left').classList.toggle('urgent', frac > 0.85);
}

function simFrame(t) {
  run.raf = requestAnimationFrame(simFrame);
  const dt = Math.min(0.1, (t - (run.last || t)) / 1000);
  run.last = t;
  const sim = run.sim;
  if (!run.paused && !sim.done) {
    run.acc += dt * TICKS_PER_SECOND * run.speed;
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
});
$('#sim-quit').addEventListener('click', async () => {
  const wasPaused = run.paused;
  run.paused = true;
  if (run.sim.done || await confirmDialog('Simulation beenden?', 'Das laufende Spiel wird abgebrochen.', 'Beenden')) {
    clearTimeout(run.endTimer);
    go(run.cfg.mode === 'level' ? 'level-detail' : 'setup');
  } else run.paused = wasPaused;
});
onLeave.sim = () => cancelAnimationFrame(run.raf);
document.addEventListener('visibilitychange', () => { run.last = 0; demo.last = 0; });

// ---------- Ergebnis ----------
function showResult() {
  if (current !== 'sim') return;
  const { sim, cfg } = run;
  const won = sim.winner === 1;
  const title = $('#rs-title');
  title.textContent = won ? 'Gewonnen!' : sim.winner === 0 ? 'Unentschieden' : 'Verloren';
  title.className = won ? 'win' : sim.winner === 0 ? '' : 'lose';
  const winnerName = sim.winner ? run.genomes[sim.winner - 1].name : null;
  const hours = Math.round((BREW_HOURS * sim.tick) / MAX_TICKS);
  $('#rs-reason').textContent = `${sim.endReason}${winnerName && !won ? ` Sieger: ${winnerName}.` : ''} (nach ${hours} h Brutzeit)`;

  const firstWin = cfg.mode === 'level' && won && store.markWon(cfg.careerId, cfg.level);

  go('result');
  const rc = $('#rs-plate');
  rc.width = sim.N; rc.height = sim.N;
  rc.getContext('2d').drawImage($('#plate'), 0, 0);
  drawHistory($('#rs-chart'), sim.history, run.genomes.map((g) => g.color));

  const rows = sim.players.map((p, i) => {
    const g = run.genomes[i];
    const status = sim.winner === p.id ? '🏆' : p.count === 0 ? `✝ ${Math.round((BREW_HOURS * p.extinctAt) / MAX_TICKS)} h` : 'lebt';
    return el('tr', {},
      el('td', {}, el('span', { class: 'dot', style: `background:${g.color};vertical-align:-2px;margin-right:6px` }), i === 0 ? el('b', {}, g.name) : g.name),
      el('td', { class: 'num' }, p.count.toLocaleString('de-DE')),
      el('td', { class: 'num' }, p.peak.toLocaleString('de-DE')),
      el('td', { class: 'num' }, p.kills.toLocaleString('de-DE')),
      el('td', { class: 'num' }, status));
  });
  fill($('#rs-table'), el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Kultur'), el('th', { class: 'num' }, 'Ende'), el('th', { class: 'num' }, 'Max.'), el('th', { class: 'num' }, 'Kills'), el('th', { class: 'num' }, 'Status'))),
    el('tbody', {}, rows)));

  const lvMode = cfg.mode === 'level';
  $('#rs-next').hidden = !(lvMode && won && cfg.level < LEVELS.length);
  $('#rs-upgrade').hidden = !lvMode;
  $('#rs-new').hidden = lvMode;
  $('#rs-rematch').textContent = lvMode ? (won ? 'Level wiederholen' : 'Nochmal versuchen') : 'Revanche (gleicher Start)';
  if (firstWin) showWinModal(cfg.level);
}

function showWinModal(level) {
  const lv = LEVELS[level - 1];
  const germ = GERMS[lv.boss.germ];
  fill($('#win-sub'), 'Du hast ', el('b', {}, germ.name), ` besiegt und Level ${level} geschafft!`);
  const pic = $('#win-germ');
  pic.innerHTML = germSvg(germ.shape, lv.boss.color);
  $('#win-fact').textContent = germ.fact;
  fill($('#win-rewards'), ...rewardRows(level, true));
  $('#win-modal').hidden = false;
}
$('#win-ok').addEventListener('click', () => { $('#win-modal').hidden = true; });

$('#rs-back').addEventListener('click', () => go(run.cfg.mode === 'level' ? 'career' : 'setup'));
$('#rs-rematch').addEventListener('click', () => {
  const cfg = run.cfg;
  if (cfg.mode === 'level') {
    const b = store.getBacterium(cfg.careerId);
    if (!b) return go('careers');
    const probs = problems(b, getLimits(b.career.won), careerPoints(b.career.won));
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
go('home');

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
