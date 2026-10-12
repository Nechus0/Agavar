// Die 10 vorgefertigten Level mit aufsteigend stärkeren Gegnern.
// Der Spieler hat in allen Leveln das gleiche Budget; die Gegner werden mit jedem Level besser.
export const LEVEL_BUDGET = 20;

const g = (name, color, program, t, special = 'none') => ({
  name, color, program: program.split(''),
  speed: t[0], lifespan: t[1], efficiency: t[2], attack: t[3], defense: t[4],
  division: t[5], metabolism: t[6], special,
});

//            Geschw, Leben, Verw., Angr., Abw., Teilung, Stoffw.
export const LEVELS = [
  {
    name: 'Erste Schritte',
    desc: 'Ein träger Gegner, der kaum vom Fleck kommt. Ideal, um die Simulation kennenzulernen.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    opponents: [g('Lactobacillus quietus', '#ff5d5d', 'FP', [1, 1, 1, 0, 1, 3, 1])],
  },
  {
    name: 'Der Wanderer',
    desc: 'Dieser Gegner zieht in weiten Kreisen über die Platte.',
    plate: { size: 'klein', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    opponents: [g('Vibrio vagans', '#ff9f43', 'FFR', [2, 1, 2, 1, 1, 2, 2])],
  },
  {
    name: 'Zwei auf einmal',
    desc: 'Zum ersten Mal kämpfen drei Kulturen gleichzeitig.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Bacillus tardus', '#ff5d5d', 'FP', [1, 2, 3, 1, 3, 3, 1]),
      g('Spirillum errans', '#ffd23f', 'FRFL', [3, 1, 3, 2, 2, 1, 2]),
    ],
  },
  {
    name: 'Fleckenteppich',
    desc: 'Die Nahrung liegt in Flecken verteilt. Ein Gegner riecht sie schon von Weitem.',
    plate: { size: 'mittel', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Pseudomonas avidus', '#5ee06a', 'FFL', [3, 1, 3, 1, 2, 1, 3], 'chemo'),
      g('Micrococcus mollis', '#c77dff', 'ZF', [2, 2, 3, 2, 3, 2, 2]),
    ],
  },
  {
    name: 'Der Ring',
    desc: 'Nur am Rand der Platte ist der Boden reich. Drei Gegner wollen ihn für sich.',
    plate: { size: 'mittel', distribution: 'ring', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Serratia rapax', '#ff5d5d', 'FFR', [3, 1, 3, 3, 3, 1, 2]),
      g('Proteus velox', '#2ee6d6', 'FRFRFL', [4, 1, 3, 3, 2, 1, 3]),
      g('Sarcina tenax', '#ffd23f', 'FPP', [1, 3, 3, 3, 4, 3, 1]),
    ],
  },
  {
    name: 'Hungersnot',
    desc: 'Wenig Nahrung, und sie wächst nur langsam nach. Wer sparsam lebt, überlebt.',
    plate: { size: 'mittel', distribution: 'gleichmaessig', amount: 'wenig', regen: 'langsam' },
    opponents: [
      g('Clostridium pertinax', '#c77dff', 'FFZ', [2, 2, 4, 1, 2, 2, 0], 'spores'),
      g('Azotobacter avidus', '#5ee06a', 'FRF', [3, 1, 3, 2, 2, 1, 1], 'chemo'),
    ],
  },
  {
    name: 'Giftküche',
    desc: 'Drei Kulturen mit gefährlichen Waffen – eine davon verströmt Gift.',
    plate: { size: 'mittel', distribution: 'zentrum', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Nocardia sinister', '#5ee06a', 'FFRP', [2, 2, 3, 3, 3, 2, 2], 'toxin'),
      g('Listeria ferox', '#ff5d5d', 'FFL', [4, 1, 3, 4, 3, 1, 2]),
      g('Treponema crudelis', '#ff9f43', 'FRFL', [3, 2, 3, 4, 3, 1, 3]),
    ],
  },
  {
    name: 'Festung',
    desc: 'Ein Biofilm-Bollwerk und ein schneller Jäger. Gegen beide hilft keine halbe Sache.',
    plate: { size: 'gross', distribution: 'flecken', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Myxococcus pertinax', '#c77dff', 'FPPP', [2, 3, 3, 3, 3, 3, 1], 'biofilm'),
      g('Borrelia velox', '#2ee6d6', 'FFRFFL', [4, 1, 3, 3, 3, 0, 3], 'chemo'),
    ],
  },
  {
    name: 'Übermacht',
    desc: 'Vier starke Gegner auf einer großen Platte.',
    plate: { size: 'gross', distribution: 'rauschen', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Streptococcus audax', '#ff5d5d', 'FFR', [4, 1, 3, 4, 3, 1, 2], 'chemo'),
      g('Bacillus ferox', '#ffd23f', 'FRFL', [4, 2, 4, 4, 4, 1, 2]),
      g('Vibrio vorax', '#5ee06a', 'FFL', [3, 2, 3, 4, 3, 0, 3], 'toxin'),
      g('Rhizobium tenax', '#ff9f43', 'FFP', [3, 3, 3, 3, 3, 2, 1], 'spores'),
    ],
  },
  {
    name: 'Der Endgegner',
    desc: 'Der gefürchtete Pseudomonas gloriosus und seine Leibgarde. Nur ein perfekt abgestimmtes Bakterium hat eine Chance.',
    plate: { size: 'gross', distribution: 'gleichmaessig', amount: 'normal', regen: 'normal' },
    opponents: [
      g('Pseudomonas gloriosus', '#ff6ec7', 'BRBBLB', [4, 2, 3, 5, 5, 1, 2], 'chemo'),
      g('Listeria crudelis', '#ff5d5d', 'FFR', [4, 1, 3, 4, 4, 1, 2], 'toxin'),
      g('Clostridium maximus', '#c77dff', 'FRF', [4, 2, 3, 4, 4, 1, 1], 'spores'),
    ],
  },
];
