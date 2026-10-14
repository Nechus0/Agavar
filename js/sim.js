// Simulations-Engine: runde Agarplatte als Zellraster, jede belegte Zelle ist ein Bakterium.
// Unabhängig von der Oberfläche, damit sie auch in Node (Tests, Balancing) läuft.
import { makeRng } from './rng.js';
import { parseStep } from './genome.js';

export const PLATE_SIZES = { klein: 100, mittel: 140, gross: 180 };
export const NUTRIENT_AMOUNTS = { wenig: 45, normal: 70, viel: 100 };
export const NUTRIENT_REGEN = { aus: 0, langsam: 0.06, normal: 0.15, schnell: 0.3 };
export const DISTRIBUTIONS = ['gleichmaessig', 'flecken', 'ring', 'zentrum', 'rauschen', 'poren', 'schnitt'];

export const MAX_TICKS = 4000;
const MAX_ENERGY = 100;
const START_ENERGY = 50;
const DOMINANCE_SHARE = 0.97;
const DOMINANCE_TICKS = 250;
const SPORE_LIFE = 400;

const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

// Spielwerte der Eigenschaften an den Stützstellen 0, 2, 4 … 10 (dazwischen linear).
const T = {
  moveChance: [0.25, 0.4, 0.55, 0.75, 0.95, 0.98],
  maxAge: [50, 80, 115, 155, 200, 250],
  efficiency: [0.5, 0.64, 0.78, 0.9, 1.0, 1.08],
  chemo: [0, 0.05, 0.1, 0.15, 0.2, 0.25],
  // Stoffwechsel: sparsam = weniger Verbrauch und effizienter, gefräßig = frisst schneller
  uptake: [2.0, 2.8, 3.6, 4.4, 5.2],
  basal: [0.22, 0.32, 0.43, 0.55, 0.68],
  divideAt: [26, 38, 52, 66, 80],
};
// Stufe 0–10 einer Eigenschaft in den Spielwert übersetzen
const level = (table, v) => {
  const x = Math.max(0, Math.min(10, Number(v) || 0)) / 2;
  const i = Math.min(table.length - 2, Math.floor(x));
  return table[i] + (table[i + 1] - table[i]) * (x - i);
};
// Stoffwechsel und Teilung sind stufenlos (0–4 mit Nachkommastellen): zwischen den Tabellenwerten interpolieren
export const between = (table, x) => {
  const v = Math.max(0, Math.min(table.length - 1, Number(x) || 0));
  const i = Math.min(table.length - 2, Math.floor(v));
  return table[i] + (table[i + 1] - table[i]) * (v - i);
};
export const FREE_TABLES = T;
const MOVE_COST = 0.3;
const PHOTO_GAIN = 0.45;
export const ROUNDS_PER_HOUR = 4000 / 48;

// Muster in eine flache Aktionsliste übersetzen: "F3" -> F, F, F
const STEP_CODE = { F: 0, R: 1, L: 2, B: 3, P: 4, Z: 5, D: 6, S: 7, M: 8 };
function expandProgram(program) {
  const out = [];
  for (const e of program) {
    const st = parseStep(e);
    if (!st) continue;
    for (let k = 0; k < st.n; k++) out.push(STEP_CODE[st.s]);
  }
  return out.length ? out : [4];
}

export function phenotype(g) {
  const sp = new Set([g.special, g.bonusSpecial]);
  return {
    program: expandProgram(g.program),
    moveChance: level(T.moveChance, g.speed),
    maxAge: Math.round(level(T.maxAge, g.lifespan)),
    efficiency: level(T.efficiency, g.efficiency),
    uptake: between(T.uptake, g.metabolism),
    basal: between(T.basal, g.metabolism),
    divideAt: between(T.divideAt, g.division),
    attack: g.attack / 2,
    defense: g.defense / 2,
    spores: sp.has('spores'),
    chemoChance: level(T.chemo, g.chemotaxis),
    capsule: sp.has('capsule'),
    photo: sp.has('photo'),
    predator: sp.has('predator'),
    biofilm: sp.has('biofilm'),
    toxin: sp.has('toxin'),
  };
}

// Energiebilanz einer Zelle pro Runde (für die Anzeige im Editor).
// Bewegungsanteil = Anteil der Musterschritte, bei denen sich die Zelle bewegt (Warten kostet nichts).
export function energyProfile(g) {
  const ph = phenotype(g);
  const moveFrac = ph.program.filter((c) => c !== 4).length / ph.program.length;
  const basal = ph.basal;
  const move = ph.moveChance * moveFrac * MOVE_COST;
  const photo = ph.photo ? PHOTO_GAIN : 0;
  const intake = ph.uptake * ph.efficiency + photo;
  const birth = (ph.divideAt - 2) / 2; // Startenergie einer Tochterzelle
  const cost = basal + move;
  return {
    basal, move, cost, photo, intake, moveFrac, moveChance: ph.moveChance, divideAt: ph.divideAt, birth,
    net: intake - cost,
    roundsToDivide: intake - cost > 0 ? (ph.divideAt - birth) / (intake - cost) : Infinity,
    roundsWithoutFood: cost - photo > 0 ? birth / (cost - photo) : Infinity,
    maxAge: ph.maxAge,
  };
}

