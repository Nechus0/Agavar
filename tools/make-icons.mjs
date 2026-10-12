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

// 32x32-Pixelbild: runde Platte mit drei Kolonien
const G = 32;
const grid = [];
const rng = makeRng(11);
const colonies = [[10, 11, [63, 169, 245]], [21, 12, [255, 93, 93]], [15, 22, [94, 224, 106]]];
for (let y = 0; y < G; y++) {
  for (let x = 0; x < G; x++) {
    const dx = x - 15.5, dy = y - 15.5, r = Math.hypot(dx, dy);
    let c = [14, 17, 22];
    if (r < 13.5) {
      const shade = 0.75 + 0.25 * rng();
      c = [214 * shade, 178 * shade, 96 * shade];
      for (const [cx, cy, col] of colonies) {
        const d = Math.hypot(x - cx, y - cy) + rng() * 1.6;
        if (d < 5.2) c = col.map((v) => v * (0.75 + 0.25 * rng()));
      }
    } else if (r < 15) c = [58, 69, 84];
    grid.push(c.map(Math.round));
  }
}

mkdirSync('icons', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(`icons/${name}`, png(size, (x, y) => grid[Math.floor((y * G) / size) * G + Math.floor((x * G) / size)]));
}
console.log('Icons geschrieben.');
