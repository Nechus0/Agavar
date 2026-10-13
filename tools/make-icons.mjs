// Erzeugt die App-Icons (Pixel-Agarplatte) als PNG ohne externe Abhängigkeiten.
// Aufruf: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { makeRng } from '../js/rng.js';

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

// App-Icon im Agava-Design-System („Lab at night“): fast schwarzer Grund, eine Petrischale mit
// glänzendem Rand, warm leuchtendes Agar (Pixelraster) und drei Kolonien im 120°-Abstand in den
// Kulturfarben Teal (+, Spieler oben), Orange (▲) und Rose (‹). Kanten werden mehrfach abgetastet.
const BG = [15, 18, 16];          // --bg-base
const RIM = [58, 68, 52];         // Rand der Schale
const RIM_HI = [104, 116, 94];    // Glanzlicht auf dem Rand
const AGAR_LO = [48, 30, 14];     // abgegrastes Agar
const AGAR_HI = [192, 153, 60];   // --plate-full
const COLS = [[56, 160, 180], [204, 128, 64], [192, 72, 120]]; // culture-5, culture-2, culture-8

const P = 40;                     // Pixelraster der Agarfläche
const R_RIM = 0.425, R_AGAR = 0.385, R_OUT = 0.46;
const rng = makeRng(7);
const cells = [];                 // Farbe je Rasterzelle (oder null)
const food = [];
const colony = [];
const centres = [0, 1, 2].map((k) => { const a = -Math.PI / 2 + k * 2.0944; return [0.5 + 0.175 * Math.cos(a), 0.5 + 0.175 * Math.sin(a)]; });
const shade = [];
for (let gy = 0; gy < P; gy++) for (let gx = 0; gx < P; gx++) {
  const u = (gx + 0.5) / P * (2 * R_AGAR) + 0.5 - R_AGAR, v = (gy + 0.5) / P * (2 * R_AGAR) + 0.5 - R_AGAR;
  let best = -1, bd = 1e9;
  centres.forEach(([cx, cy], k) => { const d = Math.hypot(u - cx, v - cy) * (1 + 0.28 * rng()); if (d < bd) { bd = d; best = k; } });
  const r = Math.hypot(u - 0.5, v - 0.5) / R_AGAR;
  // Kolonie mit ausgefranstem Rand und einzelnen vorgeschobenen Zellen
  const inside = bd < 0.088 || (bd < 0.118 && rng() < 0.35);
  colony.push(inside ? best : -1);
  shade.push(0.8 + 0.2 * rng());
  // Nahrung: in der Mitte am meisten, rund um die Kolonien abgegrast, leichtes Korn
  const eaten = Math.max(0, 1 - Math.max(0, bd - 0.09) / 0.08);
  food.push(Math.max(0, Math.min(1, (0.95 - 0.45 * r * r) * (1 - 0.75 * eaten) * (0.9 + 0.1 * rng()))));
}
const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
function sample(u, v) {
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy);
  if (r > R_OUT) return BG;
  if (r > R_RIM) {
    // Rand: Glanz oben links
    const t = (r - R_RIM) / (R_OUT - R_RIM);
    const light = Math.max(0, (-dx - dy) / r) * (1 - Math.abs(t - 0.45) * 2);
    return lerp(RIM, RIM_HI, Math.max(0, light));
  }
  if (r > R_AGAR) return [19, 24, 16]; // --bg-plate zwischen Rand und Agar
  const gx = Math.min(P - 1, Math.floor((u - (0.5 - R_AGAR)) / (2 * R_AGAR) * P));
  const gy = Math.min(P - 1, Math.floor((v - (0.5 - R_AGAR)) / (2 * R_AGAR) * P));
  const i = gy * P + gx, k = colony[i];
  if (k >= 0) return COLS[k].map((c) => c * shade[i]);
  return lerp(AGAR_LO, AGAR_HI, Math.pow(food[i], 0.9));
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
    return acc.map((v) => Math.round(v / (SS * SS)));
  }));
}
console.log('Icons geschrieben.');
