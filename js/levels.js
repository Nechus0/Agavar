import { normalize } from './genome.js';
import { GERMS } from './germs.js';

// Die Level der Karriere (Welt 1: 20 Level). In jedem Level wartet ein besonderer Gegner (boss): ein echter Keim,
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
    note: 'A freshly washed forearm: a thin, even film of sweat and skin oil everywhere. Food grows back steadily.',
    desc: 'Every human carries this germ on their skin. It cannot move – it just grows where it is.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('sepidermidis', '#cc8040', ['P'], [0, 6, 6, 0, 6, 2, 1]),
    opponents: [],
  },
  {
    name: 'Twitching',
    note: 'Skin is mostly dry. Food only collects around pores and sweat glands – small rich spots on a thin base.',
    desc: 'Acinetobacter pulls itself across the skin with tiny hooks – forward, back, forward – and attacks whatever it meets.',
    plate: { size: 'klein', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('acinetobacter', '#a040a0', ['F3', 'B'], [3, 3, 5, 5, 3, 2, 2]),
    opponents: [],
  },
  {
    name: 'Hot Tub Rash',
    note: 'Warm water opened every pore. Rich spots all over the plate, but each one is small.',
    desc: 'A warm whirlpool: Pseudomonas swims into the hair follicles – straight ahead, then off in a new direction. Micrococcus already lives here.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('paeruginosa', '#38a0b4', ['F3', 'Z'], [4, 1, 1, 1, 1, 2, 2]),
    opponents: [g('mluteus', '#c0a030', ['P'], [0, 3, 3, 1, 3, 3, 1])],
  },
  {
    name: 'The Sore',
    note: 'A scratched sore: blood and plasma pooled in a few large patches. Between them the skin is almost bare.',
    desc: 'Streptococcus pyogenes hides in a slime capsule – every attack must hit twice. Pink Kocuria grabs the free spots.',
    plate: { size: 'mittel', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    boss: g('spyogenes', '#c04878', ['F', 'R'], [2, 2, 2, 1, 2, 2, 2], 'capsule'),
    opponents: [g('kocuria', '#cc8040', ['F2', 'R'], [2, 1, 2, 2, 1, 1, 3], 'none', { chemotaxis: 2 })],
  },
  {
    name: 'Armpit',
    note: 'Thousands of sweat glands, refilled all day long. Many small, rich spots that keep coming back.',
    desc: 'Warm, damp and full of sweat: Corynebacterium turns sweat into its smell and grows in angular, snapping steps. Staphylococcus hominis spreads in wide arcs.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'normal', regen: 'normal' },
    boss: g('corynebacterium', '#52a83e', ['F', 'D'], [1, 3, 3, 1, 5, 2, 1]),
    opponents: [g('shominis', '#5858c4', ['F4', 'R'], [3, 1, 3, 2, 2, 1, 3])],
  },
  {
    name: 'Sweaty Feet',
    note: 'Thick, dry skin between the toes. Hardly any food – every spot is precious and gone fast.',
    desc: 'Little air, little food between the toes. Brevibacterium makes feet smell, Kytococcus eats pits into the soles.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'wenig', regen: 'normal' },
    boss: g('brevibacterium', '#c0a030', ['F2', 'D'], [2, 2, 3, 3, 3, 2, 0]),
    opponents: [g('kytococcus', '#cc8040', ['F2', 'R'], [3, 1, 3, 3, 3, 1, 2])],
  },
  {
    name: 'Tick Bite',
    note: 'The tick fed right in the middle. The blood is in the centre; the edges are almost empty.',
    desc: 'A tick brings Borrelia, which screws through the skin like a corkscrew. Capsule-wearing Streptococcus agalactiae comes along.',
    plate: { size: 'mittel', distribution: 'zentrum', amount: 'normal', regen: 'normal' },
    boss: g('borrelia', '#cc5252', ['R4', 'M'], [3, 2, 4, 4, 4, 1, 2]),
    opponents: [g('sagalactiae', '#a040a0', ['F'], [4, 2, 3, 5, 3, 1, 3], 'capsule')],
  },
  {
    name: 'The Catheter',
    note: 'The tube runs straight through the skin. A rich stripe of fluid along it, dry skin on both sides – on a large plate.',
    desc: 'Your first opponent returns: on a plastic tube in the skin, Staphylococcus epidermidis builds a tough biofilm. Staphylococcus hominis helps.',
    plate: { size: 'gross', distribution: 'schnitt', amount: 'normal', regen: 'normal' },
    boss: g('sepidermidis', '#5858c4', ['F', 'P3'], [3, 3, 4, 4, 5, 3, 1], 'biofilm'),
    opponents: [g('shominis', '#cc8040', ['F4', 'R'], [4, 2, 4, 4, 4, 1, 3])],
  },
  {
    name: 'Tropical Sore',
    note: 'Heat and humidity: the food lies in a messy, grainy pattern all over the plate.',
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
    note: 'A deep cut filled with pus. One rich stripe through a large plate – whoever holds it has the food.',
    desc: 'Chapter boss: Staphylococcus aureus – toxins AND a protective capsule, deep in an infected wound. Two seasoned skin invaders join it.',
    plate: { size: 'gross', distribution: 'schnitt', amount: 'normal', regen: 'normal' },
    boss: g('saureus', '#cc5252', ['F2', 'Z'], [3, 2, 4, 4, 4, 1, 2], 'toxin', { bonusSpecial: 'capsule' }),
    opponents: [
      g('spyogenes', '#c04878', ['F', 'P2', 'R'], [3, 2, 3, 4, 4, 2, 2], 'toxin'),
      g('paeruginosa', '#38a0b4', ['F3', 'Z'], [3, 2, 4, 4, 4, 1, 2], 'none', { chemotaxis: 2 }),
    ],
  },
  // ---------- World 1, part 2: the plate itself fights back ----------
  {
    name: 'Gravel Graze',
    note: 'You fell off your bike. Grit and little stones are stuck in the graze – they block the way, and blood pooled in patches between them.',
    desc: 'Staphylococcus lugdunensis looks like a harmless skin germ, but in a graze it turns nasty. Pink Kocuria is already there.',
    plate: { size: 'mittel', distribution: 'flecken', amount: 'normal', regen: 'normal', elements: [{ type: 'stones', count: 7 }] },
    boss: g('slugdunensis', '#cc5252', ['F2', 'R'], [4, 3, 4, 4, 4, 2, 2]),
    opponents: [g('kocuria', '#c04878', ['F', 'L'], [4, 2, 4, 4, 4, 1, 3])],
  },
  {
    name: 'Antiseptic Cream',
    note: 'A dab of antiseptic cream sits in the middle of the cut. Nothing grows close to it – but the cream wears off. And whoever spreads the most gets the next dab.',
    desc: 'Corynebacterium jeikeium shrugs off almost every drug and hides in a tough biofilm. Staphylococcus epidermidis is back as well.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal', elements: [{ type: 'disc', at: 0, where: 'center' }, { type: 'disc', at: 1700, where: 'leader', halo: 0.26 }] },
    boss: g('cjeikeium', '#5858c4', ['F', 'P2'], [3, 4, 4, 4, 5, 2, 1], 'biofilm'),
    opponents: [g('sepidermidis', '#cc8040', ['F2', 'R'], [4, 3, 4, 4, 4, 2, 2])],
  },
  {
    name: 'Beach Towel',
    note: 'A beach day: half of the skin lies under a towel. Plenty of sweat and sunscreen to eat – but the sun dries out everything on the bright side.',
    desc: 'Orange Dermacoccus has its own little sunscreen. Micrococcus luteus is yellow for the same reason.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'viel', regen: 'normal', elements: [{ type: 'sun' }] },
    boss: g('dermacoccus', '#cc8040', ['F3', 'Z'], [4, 4, 4, 4, 5, 2, 1], 'capsule'),
    opponents: [g('mluteus', '#c0a030', ['P'], [0, 5, 5, 4, 5, 3, 1])],
  },
  {
    name: 'Salt Crust',
    note: 'After a long run the sweat has dried. Salt crystals crust the skin and little else is left – except around the crystals, where moisture keeps drawing food out.',
    desc: 'Brevibacterium loves salt – it is also used to make smelly cheese. Cutibacterium waits deep in the pores.',
    plate: { size: 'mittel', distribution: 'poren', amount: 'wenig', regen: 'langsam', elements: [{ type: 'salt', count: 6 }] },
    boss: g('brevibacterium', '#c0a030', ['F2', 'D'], [5, 4, 6, 5, 5, 2, 0]),
    opponents: [g('cacnes', '#a040a0', ['F3', 'B'], [4, 4, 5, 4, 4, 2, 1])],
  },
  {
    name: 'Acid Mantle',
    note: 'Cutibacterium has been turning skin oil into acid for days. One side of the plate is very sour – cells there grow old fast.',
    desc: 'Cutibacterium acnes makes the skin sour and does fine in it. Corynebacterium snaps through the oily skin.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal', elements: [{ type: 'acid' }] },
    boss: g('cacnes', '#a040a0', ['F2', 'R', 'F'], [4, 5, 5, 4, 6, 2, 2]),
    opponents: [g('corynebacterium', '#52a83e', ['F', 'D'], [4, 4, 4, 5, 5, 2, 1])],
  },
  {
    name: 'Honey Dressing',
    note: 'An old ulcer, cleaned out and almost empty – nothing grows back on its own. But the nurse drips medical honey on it every few hours.',
    desc: 'Finegoldia magna hides deep in ulcers and smells its way to food. Streptococcus pyogenes joins the race.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'wenig', regen: 'aus', elements: [{ type: 'sugar', first: 380, every: 620 }] },
    boss: g('fmagna', '#cc5252', ['F2', 'Z'], [5, 4, 5, 4, 4, 1, 2], 'none', { chemotaxis: 4 }),
    opponents: [g('spyogenes', '#c04878', ['F', 'R'], [4, 4, 4, 4, 4, 2, 2], 'capsule')],
  },
  {
    name: 'Fever',
    note: 'The body fights back with fever. One side of the wound burns hot, the other is cooled by an ice pack.',
    desc: 'Streptococcus pyogenes causes scarlet fever and loves the heat. Staphylococcus hominis spreads in wide arcs.',
    plate: { size: 'gross', distribution: 'flecken', amount: 'normal', regen: 'normal', elements: [{ type: 'heat' }] },
    boss: g('spyogenes', '#c04878', ['F2', 'R'], [5, 4, 4, 5, 4, 1, 2], 'capsule'),
    opponents: [g('shominis', '#5858c4', ['F4', 'R'], [5, 3, 4, 4, 4, 1, 3])],
  },
  {
    name: 'Rinsing',
    note: 'A cat bite is rinsed under the tap for minutes. The water keeps pushing everything downstream – and keeps bringing fresh food.',
    desc: 'Pasteurella multocida comes from a cat’s mouth and wears a thick capsule. Streptococcus agalactiae came along.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'normal', regen: 'schnell', elements: [{ type: 'flow' }] },
    boss: g('pmultocida', '#38a0b4', ['F', 'P'], [4, 4, 5, 5, 5, 2, 2], 'biofilm'),
    opponents: [g('sagalactiae', '#a040a0', ['F2', 'L'], [5, 3, 4, 5, 4, 1, 3], 'capsule')],
  },
  {
    name: 'Mouldy Plaster',
    note: 'A plaster stayed on far too long and grew mould. Just like on Fleming’s famous plate, a clear ring spreads around it.',
    desc: 'Staphylococcus aureus – the germ on Fleming’s plate when penicillin was discovered. Staphylococcus epidermidis builds biofilm beside it.',
    plate: { size: 'gross', distribution: 'gleichmaessig', amount: 'viel', regen: 'normal', elements: [{ type: 'mould', at: 0, size: 0.24 }] },
    boss: g('saureus', '#cc5252', ['F2', 'Z'], [5, 4, 5, 5, 6, 2, 2], 'capsule'),
    opponents: [g('sepidermidis', '#5858c4', ['F', 'P3'], [4, 4, 5, 5, 5, 3, 1], 'biofilm')],
  },
  {
    name: 'Pus & Phages',
    note: 'The wound is badly infected. The immune system sends white blood cells, and the doctors try phage therapy – both go for the biggest colony.',
    desc: 'World finale: Pseudomonas aeruginosa with biofilm and toxins, the favourite target of phage therapy. Two old enemies return.',
    plate: { size: 'gross', distribution: 'schnitt', amount: 'normal', regen: 'normal', elements: [{ type: 'immune', at: 600, count: 2 }, { type: 'phage', at: [1400, 2600] }] },
    boss: g('paeruginosa', '#38a0b4', ['F3', 'Z'], [5, 4, 5, 5, 5, 1, 2], 'toxin', { bonusSpecial: 'biofilm' }),
    opponents: [
      g('saureus', '#cc5252', ['F2', 'Z'], [4, 3, 5, 5, 5, 1, 2], 'capsule'),
      g('cjeikeium', '#5858c4', ['F', 'P2'], [4, 4, 4, 4, 5, 2, 1], 'biofilm'),
    ],
  },
];

// alle Gegner eines Levels als fertige Genome, der besondere Gegner zuerst
export const levelOpponents = (lv) =>
  [{ ...lv.boss, boss: true }, ...lv.opponents].map((o) => ({ ...normalize({ ...o, name: GERMS[o.germ].name }), germ: o.germ, boss: !!o.boss }));
