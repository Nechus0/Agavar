// Zeichnet die Agarplatte: ein Pixel pro Zelle, hochskaliert ohne Glättung.

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Farbverlauf für den Nährboden: leergefressen (dunkel) bis satt (helles Agar-Gelb).
const AGAR_LO = [48, 30, 14];
const AGAR_HI = [192, 153, 60];
const TOXIN = [168, 236, 52]; // giftgrüne Wolke
const BITE = [255, 40, 60]; // rote Fraßspur
// food colour table for a world theme ({ lo, hi } as RGB); default is classic agar
function foodPalette(theme) {
  const lo = theme?.lo || AGAR_LO, hi = theme?.hi || AGAR_HI;
  const pal = new Uint8Array(101 * 3);
  for (let v = 0; v <= 100; v++) {
    const t = Math.pow(v / 100, 0.8);
    for (let c = 0; c < 3; c++) pal[v * 3 + c] = Math.round(lo[c] + (hi[c] - lo[c]) * t);
  }
  return pal;
}

export class PlateRenderer {
  constructor(canvas, sim, theme = null) {
    this.canvas = canvas;
    this.food = foodPalette(theme);
    this.sim = sim;
    // Weiche Darstellung: Agar, Zellen und Giftwolken werden je in ein kleines Raster gezeichnet
    // (eine Zelle = ein Pixel) und dann geglättet hochskaliert – die Kolonien wirken fließend statt kantig.
    // Die Simulation selbst bleibt unverändert.
    const S = this.scale = Math.max(2, Math.ceil(720 / sim.N));
    canvas.width = sim.N * S;
    canvas.height = sim.N * S;
    this.ctx = canvas.getContext('2d');
    const layer = () => { const c = document.createElement('canvas'); c.width = sim.N; c.height = sim.N; const x = c.getContext('2d'); return { c, x, img: x.createImageData(sim.N, sim.N) }; };
    this.agar = layer(); this.cells = layer(); this.haze = layer();
    this.img = this.agar.img;
    this.colors = sim.players.map((p) => hexToRgb(p.genome.color));
    // Smooth edge: pixels just outside the round plate borrow the food colour of the
    // nearest plate pixel, and CSS (border-radius: 50%) then cuts a clean circle.
    const N = sim.N, c = (N - 1) / 2, R = N / 2 - 0.5;
    this.edge = new Int32Array(N * N).fill(-1);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (sim.inPlate[i]) continue;
        const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
        if (r > R + 3) continue;
        for (let rr = R - 0.5; rr > R - 4; rr -= 0.5) {
          const j = Math.round(c + (dy / r) * rr) * N + Math.round(c + (dx / r) * rr);
          if (sim.inPlate[j]) { this.edge[i] = j; break; }
        }
      }
    }
    if (sim.envOn) this._prepareEnv();
  }

  // feste Färbungen der Elemente (Säure, Wärme, Salz, Schatten) einmal vorberechnen:
  // Farbe = Farbe * mul + add (je Kanal), für Nährboden und – nur Schatten – für Zellen
  _prepareEnv() {
    const sim = this.sim, N = sim.N, size = N * N;
    const mul = new Float32Array(size).fill(1), add = new Float32Array(size * 3), cmul = new Float32Array(size).fill(1);
    const tint = (i, col, w) => {
      if (w <= 0) return;
      mul[i] *= 1 - w;
      for (let c = 0; c < 3; c++) add[i * 3 + c] = add[i * 3 + c] * (1 - w) + col[c] * w;
    };
    for (let i = 0; i < size; i++) {
      if (!sim.inPlate[i]) continue;
      if (sim.acid) tint(i, [196, 70, 96], sim.acid[i] * 0.42);
      if (sim.temp) { const t = sim.temp[i]; if (t > 0) tint(i, [236, 104, 40], t * 0.3); else tint(i, [130, 186, 236], -t * 0.34); }
      if (sim.salt) tint(i, [246, 244, 236], sim.salt[i] * 0.45);
      if (sim.light) {
        const L = sim.light[i], sh = 0.5 + 0.5 * L;
        if (L > 0.5) tint(i, [255, 236, 170], (L - 0.5) * 0.18);
        mul[i] *= sh; for (let c = 0; c < 3; c++) add[i * 3 + c] *= sh;
        cmul[i] = 0.62 + 0.38 * L;
      }
    }
    this.env = { mul, add, cmul };
    if (sim.flow) {
      const a = sim.flowAngle, ca = Math.cos(a), sa = Math.sin(a);
      const along = new Float32Array(size), lane = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        const x = i % N, y = (i / N) | 0;
        along[i] = x * ca + y * sa;
        const across = -x * sa + y * ca;
        lane[i] = ((Math.round(across) % 6) + 6) % 6 === 0 ? 1 : 0;
      }
      this.env.along = along; this.env.lane = lane;
    }
  }

  // Wände: Steine, Salzkristalle, Schimmel und Antibiotika-Plättchen
  _wallColor(i, kind, tick, d, k) {
    const h = (Math.imul(i, 2654435761) >>> 0) % 97;
    if (kind === 1) { const v = (h % 7) * 5 - 15; d[k] = 116 + v; d[k + 1] = 112 + v; d[k + 2] = 102 + v; }
    else if (kind === 2) { const sp = h % 11 === 0 && ((tick >> 3) + h) % 9 === 0; const v = sp ? 255 : 222 + (h % 4) * 6; d[k] = v; d[k + 1] = v; d[k + 2] = sp ? 255 : v - 10; }
    else if (kind === 3) { const fz = (h + (tick >> 4)) % 5 === 0; d[k] = fz ? 112 : 196 + (h % 5) * 6; d[k + 1] = fz ? 150 : 204 + (h % 5) * 5; d[k + 2] = fz ? 120 : 180 + (h % 5) * 5; }
    else { d[k] = 238; d[k + 1] = 234; d[k + 2] = 222; }
  }

  draw() {
    const { sim, colors, food } = this;
    const d = this.agar.img.data, cd = this.cells.img.data, hd = this.haze.img.data;
    cd.fill(0); hd.fill(0);
    const { owner, energy, nutrient, inPlate, spore, still, fog, bite, shield, N } = sim;
    const biofilm = sim.players.map((p) => p.ph.biofilm);
    const photo = sim.players.map((p) => p.ph.photo);
    const toxic = sim.players.map((p) => p.ph.toxin);
    const tick = sim.tick;
    const size = owner.length;
    const env = this.env, wall = sim.wall, abx = sim.abx, inf = sim.infected, lysis = sim.lysis;
    for (let i = 0, k = 0; i < size; i++, k += 4) {
      if (!inPlate[i]) {
        const j = this.edge[i];
        if (j < 0) { d[k + 3] = 0; continue; }
        const v = Math.min(100, nutrient[j] | 0) * 3;
        d[k] = food[v]; d[k + 1] = food[v + 1]; d[k + 2] = food[v + 2]; d[k + 3] = 255;
        continue;
      }
      if (wall && wall[i]) { this._wallColor(i, wall[i], tick, d, k); d[k + 3] = 255; continue; }
      // Nährboden (auch unter den Zellen, damit die geglätteten Ränder auf Agar auslaufen)
      const v = Math.min(100, nutrient[i] | 0) * 3;
      let r = food[v], g = food[v + 1], b = food[v + 2];
      if (bite[i]) { const t = bite[i] / 14; r += (BITE[0] - r) * t; g += (BITE[1] - g) * t; b += (BITE[2] - b) * t; }
      if (env) {
        const m = env.mul[i], a3 = i * 3;
        r = r * m + env.add[a3]; g = g * m + env.add[a3 + 1]; b = b * m + env.add[a3 + 2];
        // Strömung: feine helle Streifen, die mitwandern
        if (env.lane && env.lane[i] && ((env.along[i] - tick * 0.25) % 18 + 18) % 18 < 3) { r += (255 - r) * 0.16; g += (255 - g) * 0.16; b += (255 - b) * 0.16; }
        // Hemmhof: klare, kühle Zone mit hellem Rand
        if (abx && abx[i] > 0.01) {
          const c = abx[i];
          const w = c < 0.16 ? 0.55 : 0.32 * c;
          r += (206 - r) * w; g += (222 - g) * w; b += (220 - b) * w;
        }
        if (lysis && lysis[i]) { const t = lysis[i] / 22; r += (240 - r) * t; g += (240 - g) * t; b += (230 - b) * t; }
      }
      d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
      // Giftwolke als eigene, weich überblendete Schicht
      if (fog[i]) { hd[k] = TOXIN[0]; hd[k + 1] = TOXIN[1]; hd[k + 2] = TOXIN[2]; hd[k + 3] = Math.min(180, fog[i] * 10); }
      const o = owner[i];
      if (!o) continue;
      const col = colors[o - 1];
      let cr, cg, cb;
      if (inf && inf[i]) {
        // von Phagen befallen: Zelle wird blass, kurz vor dem Platzen fast weiß
        const t = 0.35 + inf[i] * 0.07;
        cr = col[0] + (235 - col[0]) * t; cg = col[1] + (235 - col[1]) * t; cb = col[2] + (235 - col[2]) * t;
      } else if (spore[i]) {
        cr = 150 + col[0] * 0.4; cg = 150 + col[1] * 0.4; cb = 150 + col[2] * 0.4;
      } else if (biofilm[o - 1] && still[i] >= 2) {
        // Biofilm: dunklere, gemusterte Matte
        const f = ((i % N) + ((i / N) | 0)) & 1 ? 0.5 : 0.66;
        cr = col[0] * f; cg = col[1] * f; cb = col[2] * f;
      } else {
        let f = 0.7 + 0.35 * Math.min(1, energy[i] / 70);
        if (photo[o - 1] && ((i * 7 + (tick >> 2)) % 5 === 0)) f = 1.3;
        cr = Math.min(255, col[0] * f); cg = Math.min(255, col[1] * f); cb = Math.min(255, col[2] * f);
        if (shield[i]) { cr += (255 - cr) * 0.3; cg += (255 - cg) * 0.3; cb += (255 - cb) * 0.3; }
      }
      // Giftbildner: grünlicher Schimmer, damit man sieht, wer die Wolken macht
      if (toxic[o - 1] && ((i * 13 + (tick >> 3)) % 7 === 0)) { cr += (TOXIN[0] - cr) * 0.5; cg += (TOXIN[1] - cg) * 0.5; cb += (TOXIN[2] - cb) * 0.5; }
      if (env && env.cmul[i] !== 1) { const m = env.cmul[i]; cr *= m; cg *= m; cb *= m; }
      cd[k] = cr; cd[k + 1] = cg; cd[k + 2] = cb; cd[k + 3] = 255;
    }
    this.agar.x.putImageData(this.agar.img, 0, 0);
    this.cells.x.putImageData(this.cells.img, 0, 0);
    this.haze.x.putImageData(this.haze.img, 0, 0);
    const ctx = this.ctx, W = this.canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(this.agar.c, 0, 0, W, W);
    ctx.drawImage(this.cells.c, 0, 0, W, W);
    ctx.drawImage(this.haze.c, 0, 0, W, W);
    if (sim.envOn) { ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0); this._overlay(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  }

  // bewegte Elemente über dem Raster: Honig-Ankündigung, Tropfen-Welle, Immunzellen
  _overlay() {
    const sim = this.sim, ctx = this.ctx, tick = sim.tick;
    for (const p of sim.pulses || []) {
      if (tick >= p.warn && tick < p.at) {
        const blink = 0.45 + 0.4 * Math.sin(tick / 4);
        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = `rgba(255, 214, 120, ${blink})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x + 0.5, p.y + 0.5, p.r * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (tick >= p.at && tick < p.at + 40) {
        const f = (tick - p.at) / 40;
        ctx.strokeStyle = `rgba(255, 226, 150, ${0.8 * (1 - f)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x + 0.5, p.y + 0.5, p.r * (0.3 + f), 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (const m of sim.immune || []) {
      if (!m.on) continue;
      const pulse = 1 + 0.06 * Math.sin(tick / 6 + m.wob);
      const r = m.r * pulse;
      const cx = m.x + 0.5, cy = m.y + 0.5;
      const blob = (rr) => {
        ctx.beginPath();
        for (let a = 0; a <= 28; a++) {
          const t = (a / 28) * Math.PI * 2;
          const k = rr * (1 + 0.1 * Math.sin(t * 3 + tick / 9 + m.wob));
          const x = cx + Math.cos(t) * k, y = cy + Math.sin(t) * k;
          if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      // dunkler Schatten, damit die Zelle sich vom bunten Untergrund abhebt
      blob(r + 1.5); ctx.fillStyle = 'rgba(10, 12, 10, 0.55)'; ctx.fill();
      blob(r); ctx.fillStyle = 'rgba(240, 244, 255, 0.55)'; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'; ctx.stroke();
      // gelappter Zellkern wie bei einem weißen Blutkörperchen
      ctx.fillStyle = 'rgba(120, 100, 210, 0.95)';
      for (const [dx, dy, rr] of [[-0.3, -0.05, 0.26], [0.05, 0.22, 0.22], [0.3, -0.1, 0.22]]) { ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); }
    }
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
    this.color = '#38a0b4';
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
    ctx.fillStyle = '#0f1210';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(r * 0.45, r * 0.25); ctx.lineTo(-r * 0.45, r * 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// Growth preview: one cell follows its pattern and divides every few steps.
// Daughters inherit the direction and the pattern position, so you can see how
// a pattern turns into a growing colony. Cells cannot share a square (like on the plate).
export class GrowthAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.color = '#38a0b4';
    this.raf = 0;
    this.flat = [{ st: 'P' }];
    this.divEvery = 5;
    this.W = 25; this.H = 25; // grid squares
  }

  setProgram(program, color) {
    this.color = color || this.color;
    const flat = [];
    program.forEach((e) => {
      const m = /^([A-Z])([1-9])?$/.exec(e);
      if (m) for (let r = 0; r < Number(m[2] || 1); r++) flat.push({ st: m[1] });
    });
    this.flat = flat.length ? flat : [{ st: 'P' }];
    this.reset();
  }

  // division setting 0 (very early) … 4 (very late) -> steps between divisions
  setDivision(div) { this.divEvery = 3 + Math.round(Number(div) || 0); this.reset(); }

  reset() {
    this.seed = 11;
    this.cells = [{ x: 0, y: 0, d: 0, k: 0, mir: 1, born: 0 }];
    this.trail = new Map();
    this.tick = 0;
    this.hold = 0;
    this.t0 = performance.now();
  }

  _rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }

  _step() {
    const occ = new Set(this.cells.map((c) => `${c.x},${c.y}`));
    const inside = (x, y) => Math.abs(x) <= (this.W >> 1) && Math.abs(y) <= (this.H >> 1);
    this.tick++;
    for (const c of this.cells) {
      const { st } = this.flat[c.k % this.flat.length];
      c.k++;
      if (st === 'Z') c.d = Math.floor(this._rnd() * 8);
      else if (st === 'B') c.d = (c.d + 4) & 7;
      else if (st in TURN) c.d = (c.d + TURN[st] * c.mir + 8) & 7;
      if (st === 'M') c.mir = -c.mir;
      if (st === 'P') continue;
      const nx = c.x + PDX[c.d], ny = c.y + PDY[c.d];
      if (inside(nx, ny) && !occ.has(`${nx},${ny}`)) {
        occ.delete(`${c.x},${c.y}`);
        this.trail.set(`${c.x},${c.y}`, this.tick);
        c.x = nx; c.y = ny;
        occ.add(`${nx},${ny}`);
      }
    }
    // division: daughter goes to a free neighbouring square
    if (this.tick % this.divEvery === 0 && this.cells.length < 40) {
      for (const c of this.cells.slice()) {
        for (let t = 0; t < 8; t++) {
          const d = (c.d + 4 + [0, 1, -1, 2, -2, 3, -3, 4][t] + 8) & 7;
          const nx = c.x + PDX[d], ny = c.y + PDY[d];
          if (inside(nx, ny) && !occ.has(`${nx},${ny}`)) {
            this.cells.push({ x: nx, y: ny, d: c.d, k: c.k, mir: c.mir, born: this.tick });
            occ.add(`${nx},${ny}`);
            break;
          }
        }
        if (this.cells.length >= 40) break;
      }
    }
  }

  start() {
    cancelAnimationFrame(this.raf);
    const STEP = 260;
    const loop = (t) => {
      this.raf = requestAnimationFrame(loop);
      while (t - this.t0 >= STEP) {
        this.t0 += STEP;
        if (this.cells.length >= 40 || this.tick > 60) { if (++this.hold > 6) this.reset(); }
        else this._step();
      }
      this._draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); }

  _draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 200;
    if (this.canvas.width !== Math.round(w * dpr)) { this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr); }
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sc = Math.min(w / this.W, h / this.H);
    const X = (gx) => w / 2 + (gx - 0.5) * sc, Y = (gy) => h / 2 + (gy - 0.5) * sc;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let gy = -(this.H >> 1); gy <= this.H >> 1; gy++) for (let gx = -(this.W >> 1); gx <= this.W >> 1; gx++) ctx.fillRect(X(gx) + sc / 2 - 1, Y(gy) + sc / 2 - 1, 2, 2);
    ctx.fillStyle = this.color;
    for (const [key, t] of this.trail) {
      const [gx, gy] = key.split(',').map(Number);
      ctx.globalAlpha = Math.max(0.06, 0.3 - (this.tick - t) * 0.02);
      ctx.fillRect(X(gx) + 1, Y(gy) + 1, sc - 2, sc - 2);
    }
    for (const c of this.cells) {
      const fresh = this.tick - c.born <= 1 && c.born > 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = fresh ? '#ffffff' : this.color;
      ctx.fillRect(X(c.x) + 1, Y(c.y) + 1, sc - 2, sc - 2);
    }
    ctx.globalAlpha = 1;
    // origin marker
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(X(0) - 1, Y(0) - 1, sc + 2, sc + 2);
  }
}
