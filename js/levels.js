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

// Eigenschaften 0–10 (Teilung, Stoffwechsel 0–4), passend zum Punktebudget des Levels.
//                                                  Geschw, Leben, Verw., Angr., Abw., Teilung, Stoffw.
export const LEVELS = [
  // ---------- World 1: Skin – only germs that really live on skin or in skin wounds ----------
  {
    name: 'Skin Contact',
    desc: 'Every human carries this germ on their skin. It cannot move – it just grows where it is.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('sepidermidis', '#cc8040', ['P'], [0, 6, 6, 0, 6, 2, 1]),
    opponents: [],
  },
  {
    name: 'Twitching',
    desc: 'Acinetobacter pulls itself across the skin with tiny hooks – forward, back, forward – and attacks whatever it meets.',
    plate: { size: 'klein', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('acinetobacter', '#a040a0', ['F3', 'B'], [3, 3, 5, 5, 3, 2, 2]),
    opponents: [],
  },
  {
    name: 'Hot Tub Rash',
    desc: 'A warm whirlpool: Pseudomonas swims into the hair follicles – straight ahead, then off in a new direction. Micrococcus already lives here.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('paeruginosa', '#38a0b4', ['F3', 'Z'], [4, 1, 1, 1, 1, 2, 2]),
    opponents: [g('mluteus', '#c0a030', ['P'], [0, 3, 3, 1, 3, 3, 1])],
  },
  {
    name: 'The Sore',
    desc: 'Streptococcus pyogenes hides in a slime capsule – every attack must hit twice. Pink Kocuria grabs the free spots.',
    plate: { size: 'mittel', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    boss: g('spyogenes', '#c04878', ['F', 'R'], [2, 2, 2, 1, 2, 2, 2], 'capsule'),
    opponents: [g('kocuria', '#cc8040', ['F2', 'R'], [2, 1, 2, 2, 1, 1, 3], 'none', { chemotaxis: 2 })],
  },
  {
    name: 'Armpit',
    desc: 'Warm, damp and full of sweat: Corynebacterium turns sweat into its smell and grows in angular, snapping steps. Staphylococcus hominis spreads in wide arcs.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('corynebacterium', '#52a83e', ['F', 'D'], [1, 3, 3, 1, 5, 2, 1]),
    opponents: [g('shominis', '#5858c4', ['F4', 'R'], [3, 1, 3, 2, 2, 1, 3])],
  },
  {
    name: 'Sweaty Feet',
    desc: 'Little air, little food between the toes. Brevibacterium makes feet smell, Kytococcus eats pits into the soles.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'wenig', regen: 'normal' },
    boss: g('brevibacterium', '#c0a030', ['F2', 'D'], [2, 2, 3, 3, 3, 2, 0]),
    opponents: [g('kytococcus', '#cc8040', ['F2', 'R'], [3, 1, 3, 3, 3, 1, 2])],
  },
  {
    name: 'Tick Bite',
    desc: 'A tick brings Borrelia, which screws through the skin like a corkscrew. Capsule-wearing Streptococcus agalactiae comes along.',
    plate: { size: 'mittel', distribution: 'zentrum', amount: 'normal', regen: 'normal' },
    boss: g('borrelia', '#cc5252', ['R4', 'M'], [3, 2, 4, 4, 4, 1, 2]),
    opponents: [g('sagalactiae', '#a040a0', ['F'], [4, 2, 3, 5, 3, 1, 3], 'capsule')],
  },
  {
    name: 'The Catheter',
    desc: 'Your first opponent returns: on a plastic tube in the skin, Staphylococcus epidermidis builds a tough biofilm. Staphylococcus hominis helps.',
    plate: { size: 'gross', distribution: 'schnitt', amount: 'normal', regen: 'normal' },
    boss: g('sepidermidis', '#5858c4', ['F', 'P3'], [3, 3, 4, 4, 5, 3, 1], 'biofilm'),
    opponents: [g('shominis', '#cc8040', ['F4', 'R'], [4, 2, 4, 4, 4, 1, 3])],
  },
  {
    name: 'Tropical Sore',
    desc: 'In a skin sore in the tropics, Corynebacterium diphtheriae releases its toxin. Cutibacterium and Kocuria fight for space.',
    plate: { size: 'mittel', distribution: 'rauschen', amount: 'normal', regen: 'normal' },
    boss: g('cdiphtheriae', '#c0a030', ['F2', 'P', 'R'], [3, 3, 4, 5, 5, 2, 2], 'toxin'),
    opponents: [
      g('cacnes', '#a040a0', ['F3', 'B'], [4, 3, 4, 4, 4, 2, 1]),
      g('kocuria', '#38a0b4', ['F'], [4, 2, 4, 5, 5, 1, 3]),
    ],
  },
  {
    name: 'The Abscess',
    desc: 'Chapter boss: Staphylococcus aureus – toxins AND a protective capsule, deep in an infected wound. Two seasoned skin invaders join it.',
    plate: { size: 'gross', distribution: 'schnitt', amount: 'normal', regen: 'normal' },
    boss: g('saureus', '#cc5252', ['F2', 'Z'], [3, 2, 4, 4, 4, 1, 2], 'toxin', { bonusSpecial: 'capsule' }),
    opponents: [
      g('spyogenes', '#c04878', ['F', 'P2', 'R'], [3, 2, 3, 4, 4, 2, 2], 'toxin'),
      g('paeruginosa', '#38a0b4', ['F3', 'Z'], [3, 2, 4, 4, 4, 1, 2], 'none', { chemotaxis: 2 }),
    ],
  },
];

// alle Gegner eines Levels als fertige Genome, der besondere Gegner zuerst
export const levelOpponents = (lv) =>
  [{ ...lv.boss, boss: true }, ...lv.opponents].map((o) => ({ ...normalize({ ...o, name: GERMS[o.germ].name }), germ: o.germ, boss: !!o.boss }));
