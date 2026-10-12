// Zeichnet die Agarplatte: ein Pixel pro Zelle, hochskaliert ohne Glättung.

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Farbverlauf für den Nährboden: leergefressen (dunkel) bis satt (helles Agar-Gelb).
const AGAR_LO = [38, 30, 22];
const AGAR_HI = [214, 178, 96];
const AGAR = new Uint8Array(101 * 3);
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
    const { owner, energy, nutrient, inPlate, spore } = sim;
    const size = owner.length;
    for (let i = 0, k = 0; i < size; i++, k += 4) {
      if (!inPlate[i]) { d[k + 3] = 0; continue; }
      const o = owner[i];
      if (o) {
        const col = colors[o - 1];
        const f = spore[i] ? 0.4 : 0.62 + 0.38 * Math.min(1, energy[i] / 70);
        d[k] = col[0] * f; d[k + 1] = col[1] * f; d[k + 2] = col[2] * f;
      } else {
        const v = Math.min(100, nutrient[i] | 0) * 3;
        d[k] = AGAR[v]; d[k + 1] = AGAR[v + 1]; d[k + 2] = AGAR[v + 2];
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

// Vorschau des Bewegungsmusters einer einzelnen Zelle (ohne Hindernisse).
export function drawPathPreview(canvas, program, seed = 1) {
  const DX = [0, 1, 1, 1, 0, -1, -1, -1];
  const DY = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 120, h = canvas.clientHeight || 120;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pts = [[0, 0]];
  let x = 0, y = 0, d = 0;
  for (let k = 0; k < 48; k++) {
    const st = program[k % program.length];
    if (st === 'R') d = (d + 1) & 7;
    else if (st === 'L') d = (d + 7) & 7;
    else if (st === 'B') d = (d + 4) & 7;
    else if (st === 'Z') d = Math.floor(rnd() * 8);
    if (st === 'P') continue;
    x += DX[d]; y += DY[d];
    pts.push([x, y]);
  }
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const [px, py] of pts) {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  const span = Math.max(maxX - minX, maxY - minY, 4);
  const sc = (Math.min(w, h) - 16) / span;
  const ox = w / 2 - ((minX + maxX) / 2) * sc, oy = h / 2 - ((minY + maxY) / 2) * sc;
  ctx.strokeStyle = 'rgba(233,196,106,0.9)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const X = ox + px * sc, Y = oy + py * sc;
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.stroke();
  ctx.fillStyle = '#5ee06a';
  ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
}
