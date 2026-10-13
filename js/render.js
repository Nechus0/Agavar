// Zeichnet die Agarplatte: ein Pixel pro Zelle, hochskaliert ohne Glättung.

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Farbverlauf für den Nährboden: leergefressen (dunkel) bis satt (helles Agar-Gelb).
const AGAR_LO = [38, 30, 22];
const AGAR_HI = [214, 178, 96];
const AGAR = new Uint8Array(101 * 3);
const TOXIN = [190, 255, 60]; // giftgrüne Wolke
const BITE = [255, 40, 60]; // rote Fraßspur
for (let v = 0; v <= 100; v++) {
  const t = Math.pow(v / 100, 0.8);
  for (let c = 0; c < 3; c++) AGAR[v * 3 + c] = Math.round(AGAR_LO[c] + (AGAR_HI[c] - AGAR_LO[c]) * t);
}

export class PlateRenderer {
  constructor(canvas, sim) {
    this.canvas = canvas;
    this.sim = sim;
    canvas.width = sim.N;
    canvas.height = sim.N;
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(sim.N, sim.N);
    this.colors = sim.players.map((p) => hexToRgb(p.genome.color));
  }

  draw() {
    const { sim, img, colors } = this;
    const d = img.data;
    const { owner, energy, nutrient, inPlate, spore, still, fog, bite, shield, N } = sim;
    const biofilm = sim.players.map((p) => p.ph.biofilm);
    const photo = sim.players.map((p) => p.ph.photo);
    const tick = sim.tick;
    const size = owner.length;
    for (let i = 0, k = 0; i < size; i++, k += 4) {
      if (!inPlate[i]) { d[k + 3] = 0; continue; }
      const o = owner[i];
      if (o) {
        const col = colors[o - 1];
        if (spore[i]) {
          // Sporen: helle, fast weiße Punkte
          d[k] = 150 + col[0] * 0.4; d[k + 1] = 150 + col[1] * 0.4; d[k + 2] = 150 + col[2] * 0.4;
        } else if (biofilm[o - 1] && still[i] >= 4) {
          // Biofilm: dunklere, gemusterte Matte
          const f = ((i % N) + ((i / N) | 0)) & 1 ? 0.45 : 0.62;
          d[k] = col[0] * f; d[k + 1] = col[1] * f; d[k + 2] = col[2] * f;
        } else {
          let f = 0.62 + 0.38 * Math.min(1, energy[i] / 70);
          // Photosynthese: Zellen schimmern
          if (photo[o - 1] && ((i * 7 + (tick >> 2)) % 5 === 0)) f = 1.25;
          d[k] = Math.min(255, col[0] * f); d[k + 1] = Math.min(255, col[1] * f); d[k + 2] = Math.min(255, col[2] * f);
          // Kapsel: heller Schleimrand
          if (shield[i]) { d[k] += (255 - d[k]) * 0.3; d[k + 1] += (255 - d[k + 1]) * 0.3; d[k + 2] += (255 - d[k + 2]) * 0.3; }
        }
        if (fog[i]) { const t = fog[i] / 20; d[k] += (TOXIN[0] - d[k]) * t; d[k + 1] += (TOXIN[1] - d[k + 1]) * t; d[k + 2] += (TOXIN[2] - d[k + 2]) * t; }
      } else {
        const v = Math.min(100, nutrient[i] | 0) * 3;
        let r = AGAR[v], g = AGAR[v + 1], b = AGAR[v + 2];
        if (fog[i]) { const t = fog[i] / 12; r += (TOXIN[0] - r) * t; g += (TOXIN[1] - g) * t; b += (TOXIN[2] - b) * t; }
        if (bite[i]) { const t = bite[i] / 14; r += (BITE[0] - r) * t; g += (BITE[1] - g) * t; b += (BITE[2] - b) * t; }
        d[k] = r; d[k + 1] = g; d[k + 2] = b;
      }
      d[k + 3] = 255;
    }
    this.ctx.putImageData(img, 0, 0);
  }
}

