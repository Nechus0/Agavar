import { normalize } from './genome.js';
import { GERMS } from './germs.js';

// Die 10 Level der Karriere. In jedem Level wartet ein besonderer Gegner (boss): ein echter Keim,
// dessen typische Eigenschaft man nach dem Sieg selbst einsetzen darf (siehe progression.js).
// Die Gegner wachsen mit: Am Anfang sind sie sehr einfach, später stark und spezialisiert.

const g = (germ, color, program, t, special = 'none', extra = {}) => ({
  germ, color, program,
  speed: t[0], lifespan: t[1], efficiency: t[2], attack: t[3], defense: t[4],
  division: t[5], metabolism: t[6], special, ...extra,
});

//                                                  Geschw, Leben, Verw., Angr., Abw., Teilung, Stoffw.
export const LEVELS = [
  // ---------- World 1: Skin ----------
  {
    name: 'Skin Contact',
    desc: 'Every human carries this germ on their skin. It cannot move – it just grows where it is.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('sepidermidis', '#ff9f43', ['P'], [0, 3, 3, 0, 3, 2, 1]),
    opponents: [],
  },
  {
    name: 'Twitching',
    desc: 'Acinetobacter pulls itself across the skin with tiny hooks – forward, back, forward – and attacks whatever it meets.',
    plate: { size: 'klein', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('acinetobacter', '#c77dff', ['F3', 'B'], [2, 2, 3, 3, 2, 2, 2]),
    opponents: [],
  },
  {
    name: 'Dirty Hands',
    desc: 'Someone forgot to wash their hands: E. coli from the toilet lands on the skin. It swims straight, then tumbles. Micrococcus already lives here.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('ecoli', '#3fa9f5', ['F3', 'Z'], [3, 1, 1, 1, 1, 2, 2]),
    opponents: [g('mluteus', '#ffd23f', ['P'], [0, 2, 2, 1, 2, 3, 1])],
  },
  {
    name: 'The Sore',
    desc: 'Streptococcus pyogenes hides in a slime capsule – every attack must hit twice. Serratia sniffs out the food.',
    plate: { size: 'mittel', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    boss: g('spyogenes', '#ff6ec7', ['F', 'R'], [2, 2, 2, 1, 2, 2, 2], 'capsule'),
    opponents: [g('smarcescens', '#ff5d5d', ['F2', 'R'], [2, 1, 2, 2, 1, 1, 3], 'none', { chemotaxis: 2 })],
  },
  {
    name: 'Armpit',
    desc: 'Warm, damp and full of sweat: Corynebacterium turns sweat into its smell. Proteus swarms across the plate in wide arcs.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('corynebacterium', '#5ee06a', ['F', 'P'], [1, 3, 3, 1, 4, 2, 1]),
    opponents: [g('pmirabilis', '#2ee6d6', ['F4', 'R'], [3, 1, 3, 2, 2, 1, 3])],
  },
  {
    name: 'Rusty Nail',
    desc: 'A deep cut with dirt in it. Little food, little air – Clostridium tetani survives the hunger as a spore.',
    plate: { size: 'mittel', distribution: 'schnitt', amount: 'wenig', regen: 'normal' },
    boss: g('ctetani', '#ffd23f', ['F2', 'D'], [2, 2, 3, 3, 3, 2, 0], 'spores'),
    opponents: [g('pmirabilis', '#ff9f43', ['F2', 'R'], [3, 1, 3, 4, 3, 1, 2])],
  },
  {
    name: 'Tick Bite',
    desc: 'A tick brings Borrelia, which screws through the skin like a corkscrew. A tough Acinetobacter comes along.',
    plate: { size: 'mittel', distribution: 'zentrum', amount: 'normal', regen: 'normal' },
    boss: g('borrelia', '#ff5d5d', ['R4', 'M'], [3, 2, 4, 4, 4, 1, 2]),
    opponents: [g('abaumannii', '#c77dff', ['F'], [4, 2, 3, 5, 3, 1, 3], 'capsule')],
  },
  {
    name: 'Burn Wound',
    desc: 'Pseudomonas aeruginosa digs into its biofilm on burnt skin. Cracking it takes strength.',
    plate: { size: 'gross', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    boss: g('paeruginosa', '#2ee6d6', ['F', 'P3'], [3, 3, 4, 4, 5, 3, 1], 'biofilm'),
    opponents: [g('pmirabilis', '#ff9f43', ['F4', 'R'], [4, 2, 4, 4, 4, 1, 3])],
  },
  {
    name: 'The Boil',
    desc: 'Staphylococcus aureus poisons its neighbours. With it come spore-forming Clostridium tetani and lightning-fast Serratia.',
    plate: { size: 'mittel', distribution: 'rauschen', amount: 'normal', regen: 'normal' },
    boss: g('saureus', '#ffd23f', ['F2', 'P', 'R'], [3, 3, 4, 5, 5, 2, 2], 'toxin'),
    opponents: [
      g('ctetani', '#c77dff', ['F3', 'Z'], [4, 3, 4, 4, 4, 2, 1], 'spores'),
      g('smarcescens', '#3fa9f5', ['F'], [4, 2, 4, 5, 5, 1, 3]),
    ],
  },
  {
    name: 'Gangrene',
    desc: 'Clostridium perfringens: spores AND deadly toxins in a deep wound. Two seasoned skin invaders join it.',
    plate: { size: 'gross', distribution: 'schnitt', amount: 'normal', regen: 'normal' },
    boss: g('cperfringens', '#ff5d5d', ['F2', 'Z'], [3, 2, 4, 4, 5, 1, 2], 'spores', { bonusSpecial: 'toxin' }),
    opponents: [
      g('saureus', '#ffd23f', ['F', 'P2', 'R'], [3, 2, 3, 4, 4, 2, 2], 'toxin'),
      g('pmirabilis', '#3fa9f5', ['F3', 'Z'], [3, 2, 4, 4, 4, 1, 2], 'none', { chemotaxis: 2 }),
    ],
  },
];

// alle Gegner eines Levels als fertige Genome, der besondere Gegner zuerst
export const levelOpponents = (lv) =>
  [{ ...lv.boss, boss: true }, ...lv.opponents].map((o) => ({ ...normalize({ ...o, name: GERMS[o.germ].name }), germ: o.germ, boss: !!o.boss }));
