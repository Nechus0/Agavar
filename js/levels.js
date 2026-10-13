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
  {
    name: 'Hautkontakt',
    desc: 'Dein erster Gegner kann sich nicht bewegen – er wächst einfach dort, wo er ist.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('sepidermidis', '#ff9f43', ['P'], [0, 2, 3, 0, 3, 2, 1]),
    opponents: [],
  },
  {
    name: 'Das Rudel',
    desc: 'Myxococcus gleitet vor und zurück und greift alles an, was ihm in den Weg kommt.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('mxanthus', '#c77dff', ['F3', 'B'], [2, 1, 2, 3, 1, 2, 2]),
    opponents: [],
  },
  {
    name: 'Run and Tumble',
    desc: 'E. coli schwimmt geradeaus und taumelt dann in eine neue Richtung. Dazu kommt ein gelber Mitbewohner.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('ecoli', '#3fa9f5', ['F3', 'Z'], [3, 1, 2, 1, 1, 1, 2]),
    opponents: [g('mluteus', '#ffd23f', ['P'], [0, 2, 2, 1, 2, 3, 1])],
  },
  {
    name: 'Der Spürhund',
    desc: 'Pseudomonas putida riecht die Nahrung auf den Flecken und schwimmt gezielt hin.',
    plate: { size: 'mittel', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    boss: g('pputida', '#5ee06a', ['F2', 'R'], [2, 1, 3, 1, 2, 1, 3], 'chemo'),
    opponents: [g('lacidophilus', '#ff6ec7', ['F', 'P'], [1, 2, 3, 3, 2, 2, 1])],
  },
  {
    name: 'Schwärmer',
    desc: 'Proteus schwärmt in langen Bahnen über die Platte – nur am Rand ist der Boden reich.',
    plate: { size: 'mittel', distribution: 'ring', amount: 'normal', regen: 'normal' },
    boss: g('pmirabilis', '#2ee6d6', ['F4', 'R'], [4, 1, 3, 3, 2, 1, 3]),
    opponents: [g('ecoli', '#3fa9f5', ['F3', 'Z'], [3, 1, 3, 3, 2, 1, 2])],
  },
  {
    name: 'Hungersnot',
    desc: 'Wenig Nahrung auf der Platte. Bacillus subtilis übersteht Hungerzeiten als Spore.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'wenig', regen: 'normal' },
    boss: g('bsubtilis', '#ffd23f', ['F2', 'D'], [2, 2, 3, 3, 3, 2, 0], 'spores'),
    opponents: [g('smarcescens', '#ff5d5d', ['F2', 'R'], [3, 1, 3, 4, 3, 1, 2])],
  },
  {
    name: 'Korkenzieher',
    desc: 'Helicobacter schlängelt sich im Wechsel nach rechts und links über die Platte.',
    plate: { size: 'mittel', distribution: 'zentrum', amount: 'normal', regen: 'normal' },
    boss: g('hpylori', '#ff6ec7', ['R4', 'M'], [3, 2, 3, 4, 4, 1, 2]),
    opponents: [
      g('mxanthus', '#c77dff', ['F3', 'B'], [3, 2, 3, 4, 3, 1, 2]),
      g('vcholerae', '#3fa9f5', ['F'], [4, 1, 3, 4, 2, 1, 3]),
    ],
  },
  {
    name: 'Schleimfestung',
    desc: 'Pseudomonas aeruginosa verschanzt sich in seinem Biofilm. Wer ihn knacken will, braucht Kraft.',
    plate: { size: 'gross', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    boss: g('paeruginosa', '#2ee6d6', ['F', 'P3'], [2, 3, 4, 4, 5, 3, 1], 'biofilm'),
    opponents: [g('pmirabilis', '#ff9f43', ['F4', 'R'], [4, 2, 3, 4, 4, 1, 3])],
  },
  {
    name: 'Giftküche',
    desc: 'Staphylococcus aureus vergiftet seine Nachbarn. Begleitet wird er von sporenbildenden Bacillus cereus und dem pfeilschnellen Vibrio cholerae.',
    plate: { size: 'mittel', distribution: 'rauschen', amount: 'normal', regen: 'normal' },
    boss: g('saureus', '#ffd23f', ['F2', 'P', 'R'], [3, 3, 4, 5, 5, 2, 2], 'toxin'),
    opponents: [
      g('bcereus', '#c77dff', ['F3', 'Z'], [4, 3, 4, 4, 4, 2, 1], 'spores'),
      g('vcholerae', '#3fa9f5', ['F'], [4, 2, 4, 5, 5, 1, 3]),
    ],
  },
  {
    name: 'Der Endgegner',
    desc: 'Clostridium botulinum: Sporen UND das stärkste Gift der Natur. Dazu zwei erfahrene Begleiter.',
    plate: { size: 'gross', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    boss: g('cbotulinum', '#ff5d5d', ['F2', 'Z'], [3, 3, 4, 5, 5, 1, 2], 'spores', { bonusSpecial: 'toxin' }),
    opponents: [
      g('saureus', '#ffd23f', ['F', 'P2', 'R'], [3, 2, 4, 4, 4, 2, 2], 'toxin'),
      g('ecoli', '#3fa9f5', ['F3', 'Z'], [4, 2, 4, 4, 4, 1, 2], 'chemo'),
    ],
  },
];

// alle Gegner eines Levels als fertige Genome, der besondere Gegner zuerst
export const levelOpponents = (lv) =>
  [{ ...lv.boss, boss: true }, ...lv.opponents].map((o) => ({ ...normalize({ ...o, name: GERMS[o.germ].name }), germ: o.germ, boss: !!o.boss }));
