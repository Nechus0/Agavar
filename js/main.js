// Oberfläche: Bildschirme, Labor, Editor, Spielablauf.
import {
  STEPS, STEP_KEYS, MAX_PROGRAM, COSTED, FREE, SPECIALS, SPECIAL_KEYS, PALETTE,
  MIN_BUDGET, MAX_BUDGET, defaultGenome, cost, normalize, randomGenome, encodeGenome, decodeGenome,
} from './genome.js';
import { Simulation, DISTRIBUTIONS, MAX_TICKS } from './sim.js';
import { PlateRenderer, drawHistory, drawPathPreview } from './render.js';
import { makeRng, randomSeed } from './rng.js';
import { randomName } from './names.js';
import { LEVELS, LEVEL_BUDGET } from './levels.js';
import * as store from './storage.js';

const $ = (sel) => document.querySelector(sel);

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

const programText = (p) => p.map((s) => STEPS[s].icon).join('');

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
  toast._t = setTimeout(() => (t.hidden = true), 2200);
}

function modal({ title, text = '', input = null, readonly = false, buttons }) {
  return new Promise((resolve) => {
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    const ta = $('#modal-input');
    ta.hidden = input === null;
    ta.value = input || '';
    ta.readOnly = readonly;
    const bar = $('#modal-buttons');
    bar.replaceChildren(...buttons.map((b) => el('button', {
      class: `btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}`,
      onclick: () => { $('#modal').hidden = true; resolve({ value: b.value, text: ta.value }); },
    }, b.label)));
    $('#modal').hidden = false;
    if (input !== null) setTimeout(() => (readonly ? ta.select() : ta.focus()), 50);
  });
}

const confirmDialog = async (title, text, yes = 'Ja') =>
  (await modal({ title, text, buttons: [{ label: 'Abbrechen', value: false }, { label: yes, value: true, primary: true }] })).value;

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
  if (!demo.sim) startDemo();
  demo.last = 0;
  cancelAnimationFrame(demo.raf);
  demo.raf = requestAnimationFrame(demoFrame);
};
onLeave.home = () => cancelAnimationFrame(demo.raf);

// ---------- Bakterien-Auswahl ----------
function renderPicker(container, budget, onPick) {
  const list = store.getBacteria();
  const settings = store.getSettings();
  container.replaceChildren();
  if (!list.length) {
    container.append(el('div', { class: 'empty' }, 'Noch keine Bakterien im Labor.'),
      el('button', { class: 'btn', onclick: () => openEditor(null, current) }, '+ Bakterium erstellen'));
    onPick(null);
    return;
  }
  let selected = list.find((b) => b.id === settings.lastBacterium && cost(b) <= budget)
    || list.find((b) => cost(b) <= budget) || null;
  const draw = () => {
    container.replaceChildren(...list.map((b) => {
      const c = cost(b);
      return el('button', {
        class: `pick ${selected && selected.id === b.id ? 'on' : ''}`,
        disabled: c > budget,
        onclick: () => { selected = b; store.updateSettings({ lastBacterium: b.id }); draw(); onPick(b); },
      },
      el('span', { class: 'dot', style: `background:${b.color}` }),
      el('span', {}, el('b', {}, b.name), el('br'), el('span', { class: 'prog' }, programText(b.program))),
      el('span', { class: 'cost' }, c > budget ? `${c} Pkt · zu teuer` : `${c} Pkt`));
    }));
  };
  draw();
  onPick(selected);
}

// ---------- Level ----------
function levelUnlocked(n) {
  return n === 1 || store.levelsWon().includes(n - 1);
}

onEnter.levels = () => {
  const won = store.levelsWon();
  $('#level-grid').replaceChildren(...LEVELS.map((lv, i) => {
    const n = i + 1;
    const unlocked = levelUnlocked(n);
    return el('button', {
      class: `level ${won.includes(n) ? 'won' : ''} ${unlocked ? '' : 'locked'}`,
      onclick: () => (unlocked ? openLevel(n) : toast(`Gewinne zuerst Level ${n - 1}.`)),
    },
    el('span', { class: 'num' }, `Level ${n}`),
    el('span', { class: 'name' }, lv.name),
    el('span', { class: 'dots' }, lv.opponents.map((o) => el('i', { style: `background:${o.color}` }))));
  }));
};