// Kleines Liniendiagramm der Populationen über die Zeit.
export function drawHistory(canvas, history, colorsHex) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300, h = canvas.clientHeight || 160;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  if (!history.length) return;
  let max = 1;
  for (const row of history) for (const v of row) if (v > max) max = v;
  const pad = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let g = 1; g < 4; g++) {
    const y = pad + ((h - 2 * pad) * g) / 4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const n = history.length;
  colorsHex.forEach((col, p) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let t = 0; t < n; t++) {
      const x = n === 1 ? 0 : (t / (n - 1)) * w;
      const y = h - pad - (history[t][p] / max) * (h - 2 * pad);
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

// Animierte Vorschau des Bewegungsmusters: eine einzelne Zelle läuft ihr Muster ab,
// der gerade ausgeführte Schritt wird über onStep(index) gemeldet.
const PDX = [0, 1, 1, 1, 0, -1, -1, -1];
const PDY = [-1, -1, 0, 1, 1, 1, 0, -1];
const TURN = { F: 0, R: 1, L: -1, D: 2, S: -2, B: 4, M: 0 };

export class PathAnimator {
  constructor(canvas, onStep) {
    this.canvas = canvas;
    this.onStep = onStep;
    this.color = '#e9c46a';
    this.raf = 0;
    this.actions = [];
  }

  setProgram(program, color) {
    this.color = color || this.color;
    let s = 7;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    // Muster auflösen: "F3" -> drei Aktionen, die alle zu Slot 0 gehören
    const flat = [];
    program.forEach((e, idx) => {
      const m = /^([A-Z])([1-9])?$/.exec(e);
      if (m) for (let r = 0; r < Number(m[2] || 1); r++) flat.push({ st: m[1], idx });
    });
    if (!flat.length) flat.push({ st: 'P', idx: 0 });
    let x = 0, y = 0, d = 0, mirror = 1;
    const acts = [];
    const n = Math.max(16, Math.min(40, flat.length * 4));
    for (let k = 0; k < n; k++) {
      const { st, idx } = flat[k % flat.length];
      const d0 = d;
      if (st === 'Z') d = Math.floor(rnd() * 8);
      else if (st === 'B') d = (d + 4) & 7;
      else if (st in TURN) d = (d + TURN[st] * mirror + 8) & 7;
      if (st === 'M') mirror = -mirror;
      const moved = st !== 'P';
      const fx = x, fy = y;
      if (moved) { x += PDX[d]; y += PDY[d]; }
      // kürzeste Drehung für die Animation
      let turn = ((d - d0 + 8) % 8);
      if (turn > 4) turn -= 8;
      if (st === 'B') turn = 4;
      acts.push({ idx, st, fx, fy, tx: x, ty: y, d0, turn, moved, mirror });
    }
    this.actions = acts;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (const a of acts) {
      minX = Math.min(minX, a.tx); maxX = Math.max(maxX, a.tx);
      minY = Math.min(minY, a.ty); maxY = Math.max(maxY, a.ty);
    }
    this.bounds = { minX, maxX, minY, maxY };
    this._resize();
    this.t0 = performance.now();
    this.lastK = -1;
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 170;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.w = w; this.h = h; this.dpr = dpr;
    const { minX, maxX, minY, maxY } = this.bounds;
    const sc = Math.min(26, (w - 40) / Math.max(1, maxX - minX), (h - 40) / Math.max(1, maxY - minY));
    this.sc = sc;
    this.ox = w / 2 - ((minX + maxX) / 2) * sc;
    this.oy = h / 2 - ((minY + maxY) / 2) * sc;
  }

  start() {
    cancelAnimationFrame(this.raf);
    const loop = (t) => { this.raf = requestAnimationFrame(loop); this._draw(t); };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); }

  _draw(now) {
    const HOLD = 900;
    const STEP = this.actions.length > 24 ? 330 : 470;
    const acts = this.actions;
    if (!acts.length) return;
    const total = acts.length * STEP + HOLD;
    const el = Math.max(0, now - this.t0) % total;
    const k = Math.min(acts.length - 1, Math.floor(el / STEP));
    const f = el >= acts.length * STEP ? 1 : (el % STEP) / STEP;
    const a = acts[k];
    if (this.lastK !== k) { this.lastK = k; if (this.onStep) this.onStep(a.idx); }

    const ctx = this.canvas.getContext('2d');
    const { sc, ox, oy, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const X = (gx) => ox + gx * sc, Y = (gy) => oy + gy * sc;

    // Raster: jedes Feld der Platte ist ein Punkt
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    const gx0 = Math.floor(-ox / sc) - 1, gx1 = Math.ceil((w - ox) / sc) + 1;
    const gy0 = Math.floor(-oy / sc) - 1, gy1 = Math.ceil((h - oy) / sc) + 1;
    if (sc >= 6) for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) ctx.fillRect(X(gx) - 1, Y(gy) - 1, 2, 2);

    // Phasen eines Schritts: erst drehen, dann bewegen
    const turnF = Math.min(1, f / 0.4);
    const moveF = a.moved ? Math.max(0, (f - 0.4) / 0.6) : 0;
    const ease = (v) => v * v * (3 - 2 * v);
    const cx = a.fx + (a.tx - a.fx) * ease(moveF);
    const cy = a.fy + (a.ty - a.fy) * ease(moveF);

    // Spur
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = this.color; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(2, sc * 0.18);
    ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    for (let j = 0; j < k; j++) ctx.lineTo(X(acts[j].tx), Y(acts[j].ty));
    ctx.lineTo(X(cx), Y(cy));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Startpunkt
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(X(0), Y(0), Math.max(3, sc * 0.25), 0, Math.PI * 2); ctx.stroke();

    // Zelle mit Blickrichtung
    const ang = ((a.d0 + a.turn * ease(turnF)) * Math.PI) / 4;
    const r = Math.max(6, Math.min(11, sc * 0.42));
    ctx.save();
    ctx.translate(X(cx), Y(cy));
    if (a.st === 'P') { const p = 1 + 0.12 * Math.sin(f * Math.PI * 2); ctx.scale(p, p); }
    ctx.rotate(ang);
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e1116';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(r * 0.45, r * 0.25); ctx.lineTo(-r * 0.45, r * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
