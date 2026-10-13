// Simulations-Engine: runde Agarplatte als Zellraster, jede belegte Zelle ist ein Bakterium.
// Unabhängig von der Oberfläche, damit sie auch in Node (Tests, Balancing) läuft.
import { makeRng } from './rng.js';
import { parseStep } from './genome.js';

export const PLATE_SIZES = { klein: 100, mittel: 140, gross: 180 };
export const NUTRIENT_AMOUNTS = { wenig: 45, normal: 70, viel: 100 };
export const NUTRIENT_REGEN = { aus: 0, langsam: 0.06, normal: 0.15, schnell: 0.3 };
export const DISTRIBUTIONS = ['gleichmaessig', 'flecken', 'ring', 'zentrum', 'rauschen'];

export const MAX_TICKS = 4000;
const MAX_ENERGY = 100;
const START_ENERGY = 50;
const DOMINANCE_SHARE = 0.97;
const DOMINANCE_TICKS = 250;
const SPORE_LIFE = 400;

const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

// Spielwerte je Stufe der Eigenschaften.
const T = {
  moveChance: [0.25, 0.4, 0.55, 0.75, 0.95],
  maxAge: [50, 80, 115, 155, 200],
  efficiency: [0.5, 0.64, 0.78, 0.92, 1.06],
  uptake: [1.6, 2.5, 3.4, 4.3, 5.2],
  basal: [0.25, 0.34, 0.43, 0.52, 0.61],
  divideAt: [26, 38, 52, 66, 80],
};
const MOVE_COST = 0.3;

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

function phenotype(g) {
  const sp = new Set([g.special, g.bonusSpecial]);
  return {
    program: expandProgram(g.program),
    moveChance: T.moveChance[g.speed],
    maxAge: T.maxAge[g.lifespan],
    efficiency: T.efficiency[g.efficiency],
    uptake: T.uptake[g.metabolism],
    basal: T.basal[g.metabolism],
    divideAt: T.divideAt[g.division],
    attack: g.attack,
    defense: g.defense,
    spores: sp.has('spores'),
    chemoChance: [0, 0.03, 0.06, 0.09, 0.12][g.chemotaxis | 0],
    capsule: sp.has('capsule'),
    photo: sp.has('photo'),
    predator: sp.has('predator'),
    biofilm: sp.has('biofilm'),
    toxin: sp.has('toxin'),
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
      died: { starve: 0, age: 0, fight: 0, toxin: 0 },
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
    let cells = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const nx = (x - c) / R, ny = (y - c) / R;
        if (nx * nx + ny * ny > 1) continue;
        const i = y * N + x;
        this.inPlate[i] = 1;
        cells++;
        let f;
        if (dist === 'flecken') {
          f = 0.12;
          for (const [bx, by, br] of blobs) f += Math.exp(-(((nx - bx) ** 2 + (ny - by) ** 2) / (br * br)));
          f = Math.min(1, f);
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
    this.players.forEach((p, k) => {
      const a = offset + (k / n) * Math.PI * 2;
      const startDir = rng.int(8); // ganze Startkolonie blickt in dieselbe Richtung
      const sx = Math.round(c + Math.cos(a) * startR);
      const sy = Math.round(c + Math.sin(a) * startR);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > 5) continue;
          const i = (sy + dy) * N + (sx + dx);
          if (!this.inPlate[i] || this.owner[i]) continue;
          this._place(i, p, START_ENERGY, startDir);
        }
      }
    });
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
  }

  // cause: 'starve' | 'age' | 'fight' | 'toxin'; killer = Spieler-id bei Kampf/Toxin
  _kill(i, cause = 'starve', killer = 0) {
    const victim = this.players[this.owner[i] - 1];
    if (victim) {
      victim.died[cause]++;
      if (killer) victim.killedBy[killer]++;
    }
    this.owner[i] = 0;
    this.spore[i] = 0;
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
  }

  _neighbor(i, d) {
    const N = this.N;
    const x = (i % N) + DX[d], y = ((i / N) | 0) + DY[d];
    if (x < 0 || y < 0 || x >= N || y >= N) return -1;
    const j = y * N + x;
    return this.inPlate[j] ? j : -1;
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

    // Nahrung wächst nach.
    if (this.regen > 0) {
      const nm = this.nutrientMax, r = this.regen;
      for (let i = 0; i < size; i++) {
        if (nutrient[i] < nm[i]) nutrient[i] = Math.min(nm[i], nutrient[i] + r * (0.3 + nm[i] / 100));
      }
    }

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

      // Altern und Grundumsatz
      this.age[i]++;
      // Biofilm: stillstehende Zellen im Schleim sparen Energie
      energy[i] -= ph.biofilm && this.still[i] >= 2 ? ph.basal * 0.7 : ph.basal;
      // Kapsel wächst langsam nach
      if (ph.capsule && !this.shield[i] && rng() < 0.02) this.shield[i] = 1;

      // Fressen
      const take = Math.min(nutrient[i], ph.uptake);
      nutrient[i] -= take;
      energy[i] += take * ph.efficiency;
      if (ph.photo) energy[i] += 0.45; // Energie aus Licht
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
      if (rng() < ph.moveChance) {
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
    if (alive.length === 1 && this.players.length > 1) return this._finish(alive[0].id, 'Einzige überlebende Kultur.');
    const lead = alive.reduce((a, b) => (b.count > a.count ? b : a));
    if (this.players.length > 1 && lead.count / total >= DOMINANCE_SHARE) {
      if (++this.dominanceTicks >= DOMINANCE_TICKS) return this._finish(lead.id, 'Erdrückende Überlegenheit.');
    } else this.dominanceTicks = 0;
    if (this.tick >= MAX_TICKS) {
      const tied = alive.filter((p) => p.count === lead.count).length > 1;
      return this._finish(tied ? 0 : lead.id, 'Zeit abgelaufen – die größte Kultur gewinnt.');
    }
  }

  run(maxTicks = MAX_TICKS) {
    while (!this.done && this.tick < maxTicks) this.step1();
    return this;
  }
}
