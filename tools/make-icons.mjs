// Erzeugt die App-Icons (Pixel-Agarplatte) als PNG ohne externe Abhängigkeiten.
// Aufruf: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// App-Icon: flach und minimal. Schwarzer Grund, eine klare Petrischale (heller Rand, kaum
// sichtbares bläuliches Gel) und zwei Kolonien im Kampf – Cyan gegen Koralle –, die sich an einer
// gezackten Front berühren. Keine Glanzlichter, nur klare Flächen; 4×4-fach abgetastet.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const edge = (d) => smooth(0.003, -0.003, d); // weiche Kante einer Fläche (d < 0 = innen)

const BG = [0, 0, 0];
const GEL = [16, 30, 44];
const RIM = [176, 214, 240];
const CYAN = [56, 200, 255], CORAL = [255, 90, 110];
const R_DISH = 0.40, RIM_W = 0.022;

// Kolonie als gewellter Kreis: Abstand zum Rand (negativ = innen)
function blob(u, v, x, y, r, waves) {
  const ang = Math.atan2(v - y, u - x);
  let rr = r;
  for (const [f, amp, ph] of waves) rr *= 1 + amp * Math.sin(f * ang + ph);
  return Math.hypot(u - x, v - y) - rr;
}
// gezackte Front zwischen den beiden Kolonien (leicht schräge Linie)
const front = (u, v) => (u - 0.5) + (v - 0.5) * 0.22 + 0.018 * Math.sin(v * 46) + 0.01 * Math.sin(v * 97 + 1);

function sample(u, v) {
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy);
  let c = BG;
  // Gel der Schale: kaum sichtbar bläulich
  c = mix(c, GEL, edge(r - R_DISH));
  if (r < R_DISH) {
    const a = blob(u, v, 0.40, 0.48, 0.215, [[5, 0.05, 0.3], [9, 0.025, 1.2]]);
    const b = blob(u, v, 0.62, 0.53, 0.185, [[4, 0.06, 2.0], [7, 0.03, 0.4]]);
    const f = front(u, v);
    // wo beide wachsen würden, entscheidet die Front
    const inA = edge(a) * edge(f + 0.009), inB = edge(b) * edge(0.009 - f);
    c = mix(c, CYAN, inA);
    c = mix(c, CORAL, inB);
    // ein paar vorgeschobene Zellen
    for (const [sx, sy, sr, col] of [[0.19, 0.40, 0.013, CYAN], [0.24, 0.70, 0.011, CYAN], [0.47, 0.25, 0.010, CYAN], [0.78, 0.40, 0.013, CORAL], [0.76, 0.69, 0.011, CORAL], [0.58, 0.77, 0.010, CORAL]]) {
      c = mix(c, col, edge(Math.hypot(u - sx, v - sy) - sr));
    }
  }
  // klarer heller Schalenrand
  c = mix(c, RIM, edge(Math.abs(r - R_DISH) - RIM_W / 2));
  return c;
}

mkdirSync('icons', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const SS = 4;
  writeFileSync(`icons/${name}`, png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let a = 0; a < SS; a++) for (let b = 0; b < SS; b++) {
      const c = sample((x + (a + 0.5) / SS) / size, (y + (b + 0.5) / SS) / size);
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
    }
    return acc.map((v) => Math.max(0, Math.min(255, Math.round(v / (SS * SS)))));
  }));
}
console.log('Icons geschrieben.');
