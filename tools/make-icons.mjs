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

// App-Icon im Stil der App („Bioluminescent Glass“): tiefes Tintenblau mit weichem Lichtschein,
// eine Petrischale mit klarem Glasrand, leuchtend goldenes Agar und drei glühende Kolonien in den
// Kulturfarben – Cyan (die eigene, größte), Koralle und Mint. Glatt gerechnet, 4×4-fach abgetastet.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
const over = (base, col, alpha) => mix(base, col, alpha);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

const BG_HI = [30, 46, 82], BG_MID = [11, 17, 32], BG_LO = [6, 9, 18];
const AGAR_IN = [255, 244, 200], AGAR_MID = [255, 196, 84], AGAR_OUT = [232, 136, 30];
const RIM = [236, 242, 255];
const COLONIES = [
  { x: 0.43, y: 0.42, r: 0.13, hi: [150, 232, 255], lo: [40, 170, 240], waves: [[5, 0.06, 0.4], [9, 0.03, 1.3]] },
  { x: 0.635, y: 0.60, r: 0.085, hi: [255, 160, 172], lo: [255, 78, 104], waves: [[4, 0.07, 2.1], [7, 0.04, 0.2]] },
  { x: 0.40, y: 0.665, r: 0.062, hi: [150, 255, 218], lo: [34, 214, 160], waves: [[5, 0.08, 1.0]] },
];
const R_DISH = 0.39, RIM_W = 0.014;
const SPECKS = [[0.30, 0.33, 0.010, 0], [0.57, 0.31, 0.009, 0], [0.585, 0.455, 0.008, 0], [0.75, 0.55, 0.010, 1], [0.71, 0.70, 0.008, 1], [0.31, 0.73, 0.009, 2], [0.48, 0.755, 0.007, 2]];

function sample(u, v) {
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy);
  // Hintergrund: Tintenblau mit Lichtschein oben, nach unten dunkler
  let c = mix(BG_HI, BG_MID, smooth(0, 0.62, Math.hypot(u - 0.5, v - 0.22)));
  c = mix(c, BG_LO, smooth(0.55, 1.05, v));
  // goldener Schein der Schale
  c = over(c, [255, 190, 90], 0.22 * (1 - smooth(R_DISH, R_DISH + 0.09, r)));
  // weicher Schatten darunter
  c = over(c, [0, 0, 0], 0.35 * (1 - smooth(R_DISH, R_DISH + 0.07, Math.hypot(dx, dy - 0.025))) * smooth(0, 0.1, dy + 0.1));
  if (r < R_DISH) {
    // Agar: hell leuchtende Mitte, sattes Gold, zum Rand kräftiges Bernstein
    const ra = Math.hypot(u - 0.45, v - 0.42) / R_DISH;
    let a = ra < 0.7 ? mix(AGAR_IN, AGAR_MID, smooth(0, 0.7, ra)) : mix(AGAR_MID, AGAR_OUT, smooth(0.7, 1.1, ra));
    for (const k of COLONIES) {
      const ang = Math.atan2(v - k.y, u - k.x);
      let rr = k.r;
      for (const [f, amp, ph] of k.waves) rr *= 1 + amp * Math.sin(f * ang + ph);
      const d = Math.hypot(u - k.x, v - k.y);
      // farbiges Leuchten um die Kolonie (statt eines braunen Hofs)
      a = over(a, k.lo, 0.32 * (1 - smooth(rr, rr + 0.05, d)));
      if (d < rr + 0.004) {
        const inner = mix(k.hi, k.lo, smooth(0, rr * 1.1, Math.hypot(u - (k.x - rr * 0.35), v - (k.y - rr * 0.35))));
        a = mix(a, inner, smooth(rr + 0.004, rr - 0.004, d));
        // Glanzpunkt oben links
        a = over(a, [255, 255, 255], 0.55 * (1 - smooth(0, rr * 0.38, Math.hypot(u - (k.x - rr * 0.38), v - (k.y - rr * 0.4)))));
      }
    }
    for (const [sx, sy, sr, ki] of SPECKS) {
      const d = Math.hypot(u - sx, v - sy);
      a = mix(a, COLONIES[ki].lo, smooth(sr + 0.003, sr - 0.003, d));
    }
    // leichter Innenschatten am Schalenrand (Tiefe), warm statt schlammig
    a = over(a, [190, 90, 10], 0.3 * smooth(R_DISH - 0.035, R_DISH, r));
    // Glasglanz oben links
    a = over(a, [255, 255, 255], 0.18 * (1 - smooth(0, 0.2, Math.hypot(u - 0.35, v - 0.29))));
    c = mix(c, a, smooth(R_DISH, R_DISH - 0.004, r));
  }
  // klarer heller Glasrand, oben links stärker
  const ring = 1 - smooth(RIM_W * 0.5, RIM_W * 0.5 + 0.004, Math.abs(r - R_DISH - RIM_W * 0.3));
  const light = 0.45 + 0.55 * Math.max(0, (-dx - dy) / (r || 1));
  c = over(c, RIM, ring * light * 0.9);
  // feiner Glanzbogen oben links auf dem Glas
  const ang = Math.atan2(dy, dx);
  const arc = (1 - smooth(0.004, 0.009, Math.abs(r - R_DISH * 0.9))) * (ang > -2.75 && ang < -1.95 ? Math.sin((ang + 2.75) / 0.8 * Math.PI) : 0);
  c = over(c, [255, 255, 255], 0.6 * arc);
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
