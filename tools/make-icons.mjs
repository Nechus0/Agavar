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

// App-Icon: modern und reduziert. Dunkelgrüner Verlauf, eine Petrischale mit feinem hellem Rand,
// warm leuchtendes Agar und drei weiche, organische Kolonien – Teal (die eigene, größte),
// Orange und Rose. Alles glatt gerechnet (Abstandsfunktionen) und 4×4-fach abgetastet.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
const over = (base, col, alpha) => mix(base, col, alpha);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

const BG_TOP = [24, 40, 30], BG_BOT = [8, 12, 10];
const AGAR_IN = [250, 204, 98], AGAR_OUT = [168, 98, 26];
const RIM = [214, 226, 200];
// Kolonien: Mittelpunkt, Radius, Farbe hell/dunkel, Wellenform des Randes
const COLONIES = [
  { x: 0.43, y: 0.42, r: 0.135, hi: [120, 222, 238], lo: [30, 140, 170], waves: [[5, 0.06, 0.4], [9, 0.03, 1.3]] },
  { x: 0.63, y: 0.60, r: 0.085, hi: [255, 176, 112], lo: [204, 104, 46], waves: [[4, 0.07, 2.1], [7, 0.04, 0.2]] },
  { x: 0.40, y: 0.66, r: 0.060, hi: [244, 128, 170], lo: [176, 52, 104], waves: [[5, 0.08, 1.0]] },
];
const R_DISH = 0.395, RIM_W = 0.016;
// einzelne vorgeschobene Zellen rund um die Kolonien (Ausbreitung)
const SPECKS = [[0.30, 0.33, 0.011, 0], [0.57, 0.31, 0.009, 0], [0.585, 0.455, 0.008, 0], [0.74, 0.55, 0.010, 1], [0.70, 0.70, 0.008, 1], [0.31, 0.72, 0.009, 2], [0.47, 0.75, 0.007, 2]];

function sample(u, v) {
  // Hintergrund: senkrechter Verlauf mit leichtem Licht oben
  let c = mix(BG_TOP, BG_BOT, v * 1.05);
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy);
  // warmer Schein der Schale auf dem Hintergrund
  c = over(c, [120, 90, 30], 0.22 * (1 - smooth(R_DISH, R_DISH + 0.16, r)));
  // weicher Schatten unter der Schale
  c = over(c, [0, 0, 0], 0.45 * (1 - smooth(R_DISH, R_DISH + 0.08, Math.hypot(dx, dy - 0.02))));
  if (r < R_DISH) {
    // Agar: warmes Leuchten, zum Rand dunkler
    let a = mix(AGAR_IN, AGAR_OUT, smooth(0.0, R_DISH, Math.hypot(u - 0.46, v - 0.44)));
    for (const k of COLONIES) {
      const ang = Math.atan2(v - k.y, u - k.x);
      let rr = k.r;
      for (const [f, amp, ph] of k.waves) rr *= 1 + amp * Math.sin(f * ang + ph);
      const d = Math.hypot(u - k.x, v - k.y);
      // abgegraster Hof und farbiger Schein um die Kolonie
      a = over(a, [92, 52, 18], 0.5 * (1 - smooth(rr, rr + 0.055, d)));
      a = over(a, k.hi, 0.25 * (1 - smooth(rr, rr + 0.03, d)));
      if (d < rr + 0.004) {
        const inner = mix(k.hi, k.lo, smooth(0, rr, Math.hypot(u - (k.x - rr * 0.3), v - (k.y - rr * 0.3))));
        a = mix(a, inner, smooth(rr + 0.004, rr - 0.004, d));
      }
    }
    for (const [sx, sy, sr, ki] of SPECKS) {
      const d = Math.hypot(u - sx, v - sy);
      a = mix(a, COLONIES[ki].hi, smooth(sr + 0.003, sr - 0.003, d));
    }
    // Innenschatten am Schalenrand (Tiefe)
    a = over(a, [60, 30, 8], 0.45 * smooth(R_DISH - 0.05, R_DISH, r));
    // Glanz oben links auf dem Agar
    a = over(a, [255, 255, 255], 0.16 * (1 - smooth(0, 0.22, Math.hypot(u - 0.36, v - 0.30))));
    c = mix(c, a, smooth(R_DISH, R_DISH - 0.004, r));
  }
  // feiner heller Rand, oben links stärker
  const ring = 1 - smooth(RIM_W * 0.5, RIM_W * 0.5 + 0.004, Math.abs(r - R_DISH - RIM_W * 0.3));
  const light = 0.35 + 0.65 * Math.max(0, (-dx - dy) / (r || 1));
  c = over(c, RIM, ring * light * 0.95);
  // zweiter, dunkler Glasring außen
  const ring2 = 1 - smooth(0.004, 0.009, Math.abs(r - R_DISH - RIM_W * 1.3));
  c = over(c, [6, 10, 8], ring2 * 0.6);
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