let levelPick = null;
let openLevelNo = 1;

function opponentStats(g) {
  const parts = COSTED.filter((t) => g[t.key] > 0).map((t) => `${t.label.split(' ')[0]} ${g[t.key]}`);
  if (g.special !== 'none') parts.push(SPECIALS[g.special].name);
  return `${programText(g.program)} · ${parts.join(', ')}`;
}

function openLevel(n) {
  openLevelNo = n;
  const lv = LEVELS[n - 1];
  $('#ld-title').textContent = `Level ${n}`;
  $('#ld-desc').replaceChildren(el('b', {}, lv.name), el('br'), lv.desc);
  $('#ld-opponents').replaceChildren(...lv.opponents.map((o) => el('div', { class: 'opp' },
    el('span', { class: 'dot', style: `background:${o.color}` }),
    el('div', {}, el('b', {}, o.name), el('div', { class: 'stats' }, opponentStats(o))))));
  const pl = lv.plate;
  $('#ld-plate').textContent = `Platte: ${LABELS.size[pl.size]} · Nährboden: ${LABELS.distribution[pl.distribution]}, ${LABELS.amount[pl.amount]}, Nachwachsen ${LABELS.regen[pl.regen].toLowerCase()}`;
  renderPicker($('#ld-picker'), LEVEL_BUDGET, (b) => { levelPick = b; $('#ld-start').disabled = !b; });
  go('level-detail');
}

$('#ld-start').addEventListener('click', () => {
  if (!levelPick) return;
  const lv = LEVELS[openLevelNo - 1];
  startMatch({
    mode: 'level', level: openLevelNo, player: levelPick,
    opponents: lv.opponents.map((o) => normalize(o)), ...lv.plate, seed: randomSeed(),
  });
});

// ---------- Labor ----------
onEnter.lab = () => {
  const list = store.getBacteria();
  const budget = store.getSettings().budget;
  const box = $('#lab-list');
  if (!list.length) {
    box.replaceChildren(el('div', { class: 'empty' }, 'Dein Labor ist leer. Erstelle dein erstes Bakterium!'));
    return;
  }
  box.replaceChildren(...list.map((b) => el('div', { class: 'lab-item' },
    el('div', { class: 'title' },
      el('span', { class: 'dot', style: `background:${b.color}` }),
      el('b', {}, b.name),
      el('span', { class: 'cost' }, `${cost(b)} / ${budget} Pkt`)),
    el('div', { class: 'prog' }, opponentStats(b)),
    el('div', { class: 'actions' },
      el('button', { class: 'btn', onclick: () => openEditor(b) }, 'Bearbeiten'),
      el('button', { class: 'btn', onclick: () => duplicate(b) }, 'Kopieren'),
      el('button', { class: 'btn', onclick: () => exportBacterium(b) }, 'Exportieren'),
      el('button', { class: 'btn danger', onclick: () => removeBacterium(b) }, 'Löschen')))));
};

function duplicate(b) {
  const copy = { ...b, id: undefined, name: `${b.name} (Kopie)`.slice(0, 32) };
  store.saveBacterium(copy);
  toast('Kopie erstellt.');
  onEnter.lab();
}

async function removeBacterium(b) {
  if (await confirmDialog('Bakterium löschen?', `„${b.name}“ wird endgültig gelöscht.`, 'Löschen')) {
    store.deleteBacterium(b.id);
    onEnter.lab();
  }
}

async function exportBacterium(b) {
  const code = encodeGenome(b);
  let copied = false;
  try { await navigator.clipboard.writeText(code); copied = true; } catch { /* manuell kopieren */ }
  await modal({
    title: `„${b.name}“ exportieren`,
    text: copied ? 'Der Code wurde in die Zwischenablage kopiert. Du kannst ihn sichern oder verschicken.' : 'Kopiere diesen Code, um das Bakterium zu sichern oder zu teilen.',
    input: code, readonly: true, buttons: [{ label: 'Fertig', primary: true }],
  });
}