function nutrientField(dist, nx, ny, rng) {
  // nx, ny in [-1, 1] relativ zum Plattenmittelpunkt; liefert 0..1
  const r = Math.hypot(nx, ny);
  switch (dist) {
    case 'ring': return 0.2 + 0.8 * Math.exp(-(((r - 0.62) / 0.17) ** 2));
    case 'zentrum': return 0.12 + 0.88 * Math.max(0, 1 - r) ** 1.3;
    case 'rauschen': return 0.15 + 0.85 * rng();
    default: return 1;
  }
}

export class Simulation {
  /**
   * opts: { genomes: [...], size, distribution, amount, regen, seed }
   * genomes[0] ist der Spieler.
   */
  constructor(opts) {
    this.opts = opts;
    this.seed = opts.seed >>> 0;
    this.rng = makeRng(this.seed);
    this.N = PLATE_SIZES[opts.size] || PLATE_SIZES.mittel;
    this.players = opts.genomes.map((g, i) => ({
      id: i + 1,
      genome: g,
      ph: phenotype(g),
      count: 0,
      peak: 0,
      kills: 0,
      extinctAt: -1,
      // Statistik für die Auswertung nach dem Spiel
      died: { starve: 0, age: 0, fight: 0, toxin: 0, env: 0 },
      // Wirkung der Elemente auf diese Kultur (für die Auswertung)
      env: { abx: 0, phage: 0, immune: 0, sun: 0, acid: 0, salt: 0, heat: 0, drift: 0, honey: 0 },
      killedBy: new Array(opts.genomes.length + 1).fill(0), // killedBy[id] = von Spieler id getötete Zellen
      peakShare: 0, // höchster Anteil an allen lebenden Zellen
      peakPlate: 0, // höchster Anteil an der Plattenfläche
      lowShareAfterContact: 1, // niedrigster Anteil nach dem ersten Kontakt (für Comebacks)
    }));
    this.contactTick = -1; // erster Kampf zwischen zwei Kulturen
    this.tick = 0;
    this.done = false;
    this.winner = 0; // 0 = unentschieden / niemand
    this.endReason = '';
    this.dominanceTicks = 0;
    this.history = [];
    this._init();
  }

