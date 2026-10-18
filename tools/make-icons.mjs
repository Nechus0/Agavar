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

// App-Icon: flach und minimal nach Apples Icon-Richtlinien – ein Motiv, kräftiger Hintergrund,
// gefüllte Flächen statt Umrissen, keine eigenen Glanz- oder Schatteneffekte.
// Motiv: eine klare Petrischale (gefüllte, leicht hellere Scheibe mit kräftigem Rand) und zwei
// große Kolonien im Kampf – Cyan gegen Koralle, unterschiedlich hell, damit sie auch in der
// getönten iOS-Darstellung zwei Formen bleiben. Hintergrund je nach Variante (ICON_VARIANT).
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const edge = (d) => smooth(0.003, -0.003, d); // weiche Kante einer Fläche (d < 0 = innen)

const VARIANTS = {
  // dunkles Tintenblau mit Verlauf – hebt sich vom dunklen Homescreen ab, bleibt aber dunkel
  ink: { top: [34, 52, 108], bot: [12, 18, 44], gel: [22, 34, 70], rim: [150, 196, 255] },
  // dunkles Violett
  violet: { top: [70, 40, 130], bot: [24, 12, 56], gel: [44, 26, 86], rim: [200, 176, 255] },
  // hell: Mint-Cyan-Verlauf, Schale dunkel
  light: { top: [150, 250, 220], bot: [56, 200, 255], gel: [10, 22, 40], rim: [255, 255, 255] },
};
const V = VARIANTS[process.env.ICON_VARIANT || 'ink'];
const CYAN = [72, 210, 255], CORAL = [255, 92, 112];
const R_DISH = 0.37, RIM_W = 0.035;

function blob(u, v, x, y, r, waves) {
  const ang = Math.atan2(v - y, u - x);
  let rr = r;
  for (const [f, amp, ph] of waves) rr *= 1 + amp * Math.sin(f * ang + ph);
  return Math.hypot(u - x, v - y) - rr;
}
// Front zwischen den Kolonien: wenige, große Zacken (bleiben auch klein sichtbar)
const front = (u, v) => (u - 0.5) + (v - 0.5) * 0.2 + 0.022 * Math.sin(v * 30);

function sample(u, v) {
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy);
  let c = mix(V.top, V.bot, smooth(0, 1, v));
  // Schale: gefüllte Scheibe mit kräftigem, hellem Rand
  c = mix(c, V.rim, edge(r - R_DISH - RIM_W));
  c = mix(c, V.gel, edge(r - R_DISH));
  if (r < R_DISH) {
    const a = blob(u, v, 0.40, 0.48, 0.20, [[5, 0.05, 0.3]]);
    const b = blob(u, v, 0.61, 0.53, 0.17, [[4, 0.06, 2.0]]);
    const f = front(u, v);
    c = mix(c, CYAN, edge(a) * edge(f + 0.012));
    c = mix(c, CORAL, edge(b) * edge(0.012 - f));
  }
  return c;
}

// Geometrische Varianten (ICON_SHAPE) im Stil moderner Symbol-Icons: klare Grundformen,
// weiche Verläufe in den Kulturfarben, heller Grund.
// Standard-Icon: „Teilung“ auf Weiß (gewählt); ICON_SHAPE=none erzeugt die Schalen-Variante
const SH = process.env.ICON_SHAPE === 'none' ? null : process.env.ICON_SHAPE || 'mitosis';
const C1 = [56, 200, 255], C2 = [255, 90, 110], C3 = [46, 242, 180], C4 = [139, 123, 255];
const lerp3 = (cols, t) => { t = Math.max(0, Math.min(1, t)) * (cols.length - 1); const i = Math.min(cols.length - 2, Math.floor(t)); return mix(cols[i], cols[i + 1], t - i); };
const BG_LIGHT = [250, 251, 253];
function shape(u, v) {
  const dx = u - 0.5, dy = v - 0.5;
  let c = BG_LIGHT;
  if (SH === 'venn') {
    // zwei überlappende Zellen; die Überlappung (Kampfzone) violett
    const a = Math.hypot(u - 0.40, v - 0.5) - 0.21, b = Math.hypot(u - 0.60, v - 0.5) - 0.21;
    c = mix(c, mix(C1, [120, 230, 255], (v - 0.3) * 1.5), edge(a));
    c = mix(c, mix(C2, [255, 150, 120], (v - 0.3) * 1.5), edge(b));
    c = mix(c, C4, edge(Math.max(a, b)));
  } else if (SH === 'mitosis') {
    // eine Zelle in der Teilung: zwei Kreise, weich verschmolzen (Metaball), Verlauf Cyan → Koralle
    const f = 0.021 / ((u - 0.355) ** 2 + (v - 0.5) ** 2) + 0.021 / ((u - 0.645) ** 2 + (v - 0.5) ** 2);
    c = mix(c, lerp3([C1, C4, C2], (u - 0.2) / 0.6), smooth(1.0, 1.06, f));
  } else if (SH === 'swirl') {
    // Petrischale aus drei Kolonien, die sich wie ein Wirbel umeinander drehen (Drive-artig: drei Teile, ein Ganzes)
    const r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) + r * 4.2;
    const k = ((ang / (Math.PI * 2)) % 1 + 1) % 1;
    const col = k < 1 / 3 ? C1 : k < 2 / 3 ? C2 : C3;
    const gap = Math.min(...[0, 1 / 3, 2 / 3, 1].map((x) => Math.abs(k - x))) * r * 6.3;
    c = mix(c, col, edge(r - 0.34) * smooth(0.004, 0.012, gap + (r < 0.02 ? 1 : 0)));
  } else if (SH === 'spark') {
    // vierzackiger Stern (Gemini-artig) mit Verlauf über alle Kulturfarben
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const d = Math.pow(ax / 0.34, 0.55) + Math.pow(ay / 0.34, 0.55) - 1;
    const ang = Math.atan2(dy, dx);
    c = mix(c, lerp3([C1, C3, C4, C2, C1], (ang + Math.PI) / (2 * Math.PI)), edge(d * 0.08));
  }
  return c;
}
const OUT = process.env.ICON_OUT || 'icons';
mkdirSync(OUT, { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const SS = 4;
  writeFileSync(`${OUT}/${name}`, png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let a = 0; a < SS; a++) for (let b = 0; b < SS; b++) {
      const c = (SH ? shape : sample)((x + (a + 0.5) / SS) / size, (y + (b + 0.5) / SS) / size);
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
    }
    return acc.map((v) => Math.max(0, Math.min(255, Math.round(v / (SS * SS)))));
  }));
}
console.log('Icons geschrieben.');