$('#lab-new').addEventListener('click', () => openEditor(null));
$('#lab-import').addEventListener('click', async () => {
  const r = await modal({
    title: 'Bakterium importieren', text: 'Füge einen Agava-Code ein (beginnt mit „AGAVA1:“).', input: '',
    buttons: [{ label: 'Abbrechen', value: false }, { label: 'Importieren', value: true, primary: true }],
  });
  if (!r.value) return;
  try {
    const g = decodeGenome(r.text);
    delete g.id;
    store.saveBacterium(g);
    toast(`„${g.name}“ importiert.`);
    onEnter.lab();
  } catch (err) {
    toast(err.message || 'Code konnte nicht gelesen werden.');
  }
});

// ---------- Editor ----------
let ed = null;
let edReturn = 'lab';

function openEditor(b, returnTo = 'lab') {
  ed = b ? normalize(JSON.parse(JSON.stringify(b))) : defaultGenome();
  if (b) ed.id = b.id;
  else {
    const used = new Set(store.getBacteria().map((x) => x.color));
    ed.color = PALETTE.find((c) => !used.has(c)) || PALETTE[0];
  }
  edReturn = returnTo;
  go('editor');
  renderEditor();
}

function renderEditor() {
  $('#ed-name').value = ed.name;
  $('#ed-colors').replaceChildren(...PALETTE.map((c) => el('button', {
    class: `swatch ${ed.color === c ? 'on' : ''}`, style: `background:${c}`, 'aria-label': c,
    onclick: () => { ed.color = c; renderEditor(); },
  })));

  // Bewegungsmuster
  const slots = [];
  for (let k = 0; k < MAX_PROGRAM; k++) {
    const s = ed.program[k];
    slots.push(el('button', {
      class: `slot ${s ? 'filled' : ''}`,
      onclick: () => { if (s && ed.program.length > 1) { ed.program.splice(k, 1); renderEditor(); } },
    }, s ? STEPS[s].icon : ''));
  }
  $('#ed-program').replaceChildren(...slots);
  $('#ed-steps').replaceChildren(...STEP_KEYS.map((key) => el('button', {
    class: 'stepbtn', title: STEPS[key].name,
    onclick: () => {
      if (ed.program.length >= MAX_PROGRAM) return toast('Maximal 6 Schritte.');
      ed.program.push(key); renderEditor();
    },
  }, STEPS[key].icon)));
  drawPathPreview($('#ed-preview'), ed.program);

  // Kostenlose Abwägungen
  $('#ed-free').replaceChildren(...FREE.map((t) => {
    const input = el('input', { type: 'range', min: 0, max: t.max, step: 1, value: ed[t.key] });
    input.addEventListener('input', () => { ed[t.key] = Number(input.value); });
    return el('div', { class: 'trait' },
      el('div', { class: 'trait-head' }, el('b', {}, t.label)),
      el('div', { class: 'hint' }, t.hint),
      input,
      el('div', { class: 'range-labels' }, el('span', {}, t.low), el('span', {}, t.high)));
  }));

  // Eigenschaften mit Punktekosten
  $('#ed-costed').replaceChildren(...COSTED.map((t) => {
    const pips = [];
    for (let k = 0; k < t.max; k++) pips.push(el('i', { class: k < ed[t.key] ? 'on' : '' }));
    return el('div', { class: 'trait' },
      el('div', { class: 'trait-head' },
        el('b', {}, t.label),
        el('div', { class: 'stepper' },
          el('button', { onclick: () => { if (ed[t.key] > 0) { ed[t.key]--; renderEditor(); } }, 'aria-label': 'weniger' }, '−'),
          el('div', { class: 'pips' }, pips),
          el('button', { onclick: () => { if (ed[t.key] < t.max) { ed[t.key]++; renderEditor(); } }, 'aria-label': 'mehr' }, '+'))),
      el('div', { class: 'hint' }, t.hint));
  }));

  // Spezialfähigkeit
  $('#ed-specials').replaceChildren(...SPECIAL_KEYS.map((k) => el('button', {
    class: `chip ${ed.special === k ? 'on' : ''}`, onclick: () => { ed.special = k; renderEditor(); },
  }, SPECIALS[k].name)));
  $('#ed-special-hint').textContent = SPECIALS[ed.special].hint;

  // Budget
  const budget = store.getSettings().budget;
  const c = cost(ed);
  $('#ed-cost').textContent = `${c} / ${budget}`;
  $('#ed-meter').style.width = `${Math.min(100, (c / budget) * 100)}%`;
  const over = c > budget;
  $('#ed-budget').classList.toggle('over', over);
  const warn = $('#ed-warn');
  warn.hidden = !over && c <= LEVEL_BUDGET;
  if (over) warn.textContent = `${c - budget} Punkte über deinem Budget. Erhöhe das Budget im freien Spiel oder senke Werte.`;
  else if (c > LEVEL_BUDGET) warn.textContent = `Für die Level (Budget ${LEVEL_BUDGET}) ist dieses Bakterium zu teuer.`;
}