  _init() {
    const N = this.N, size = N * N;
    const rng = this.rng;
    this.inPlate = new Uint8Array(size);
    this.owner = new Uint8Array(size);
    this.energy = new Float32Array(size);
    this.age = new Uint16Array(size);
    this.maxAge = new Uint16Array(size);
    this.dir = new Uint8Array(size);
    this.step = new Uint8Array(size);
    this.still = new Uint8Array(size);
    this.mirror = new Uint8Array(size); // Seitenwechsel aktiv?
    this.fog = new Uint8Array(size); // sichtbare Giftwolke (klingt ab)
    this.bite = new Uint8Array(size); // sichtbare Fraßspur von Räubern (klingt ab)
    this.shield = new Uint8Array(size); // intakte Kapsel
    this.spore = new Uint16Array(size); // >0: Spore, Wert = Alter als Spore
    this.stamp = new Uint32Array(size);
    this.nutrient = new Float32Array(size);
    this.nutrientMax = new Float32Array(size);
    this.order = new Int32Array(size);

    const c = (N - 1) / 2, R = N / 2 - 0.5;
    const amount = NUTRIENT_AMOUNTS[this.opts.amount] ?? NUTRIENT_AMOUNTS.normal;
    const dist = this.opts.distribution || 'gleichmaessig';
    const blobs = [];
    if (dist === 'flecken') {
      for (let k = 0; k < 9; k++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 0.85;
        blobs.push([Math.cos(a) * d, Math.sin(a) * d, 0.12 + rng() * 0.16]);
      }
    }
    // skin: many small rich spots (pores, sweat glands) on a thinner base
    if (dist === 'poren') {
      for (let k = 0; k < 34; k++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 0.95;
        blobs.push([Math.cos(a) * d, Math.sin(a) * d, 0.05 + rng() * 0.04]);
      }
    }
    // skin: a cut – a rich stripe of blood and plasma across the plate
    const cutAngle = dist === 'schnitt' ? rng() * Math.PI : 0;
    let cells = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const nx = (x - c) / R, ny = (y - c) / R;
        if (nx * nx + ny * ny > 1) continue;
        const i = y * N + x;
        this.inPlate[i] = 1;
        cells++;
        let f;
        if (dist === 'flecken' || dist === 'poren') {
          f = dist === 'poren' ? 0.42 : 0.12;
          for (const [bx, by, br] of blobs) f += Math.exp(-(((nx - bx) ** 2 + (ny - by) ** 2) / (br * br)));
          f = Math.min(1, f);
        } else if (dist === 'schnitt') {
          const off = nx * Math.sin(cutAngle) - ny * Math.cos(cutAngle);
          f = 0.3 + 0.7 * Math.exp(-((off / 0.2) ** 2));
        } else {
          f = nutrientField(dist, nx, ny, rng);
        }
        this.nutrientMax[i] = f * amount;
        this.nutrient[i] = f * amount;
      }
    }
    this.plateCells = cells;
    this.regen = NUTRIENT_REGEN[this.opts.regen] ?? NUTRIENT_REGEN.langsam;

    // Startkolonien gleichmäßig auf einem Kreis verteilen.
    const n = this.players.length;
    const offset = rng() * Math.PI * 2;
    const startR = n === 1 ? 0 : R * 0.58;
    this.starts = [];
    this.players.forEach((p, k) => {
      const a = offset + (k / n) * Math.PI * 2;
      const startDir = rng.int(8); // ganze Startkolonie blickt in dieselbe Richtung
      const sx = Math.round(c + Math.cos(a) * startR);
      const sy = Math.round(c + Math.sin(a) * startR);
      this.starts.push([sx, sy]);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > 5) continue;
          const i = (sy + dy) * N + (sx + dx);
          if (!this.inPlate[i] || this.owner[i]) continue;
          this._place(i, p, START_ENERGY, startDir);
        }
      }
    });
    this.notices = [];
    this._initElements();
    this._count();
    this._record();
  }

  _place(i, p, energy, dir, parent = -1) {
    this.owner[i] = p.id;
    this.energy[i] = energy;
    this.age[i] = 0;
    this.maxAge[i] = Math.round(p.ph.maxAge * (0.8 + this.rng() * 0.4));
    this.dir[i] = dir;
    // Tochterzellen übernehmen den Musterfortschritt der Mutter, damit Kolonien im Takt bleiben
    this.step[i] = parent >= 0 ? this.step[parent] : 0;
    this.mirror[i] = parent >= 0 ? this.mirror[parent] : 0;
    this.shield[i] = p.ph.capsule ? 1 : 0;
    this.still[i] = 0;
    this.spore[i] = 0;
    this.stamp[i] = this.tick + 1;
    if (this.infected) this.infected[i] = 0;
  }

  // cause: 'starve' | 'age' | 'fight' | 'toxin'; killer = Spieler-id bei Kampf/Toxin
  _kill(i, cause = 'starve', killer = 0, src = '') {
    const victim = this.players[this.owner[i] - 1];
    if (victim) {
      victim.died[cause]++;
      if (killer) victim.killedBy[killer]++;
      // wo ist die Zelle gestorben? – damit die Auswertung den Elementen ihre Wirkung zuschreiben kann
      if (src) victim.env[src]++;
      else if (this.envOn && (cause === 'starve' || cause === 'age')) {
        if (this.light && this.light[i] > 0.5) victim.env.sun++;
        if (cause === 'starve' && this.salt && this.salt[i] > 0.1) victim.env.salt++;
        if (cause === 'age' && this.acid && this.acid[i] > 0.3) victim.env.acid++;
        if (cause === 'age' && this.temp && this.temp[i] > 0.3) victim.env.heat++;
      }
    }
    this.owner[i] = 0;
    this.spore[i] = 0;
    if (this.infected) this.infected[i] = 0;
    // Abgestorbene Zellen geben etwas Nahrung an den Boden zurück.
    this.nutrient[i] = Math.min(this.nutrient[i] + 4 + Math.max(0, this.energy[i]) * 0.2, Math.max(this.nutrientMax[i], 20));
    this.energy[i] = 0;
  }

  _move(from, to) {
    this.owner[to] = this.owner[from];
    this.energy[to] = this.energy[from];
    this.age[to] = this.age[from];
    this.maxAge[to] = this.maxAge[from];
    this.dir[to] = this.dir[from];
    this.step[to] = this.step[from];
    this.mirror[to] = this.mirror[from];
    this.shield[to] = this.shield[from];
    this.still[to] = 0;
    this.spore[to] = 0;
    this.stamp[to] = this.tick + 1;
    this.owner[from] = 0;
    this.energy[from] = 0;
    if (this.infected) { this.infected[to] = this.infected[from]; this.infected[from] = 0; }
  }

  _neighbor(i, d) {
    const N = this.N;
    const x = (i % N) + DX[d], y = ((i / N) | 0) + DY[d];
    if (x < 0 || y < 0 || x >= N || y >= N) return -1;
    const j = y * N + x;
    return this.inPlate[j] && !(this.wall && this.wall[j]) ? j : -1;
  }

  _defense(j) {
    const q = this.players[this.owner[j] - 1].ph;
    let d = q.defense + this.energy[j] / 50;
    if (this.spore[j]) d = q.defense + 3; // Sporenhülle
    else if (q.biofilm && this.still[j] >= 2) d += 3.5; // Schleimschicht
    return d;
  }

  // Ein Simulationsschritt.
  step1() {
    if (this.done) return;
    const N = this.N, rng = this.rng, size = N * N;
    const owner = this.owner, energy = this.energy, nutrient = this.nutrient;
    this.tick++;
    const tick = this.tick;

    // Giftwolken verblassen
    const fog = this.fog;
    const bite = this.bite;
    for (let i = 0; i < size; i++) { if (fog[i]) fog[i]--; if (bite[i]) bite[i]--; }
    if (this.envOn) this._elementsTick();

    // Nahrung wächst nach (an Salzkristallen schneller).
    const salt = this.salt;
    if (this.regen > 0 || salt) {
      const nm = this.nutrientMax, r = this.regen;
      for (let i = 0; i < size; i++) {
        const ri = salt ? r + salt[i] * 0.5 : r;
        if (ri > 0 && nutrient[i] < nm[i]) nutrient[i] = Math.min(nm[i], nutrient[i] + ri * (0.3 + nm[i] / 100));
      }
    }
    const env = this.envOn;
    const { temp, acid, light, abx, infected, lysis } = this;
    const flow = this.flow;

    // Belegte Zellen in zufälliger Reihenfolge abarbeiten (fair für alle Spieler).
    let n = 0;
    const order = this.order;
    for (let i = 0; i < size; i++) if (owner[i]) order[n++] = i;
    for (let k = n - 1; k > 0; k--) {
      const m = (rng() * (k + 1)) | 0;
      const t = order[k]; order[k] = order[m]; order[m] = t;
    }

    for (let k = 0; k < n; k++) {
      const i = order[k];
      const o = owner[i];
      if (!o || this.stamp[i] === tick + 1) continue;
      const p = this.players[o - 1];
      const ph = p.ph;

      // Sporen ruhen, bis wieder Nahrung da ist.
      if (this.spore[i]) {
        this.spore[i]++;
        if (this.spore[i] > SPORE_LIFE) { this._kill(i, 'starve'); continue; }
        if (nutrient[i] >= 6) { this.spore[i] = 0; energy[i] = 25; this.age[i] = 0; }
        continue;
      }

      // Phagen: infizierte Zellen platzen nach kurzer Zeit und stecken Nachbarn derselben Kolonie an
      if (infected && infected[i]) {
        if (++infected[i] > 7) {
          this._kill(i, 'env', 0, 'phage');
          lysis[i] = 16;
          this._infectAround(i, o, 3, 0.5);
        }
        continue;
      }

      // Altern und Grundumsatz
      this.age[i]++;
      const slimy = ph.biofilm && this.still[i] >= 2;
      // Biofilm: stillstehende Zellen im Schleim sparen Energie
      energy[i] -= slimy ? ph.basal * 0.7 : ph.basal;
      // Kapsel wächst langsam nach
      if (ph.capsule && !this.shield[i] && rng() < 0.02) this.shield[i] = 1;

      let uptake = ph.uptake, moveChance = ph.moveChance, lightHere = 1;
      if (env) {
        // warme Seite: alles läuft schneller, kalte Seite: alles langsamer
        if (temp) {
          const t = temp[i];
          energy[i] -= ph.basal * 0.45 * t;
          uptake *= 1 + 0.4 * t;
          moveChance = Math.min(1, moveChance * (1 + 0.4 * t));
          if (t > 0 && rng() < t * 0.6) this.age[i]++;
        }
        // saure Seite: Zellen altern schneller, Abwehr und Schleim schützen
        if (acid && acid[i] > 0.03) {
          const guard = slimy ? 0.1 : Math.max(0.1, 1 - ph.defense / 4);
          if (rng() < acid[i] * guard) this.age[i] += 3;
        }
        // Sonne: trocknet aus, Schatten schützt, Schleim auch
        if (light) {
          lightHere = light[i];
          energy[i] -= lightHere * 0.6 * (slimy ? 0.35 : this.shield[i] ? 0.7 : 1);
        }
        // Salz: zieht Wasser aus der Zelle
        if (salt && salt[i] > 0.02) energy[i] -= salt[i] * (slimy ? 1.2 : 2);
        // Antibiotikum: tötet im Hemmhof, Kapsel und Biofilm halten länger durch
        if (abx && abx[i] > 0.02) {
          let k = abx[i] * 0.06;
          if (this.shield[i]) k *= 0.6;
          if (slimy) k *= 0.25;
          if (rng() < k) { this._kill(i, 'env', 0, 'abx'); continue; }
        }
      }

      // Fressen
      const take = Math.min(nutrient[i], uptake);
      nutrient[i] -= take;
      energy[i] += take * ph.efficiency;
      if (ph.photo) energy[i] += PHOTO_GAIN * (light ? 0.4 + lightHere : 1); // Energie aus Licht
      if (energy[i] > MAX_ENERGY) energy[i] = MAX_ENERGY;

      if (this.age[i] > this.maxAge[i]) {
        // Sporenbildner überdauern auch das Alter als Spore
        if (ph.spores) { this.spore[i] = 1; energy[i] = 0; } else this._kill(i, 'age');
        continue;
      }
      if (energy[i] <= 0) {
        if (ph.spores) { this.spore[i] = 1; energy[i] = 0; } else this._kill(i, 'starve');
        continue;
      }

      // Toxine: schwächen eine zufällige gegnerische Nachbarzelle (sichtbar als Wolke).
      if (ph.toxin && rng() < 0.35) {
        const j = this._neighbor(i, rng.int(8));
        if (j >= 0) fog[j] = 8;
        if (j >= 0 && owner[j] && owner[j] !== o && !this.spore[j]) {
          energy[j] -= 9;
          energy[i] -= 0.3;
          if (this.contactTick < 0) this.contactTick = tick;
          if (energy[j] <= 0) { this._kill(j, 'toxin', o); p.kills++; }
        }
      }

      // Bewegung nach dem Muster
      let cur = i;
      if (rng() < moveChance) {
        const prog = ph.program;
        const s = prog[this.step[i] % prog.length];
        this.step[i] = (this.step[i] + 1) % prog.length;
        let d = this.dir[i];
        let moves = true;
        const mir = this.mirror[i] ? -1 : 1;
        switch (s) {
          case 1: d = (d + mir + 8) & 7; break;
          case 2: d = (d - mir + 8) & 7; break;
          case 3: d = (d + 4) & 7; break;
          case 4: moves = false; break;
          case 5: d = rng.int(8); break;
          case 6: d = (d + 2 * mir + 8) & 7; break;
          case 7: d = (d - 2 * mir + 8) & 7; break;
          case 8: this.mirror[i] ^= 1; break;
        }
        if (moves && ph.chemoChance && rng() < ph.chemoChance) {
          let best = -1, bestN = -1;
          for (const dd of [d, (d + 1) & 7, (d + 7) & 7, (d + 2) & 7, (d + 6) & 7]) {
            const j = this._neighbor(i, dd);
            if (j < 0 || owner[j] === o) continue;
            const v = nutrient[j] + (owner[j] ? 0 : 1);
            if (v > bestN) { bestN = v; best = dd; }
          }
          if (best >= 0) d = best;
        }
        this.dir[i] = d;
        if (moves) {
          const j = this._neighbor(i, d);
          energy[i] -= MOVE_COST;
          if (j < 0) {
            this.dir[i] = (d + 4) & 7; // Rand der Platte: umdrehen
          } else if (!owner[j]) {
            this._move(i, j);
            cur = j;
          } else if (owner[j] !== o) {
            // Kampf
            if (this.contactTick < 0) this.contactTick = tick;
            const atk = ph.attack + (ph.predator ? 1 : 0) + rng() * 3;
            const def = this._defense(j) + rng() * 3;
            if (atk > def + 0.5 && this.shield[j]) {
              this.shield[j] = 0; // Kapsel fängt den Angriff ab
              energy[i] -= 3;
            } else if (atk > def + 0.5) {
              this._kill(j, 'fight', o);
              p.kills++;
              energy[i] -= 1.5;
              if (ph.predator) { energy[i] = Math.min(MAX_ENERGY, energy[i] + 25); bite[j] = 12; }
              this._move(i, j);
              cur = j;
            } else {
              energy[i] -= 3;
            }
          }
        }
      }
      // Strömung schiebt Zellen weiter, Biofilm klebt fest
      if (flow && cur === i && !(ph.biofilm && this.still[i] >= 2) && rng() < flow.p) {
        const j = this._neighbor(i, flow.d);
        if (j >= 0 && !owner[j]) { this._move(i, j); cur = j; p.env.drift++; }
      }
      if (cur === i) { if (this.still[i] < 255) this.still[i]++; }
      if (energy[cur] <= 0) {
        if (ph.spores) { this.spore[cur] = 1; energy[cur] = 0; } else this._kill(cur, 'starve');
        continue;
      }

      // Teilung
      if (energy[cur] >= ph.divideAt) {
        const start = rng.int(8);
        const first = this.dir[cur];
        let target = -1, td = 0;
        for (let q = -1; q < 8; q++) {
          const dd = q < 0 ? first : (start + q) & 7;
          const j = this._neighbor(cur, dd);
          if (j >= 0 && !owner[j]) { target = j; td = dd; break; }
        }
        if (target >= 0) {
          const e = (energy[cur] - 2) / 2;
          energy[cur] = e;
          this._place(target, p, e, this.dir[cur], cur);
        }
      }
    }

    this._count();
    if (tick % 5 === 0) this._record();
    this._checkEnd();
  }

  // ---------- Elemente auf der Platte (Steine, Antibiotika, Sonne, Phagen …) ----------
  _initElements() {
    const E = this.opts.elements || [];
    this.envOn = E.length > 0;
    if (!this.envOn) return;
    const N = this.N, size = N * N, rng = this.rng;
    const c = (N - 1) / 2, R = N / 2 - 0.5;
    this.R = R;
    this.wall = new Uint8Array(size);
    this.discs = []; this.moulds = []; this.pulses = []; this.immune = []; this.phageAt = []; this.immuneAt = -1;
    this.lysis = null;
    const nearStart = (x, y, d) => this.starts.some(([sx, sy]) => (x - sx) ** 2 + (y - sy) ** 2 < d * d);
    const freeSpot = (minR, maxR, keep) => {
      for (let t = 0; t < 60; t++) {
        const a = rng() * Math.PI * 2, d = minR + Math.sqrt(rng()) * (maxR - minR);
        const x = c + Math.cos(a) * d * R, y = c + Math.sin(a) * d * R;
        if (!nearStart(x, y, keep)) return [x, y];
      }
      return [c, c];
    };
    const field = (fn) => {
      const f = new Float32Array(size);
      for (let i = 0; i < size; i++) if (this.inPlate[i]) f[i] = fn((i % N - c) / R, ((i / N | 0) - c) / R);
      return f;
    };
    const setWall = (i, kind) => {
      if (!this.inPlate[i] || this.wall[i]) return;
      if (this.owner[i]) this._kill(i, 'env');
      this.wall[i] = kind; this.nutrient[i] = 0; this.nutrientMax[i] = 0;
    };
    for (const e of E) {
      const ang = rng() * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      const side = (nx, ny) => nx * ca + ny * sa; // -1 … 1 quer über die Platte
      switch (e.type) {
        case 'stones': {
          for (let k = 0; k < (e.count || 6); k++) {
            const rr = R * (0.05 + rng() * 0.06);
            const [x0, y0] = freeSpot(0.1, 0.85, rr + 7);
            const ph1 = rng() * 6, ph2 = rng() * 6;
            for (let y = Math.floor(y0 - rr * 1.4); y <= y0 + rr * 1.4; y++) for (let x = Math.floor(x0 - rr * 1.4); x <= x0 + rr * 1.4; x++) {
              if (x < 0 || y < 0 || x >= N || y >= N) continue;
              const a = Math.atan2(y - y0, x - x0);
              const edge = rr * (1 + 0.22 * Math.sin(a * 3 + ph1) + 0.12 * Math.sin(a * 5 + ph2));
              if (Math.hypot(x - x0, y - y0) <= edge) setWall(y * N + x, 1);
            }
          }
          break;
        }
        case 'salt': {
          this.salt = this.salt || new Float32Array(size);
          for (let k = 0; k < (e.count || 5); k++) {
            const rr = R * (0.03 + rng() * 0.02);
            const [x0, y0] = freeSpot(0.15, 0.85, rr * 5 + 6);
            const zone = rr * 5;
            for (let y = Math.floor(y0 - zone); y <= y0 + zone; y++) for (let x = Math.floor(x0 - zone); x <= x0 + zone; x++) {
              if (x < 0 || y < 0 || x >= N || y >= N) continue;
              const i = y * N + x, d = Math.hypot(x - x0, y - y0);
              if (!this.inPlate[i]) continue;
              // eckiger Kristall (Raute), darum herum die salzige Zone
              if (Math.abs(x - x0) + Math.abs(y - y0) <= rr * 1.25) { setWall(i, 2); continue; }
              const sv = Math.max(0, 1 - d / zone);
              if (sv > this.salt[i]) this.salt[i] = sv;
              if (!this.wall[i]) { this.nutrientMax[i] = Math.min(100, this.nutrientMax[i] + 45 * sv); this.nutrient[i] = this.nutrientMax[i]; }
            }
          }
          break;
        }
        case 'acid': this.acid = field((nx, ny) => Math.max(0, (side(nx, ny) + 0.15) / 1.15) ** 1.4 * (e.strength || 1)); this.acidAngle = ang; break;
        case 'heat': this.temp = field((nx, ny) => Math.max(-1, Math.min(1, side(nx, ny) * 1.2)) * (e.strength || 1)); this.heatAngle = ang; break;
        case 'sun': this.light = field((nx, ny) => 1 / (1 + Math.exp(-side(nx, ny) * 10))); this.sunAngle = ang; break;
        case 'flow': {
          const d = Math.round((Math.atan2(sa, ca) / (Math.PI / 4)) + 8 + 2) & 7; // Raster-Richtung (0 = oben)
          this.flow = { d, p: 0.09 * (e.strength || 1) };
          this.flowAngle = Math.atan2(DY[d], DX[d]);
          break;
        }
        case 'disc': this.discs.push({ at: e.at || 0, where: e.where || 'center', life: e.life || 2400, r: R * 0.065, halo: R * (e.halo || 0.32), x: c, y: c, placed: false }); break;
        case 'mould': {
          const [x, y] = e.where === 'center' ? [c, c] : freeSpot(0.1, 0.5, R * 0.35);
          this.moulds.push({ at: e.at || 0, x, y, r0: R * 0.04, max: R * (e.size || 0.2), grow: e.grow || 3000, placed: false });
          break;
        }
        case 'sugar': {
          for (let t = e.first || 450; t < MAX_TICKS - 100; t += e.every || 750) {
            const [x, y] = freeSpot(0, 0.75, 0);
            this.pulses.push({ warn: t - Math.round(ROUNDS_PER_HOUR), at: t, x, y, r: R * 0.17, amount: e.amount || 80 });
          }
          break;
        }
        case 'phage': this.phageAt = e.at || [1200, 2300, 3300]; break;
        case 'immune': {
          this.immuneAt = e.at ?? 700;
          for (let k = 0; k < (e.count || 2); k++) {
            const a = rng() * Math.PI * 2;
            this.immune.push({ x: c + Math.cos(a) * R * 0.9, y: c + Math.sin(a) * R * 0.9, r: R * 0.075, tx: c, ty: c, on: false, wob: rng() * 6 });
          }
          break;
        }
      }
    }
    if (this.discs.length || this.moulds.length) this.abx = new Float32Array(size);
    if (this.phageAt.length) { this.infected = new Uint8Array(size); this.lysis = new Uint8Array(size); }
    this._placeTimed();
    if (this.abx) this._updateAbx();
  }

  // Phagen springen auf Zellen derselben Kolonie in der Nähe über (Kapseln schützen meist)
  _infectAround(i, o, rad, chance) {
    const N = this.N, x0 = i % N, y0 = (i / N) | 0, inf = this.infected;
    for (let y = Math.max(0, y0 - rad); y <= Math.min(N - 1, y0 + rad); y++) {
      for (let x = Math.max(0, x0 - rad); x <= Math.min(N - 1, x0 + rad); x++) {
        const j = y * N + x;
        if (this.owner[j] !== o || inf[j] || this.spore[j]) continue;
        if (this.rng() < (this.shield[j] ? chance * 0.3 : chance)) inf[j] = 1;
      }
    }
  }

  _notice(kind, extra = {}) { this.notices.push({ tick: this.tick, kind, ...extra }); }

  // größte Kolonie: Spieler-id und Schwerpunkt
  _leader() {
    const N = this.N, n = this.players.length;
    const sx = new Float64Array(n + 1), sy = new Float64Array(n + 1), cnt = new Uint32Array(n + 1);
    const owner = this.owner;
    for (let i = 0; i < owner.length; i++) { const o = owner[i]; if (o) { sx[o] += i % N; sy[o] += (i / N) | 0; cnt[o]++; } }
    let best = 0;
    for (let o = 1; o <= n; o++) if (cnt[o] > (cnt[best] || 0)) best = o;
    return best ? { id: best, x: sx[best] / cnt[best], y: sy[best] / cnt[best] } : null;
  }

  _placeTimed() {
    const N = this.N, tick = this.tick;
    for (const d of this.discs) {
      if (d.placed || tick < d.at) continue;
      if (d.where === 'leader') { const l = this._leader(); if (l) { d.x = l.x; d.y = l.y; d.target = l.id; } }
      d.placed = true; d.t0 = tick;
      for (let y = Math.floor(d.y - d.r); y <= d.y + d.r; y++) for (let x = Math.floor(d.x - d.r); x <= d.x + d.r; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N || Math.hypot(x - d.x, y - d.y) > d.r) continue;
        const i = y * N + x;
        if (!this.inPlate[i]) continue;
        if (this.owner[i]) this._kill(i, 'env', 0, 'abx');
        this.wall[i] = 4; this.nutrient[i] = 0; this.nutrientMax[i] = 0;
      }
      if (tick > 0) this._notice('disc', { target: d.target || 0 });
    }
    for (const m of this.moulds) if (!m.placed && tick >= m.at) { m.placed = true; m.t0 = tick; if (tick > 0) this._notice('mould'); }
  }

  _updateAbx() {
    const N = this.N, abx = this.abx, tick = this.tick;
    abx.fill(0);
    const paint = (x0, y0, inner, outer, strength) => {
      for (let y = Math.max(0, Math.floor(y0 - outer)); y <= Math.min(N - 1, y0 + outer); y++) {
        for (let x = Math.max(0, Math.floor(x0 - outer)); x <= Math.min(N - 1, x0 + outer); x++) {
          const d = Math.hypot(x - x0, y - y0);
          if (d > outer) continue;
          const v = d <= inner ? strength : strength * Math.min(1, 1.5 * (1 - (d - inner) / Math.max(1, outer - inner)));
          const i = y * N + x;
          if (v > abx[i]) abx[i] = v;
        }
      }
    };
    for (const d of this.discs) {
      if (!d.placed) continue;
      const fade = Math.max(0, 1 - (tick - d.t0) / d.life);
      if (fade <= 0) continue;
      d.cur = d.r + (d.halo - d.r) * Math.sqrt(fade);
      paint(d.x, d.y, d.r, d.cur, 1);
    }
    for (const m of this.moulds) {
      if (!m.placed) continue;
      const rad = m.r0 + (m.max - m.r0) * Math.min(1, (tick - m.t0) / m.grow);
      m.cur = rad;
      // die Schimmelkolonie wächst über die Platte und verdrängt alles
      for (let y = Math.floor(m.y - rad); y <= m.y + rad; y++) for (let x = Math.floor(m.x - rad); x <= m.x + rad; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const i = y * N + x;
        const a = Math.atan2(y - m.y, x - m.x);
        if (!this.inPlate[i] || this.wall[i] || Math.hypot(x - m.x, y - m.y) > rad * (1 + 0.12 * Math.sin(a * 7 + m.x))) continue;
        if (this.owner[i]) this._kill(i, 'env', 0, 'abx');
        this.wall[i] = 3; this.nutrient[i] = 0; this.nutrientMax[i] = 0;
      }
      paint(m.x, m.y, rad, rad * 1.8 + 3, 0.9);
    }
  }

  _elementsTick() {
    const tick = this.tick, N = this.N, rng = this.rng;
    if (this.discs.length || this.moulds.length) {
      this._placeTimed();
      if (tick % 10 === 0) this._updateAbx();
    }
    if (this.lysis) for (let i = 0; i < this.lysis.length; i++) if (this.lysis[i]) this.lysis[i]--;
    // Honigtropfen: erst angekündigt, dann landet frisches Futter
    for (const p of this.pulses) {
      if (tick === p.warn) this._notice('sugar-warn');
      if (tick === p.at + 80) {
        const cnt = new Uint32Array(this.players.length + 1);
        for (let y = Math.max(0, Math.floor(p.y - p.r)); y <= Math.min(N - 1, p.y + p.r); y++) {
          for (let x = Math.max(0, Math.floor(p.x - p.r)); x <= Math.min(N - 1, p.x + p.r); x++) {
            const o = this.owner[y * N + x];
            if (o && Math.hypot(x - p.x, y - p.y) <= p.r) cnt[o]++;
          }
        }
        let best = 0;
        for (let o = 1; o < cnt.length; o++) if (cnt[o] > (cnt[best] || 0)) best = o;
        if (best) { this.players[best - 1].env.honey++; p.claimedBy = best; }
      }
      if (tick !== p.at) continue;
      for (let y = Math.max(0, Math.floor(p.y - p.r)); y <= Math.min(N - 1, p.y + p.r); y++) {
        for (let x = Math.max(0, Math.floor(p.x - p.r)); x <= Math.min(N - 1, p.x + p.r); x++) {
          const i = y * N + x, d = Math.hypot(x - p.x, y - p.y) / p.r;
          if (d > 1 || !this.inPlate[i] || this.wall[i]) continue;
          this.nutrient[i] = Math.min(100, this.nutrient[i] + p.amount * (1 - d * d));
        }
      }
    }
    // Phagen-Ausbruch in der größten Kolonie, mitten im dichtesten Teil
    if (this.phageAt.includes(tick)) {
      const l = this._leader();
      if (l) {
        let seed = -1, bestN = -1;
        for (let t = 0; t < 400; t++) {
          const i = (rng() * this.owner.length) | 0;
          if (this.owner[i] !== l.id) continue;
          let nb = 0;
          for (let d = 0; d < 8; d++) { const j = this._neighbor(i, d); if (j >= 0 && this.owner[j] === l.id) nb++; }
          if (nb > bestN) { bestN = nb; seed = i; }
          if (nb === 8) break;
        }
        if (seed >= 0) {
          this.infected[seed] = 1;
          this._infectAround(seed, l.id, 3, 1);
          this._notice('phage', { target: l.id });
        }
      }
    }
    // Immunzellen: kommen vom Rand, ziehen zur größten Kolonie und fressen alles, was sie berühren
    if (this.immune.length && tick >= this.immuneAt) {
      if (tick === this.immuneAt) this._notice('immune');
      if (tick % 15 === 0 || tick === this.immuneAt) {
        const l = this._leader();
        if (l) this.immune.forEach((m, k) => { m.tx = l.x + Math.cos(k * 2.4 + tick / 200) * this.R * 0.12; m.ty = l.y + Math.sin(k * 2.4 + tick / 200) * this.R * 0.12; });
      }
      const c = (N - 1) / 2;
      for (const m of this.immune) {
        m.on = true;
        const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy) || 1;
        const sp = 0.2;
        m.x += (dx / d) * sp + Math.cos(tick / 23 + m.wob) * 0.08;
        m.y += (dy / d) * sp + Math.sin(tick / 29 + m.wob) * 0.08;
        const off = Math.hypot(m.x - c, m.y - c), lim = this.R - m.r * 0.5;
        if (off > lim) { m.x = c + ((m.x - c) / off) * lim; m.y = c + ((m.y - c) / off) * lim; }
        for (let y = Math.max(0, Math.floor(m.y - m.r)); y <= Math.min(N - 1, m.y + m.r); y++) {
          for (let x = Math.max(0, Math.floor(m.x - m.r)); x <= Math.min(N - 1, m.x + m.r); x++) {
            const i = y * N + x;
            if (!this.owner[i] || Math.hypot(x - m.x, y - m.y) > m.r || rng() > 0.1) continue;
            if (this.shield[i]) this.shield[i] = 0; else this._kill(i, 'env', 0, 'immune');
          }
        }
      }
    }
  }

  _count() {
    for (const p of this.players) p.count = 0;
    const owner = this.owner, size = owner.length;
    for (let i = 0; i < size; i++) if (owner[i]) this.players[owner[i] - 1].count++;
    const total = this.players.reduce((a, p) => a + p.count, 0) || 1;
    for (const p of this.players) {
      if (p.count > p.peak) p.peak = p.count;
      if (p.count === 0 && p.extinctAt < 0) p.extinctAt = this.tick;
      const share = p.count / total;
      p.share = share;
      if (share > p.peakShare) p.peakShare = share;
      if (p.count / this.plateCells > p.peakPlate) p.peakPlate = p.count / this.plateCells;
      if (this.contactTick >= 0 && share < p.lowShareAfterContact) p.lowShareAfterContact = share;
    }
  }

  _record() {
    this.history.push(this.players.map((p) => p.count));
  }

  _finish(winner, reason) {
    this.done = true;
    this.winner = winner;
    this.endReason = reason;
    if (this.tick % 5 !== 0) this._record();
  }

  _checkEnd() {
    const alive = this.players.filter((p) => p.count > 0);
    const total = alive.reduce((s, p) => s + p.count, 0);
    if (alive.length === 0) return this._finish(0, 'Alle Kulturen sind ausgestorben.');
    if (alive.length === 1 && this.players.length > 1) return this._finish(alive[0].id, 'Last culture standing.');
    const lead = alive.reduce((a, b) => (b.count > a.count ? b : a));
    if (this.players.length > 1 && lead.count / total >= DOMINANCE_SHARE) {
      if (++this.dominanceTicks >= DOMINANCE_TICKS) return this._finish(lead.id, 'Overwhelming dominance.');
    } else this.dominanceTicks = 0;
    if (this.tick >= MAX_TICKS) {
      const tied = alive.filter((p) => p.count === lead.count).length > 1;
      return this._finish(tied ? 0 : lead.id, 'Time is up – the biggest culture wins.');
    }
  }

  run(maxTicks = MAX_TICKS) {
    while (!this.done && this.tick < maxTicks) this.step1();
    return this;
  }
}
