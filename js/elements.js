// Elemente auf der Agarplatte: was sie sind, was sie bewirken und wie sie aussehen.
// Die Spielwerte stehen in sim.js; hier nur Namen und Texte für Leveldetails, Legende und Info-Blatt.

export const ELEMENTS = {
  stones: {
    name: 'Gravel', look: 'Grey stones on the plate',
    effect: 'Blocks the way. Colonies have to grow around it, and narrow gaps become chokepoints.',
  },
  disc: {
    name: 'Antibiotic disc', look: 'White paper disc with a clear ring',
    effect: 'Kills cells inside the clear ring around it. The ring shrinks as the drug fades. Capsules and biofilm hold out longer.',
  },
  sun: {
    name: 'Sun & shade', look: 'Bright half and a shaded half',
    effect: 'Cells in the sun dry out and lose energy. The shade is safe. A slime layer (capsule, biofilm) protects.',
  },
  salt: {
    name: 'Salt crystals', look: 'White crystals with a pale salty zone',
    effect: 'Food around the crystals grows back fast, but the salt drains energy from every cell sitting there.',
  },
  acid: {
    name: 'Acid side', look: 'Reddish tint on one side of the plate',
    effect: 'Cells on the sour side age much faster. Defense and biofilm protect.',
  },
  sugar: {
    name: 'Honey drops', look: 'A blinking ring marks where the next drop lands',
    effect: 'Every few hours a drop of honey lands on the plate. The spot is marked an hour before – fresh food for whoever gets there first.',
  },
  heat: {
    name: 'Warm & cold side', look: 'Orange warm side, blue cold side',
    effect: 'On the warm side everything runs faster: eating, moving and ageing. The cold side is slow and safe.',
  },
  flow: {
    name: 'Current', look: 'Light streaks drifting across the plate',
    effect: 'Running water slowly pushes cells downstream. Biofilm sticks and stays put.',
  },
  mould: {
    name: 'Penicillin mould', look: 'Fuzzy blue-green mould with a clear ring',
    effect: 'The mould keeps growing and pushes its antibiotic ring outward. Nothing survives inside it.',
  },
  phage: {
    name: 'Phages', look: 'Cells turn pale and burst',
    effect: 'Viruses that attack the biggest colony. Infected cells burst and infect neighbours of the same colony. Capsules help.',
  },
  immune: {
    name: 'Immune cells', look: 'Large pale cells drifting over the plate',
    effect: 'White blood cells arrive after a few hours, drift toward the biggest colony and eat what they touch.',
  },
};

export const elementsOf = (plate) => (plate.elements || []).map((e) => e.type).filter((t, i, a) => ELEMENTS[t] && a.indexOf(t) === i);