$('#ed-name').addEventListener('input', (e) => { ed.name = e.target.value; });
$('#ed-cancel').addEventListener('click', () => go(edReturn));
$('#ed-save').addEventListener('click', () => {
  if (!ed.name.trim()) return toast('Bitte gib einen Namen ein.');
  const saved = store.saveBacterium(ed);
  store.updateSettings({ lastBacterium: saved.id });
  toast(`„${saved.name}“ gespeichert.`);
  go(edReturn);
});

// ---------- Freies Spiel ----------
let freePick = null;

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
  renderPicker($('#su-picker'), s.budget, (b) => { freePick = b; $('#su-start').disabled = !b; });
  $('#su-options').replaceChildren(
    el('h3', {}, 'Einstellungen'),
    stepperOption('Anzahl Gegner', 'opponents', 1, 5, 1),
    stepperOption('Punktebudget (für dich und die Gegner)', 'budget', MIN_BUDGET, MAX_BUDGET, 1, (v) => `${v} Pkt`),
    segOption('Plattengröße', 'size', ['klein', 'mittel', 'gross'], LABELS.size),
    segOption('Nährboden-Verteilung', 'distribution', DISTRIBUTIONS, LABELS.distribution),
    segOption('Nährstoffmenge', 'amount', ['wenig', 'normal', 'viel'], LABELS.amount),
    segOption('Nachwachsen', 'regen', ['aus', 'langsam', 'normal', 'schnell'], LABELS.regen),
  );
};

function randomOpponents(n, budget, playerColor, seed) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const colors = PALETTE.filter((c) => c !== playerColor);
  return Array.from({ length: n }, (_, k) => ({
    ...randomGenome(rng, budget), name: randomName(rng), color: colors[k % colors.length],
  }));
}

$('#su-start').addEventListener('click', () => {
  if (!freePick) return;
  const s = store.getSettings();
  const seed = randomSeed();
  startMatch({
    mode: 'free', player: freePick,
    opponents: randomOpponents(s.opponents, s.budget, freePick.color, seed),
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
  const opponents = fixColors(player, cfg.opponents.map(normalize));
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
  $('#sim-shares').replaceChildren(...run.genomes.map((g) => el('div', { style: `background:${g.color}` })));
  $('#sim-legend').replaceChildren(...run.genomes.map((g, i) => el('div', { class: 'legend-row' },
    el('span', { class: 'dot', style: `background:${g.color}` }),
    el('span', {}, i === 0 ? el('b', {}, `${g.name} (du)`) : g.name),
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
  $('#sim-tick').textContent = `${sim.tick} / ${MAX_TICKS}`;
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
  $('#rs-reason').textContent = `${sim.endReason}${winnerName && !won ? ` Sieger: ${winnerName}.` : ''} (${sim.tick} Generationen)`;

  let unlockedNext = false;
  if (cfg.mode === 'level' && won) {
    unlockedNext = !store.levelsWon().includes(cfg.level) && cfg.level < LEVELS.length;
    store.markLevelWon(cfg.level);
  }

  go('result');
  const rc = $('#rs-plate');
  rc.width = sim.N; rc.height = sim.N;
  rc.getContext('2d').drawImage($('#plate'), 0, 0);
  drawHistory($('#rs-chart'), sim.history, run.genomes.map((g) => g.color));

  const rows = sim.players.map((p, i) => {
    const g = run.genomes[i];
    const status = sim.winner === p.id ? '🏆' : p.count === 0 ? `✝ ${p.extinctAt}` : 'lebt';
    return el('tr', {},
      el('td', {}, el('span', { class: 'dot', style: `background:${g.color};vertical-align:-2px;margin-right:6px` }), i === 0 ? el('b', {}, g.name) : g.name,
        i > 0 && cfg.mode === 'free' ? el('span', {}, ' ', el('button', { class: 'adopt', onclick: (e) => adopt(g, e.target) }, '+ Labor')) : null),
      el('td', { class: 'num' }, p.count.toLocaleString('de-DE')),
      el('td', { class: 'num' }, p.peak.toLocaleString('de-DE')),
      el('td', { class: 'num' }, p.kills.toLocaleString('de-DE')),
      el('td', { class: 'num' }, status));
  });
  $('#rs-table').replaceChildren(el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Kultur'), el('th', { class: 'num' }, 'Ende'), el('th', { class: 'num' }, 'Max.'), el('th', { class: 'num' }, 'Kills'), el('th', { class: 'num' }, 'Status'))),
    el('tbody', {}, rows)));

  const next = $('#rs-next');
  next.hidden = !(cfg.mode === 'level' && won && cfg.level < LEVELS.length);
  $('#rs-new').hidden = cfg.mode === 'level';
  $('#rs-rematch').textContent = cfg.mode === 'level' ? 'Nochmal versuchen' : 'Revanche (gleicher Start)';
  if (cfg.mode === 'level' && won && cfg.level === LEVELS.length) toast('Du hast alle Level geschafft! 🎉');
  else if (unlockedNext) toast(`Level ${cfg.level + 1} freigeschaltet!`);
}

function adopt(g, btn) {
  const { id, ...rest } = g;
  store.saveBacterium(rest);
  btn.disabled = true;
  btn.textContent = '✓';
  toast(`„${g.name}“ ins Labor übernommen.`);
}

$('#rs-rematch').addEventListener('click', () => {
  const cfg = run.cfg;
  // Spieler-Bakterium ggf. aktualisiert aus dem Labor holen
  const fresh = store.getBacterium(cfg.player.id) || cfg.player;
  // Level: neuer Zufall; freies Spiel: exakt gleicher Startzustand
  startMatch({ ...cfg, player: fresh, seed: cfg.mode === 'level' ? randomSeed() : cfg.seed });
});
$('#rs-new').addEventListener('click', () => {
  const cfg = run.cfg;
  const s = store.getSettings();
  const seed = randomSeed();
  const player = store.getBacterium(cfg.player.id) || cfg.player;
  startMatch({ ...cfg, player, seed, opponents: randomOpponents(cfg.opponents.length, s.budget, player.color, seed) });
});
$('#rs-next').addEventListener('click', () => openLevel(run.cfg.level + 1));
$('#rs-edit').addEventListener('click', () => {
  const b = store.getBacterium(run.cfg.player.id);
  if (!b) return toast('Dieses Bakterium ist nicht mehr im Labor.');
  openEditor(b, run.cfg.mode === 'level' ? 'level-detail' : 'setup');
});
onEnter['level-detail'] = () => {
  if (current === 'level-detail') renderPicker($('#ld-picker'), LEVEL_BUDGET, (b) => { levelPick = b; $('#ld-start').disabled = !b; });
};

// ---------- Start ----------
if (!store.getBacteria().length) {
  store.saveBacterium({ ...defaultGenome(), name: 'Agava Prototyp' });
}
go('home');

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
