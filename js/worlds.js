// The five worlds of the first 100 levels (20 levels each). Each world is one habitat with its own look (plate colours),
// its own plate mechanic and its own germs. Only world 1 is playable so far; the others
// are shown as previews in the career and the atlas. See docs/WORLDS.md for the full plan.
export const WORLDS = [
  {
    n: 1, key: 'skin', name: 'Skin', icon: '🖐', playable: true,
    tagline: 'From a harmless touch to an infected wound',
    habitat: 'Human skin: dry, salty, a little acidic – and full of tiny pores. When the skin is cut, germs from outside get in.',
    // food colours on the plate: eaten up (lo) to full (hi)
    theme: { lo: [52, 24, 6], hi: [245, 176, 74], rim: '#2A3550', accent: '#F5B547' },
  },
  { n: 2, key: 'gut', name: 'Mouth & Gut', icon: '🌀', tagline: 'Sugar on the teeth, darkness in the gut',
    habitat: 'From the teeth through the stomach into the large intestine: sugar waves, acid and a constant flow that pushes everything onward.',
    theme: { lo: [30, 20, 12], hi: [176, 112, 52], rim: '#4a3220', accent: '#d08b4a' } },
  { n: 3, key: 'water', name: 'Water', icon: '🌊', tagline: 'From the garden pond to the open sea',
    habitat: 'Still ponds, rivers and the ocean: sunlight by day, darkness by night, and currents that carry cells away.',
    theme: { lo: [8, 22, 34], hi: [80, 160, 170], rim: '#1e3a48', accent: '#5fc4d0' } },
  { n: 4, key: 'soil', name: 'Soil', icon: '🌱', tagline: 'Crumbs, roots and chemical warfare',
    habitat: 'Garden soil, compost and roots: stones block the way and germs fire antibiotics at each other.',
    theme: { lo: [22, 16, 12], hi: [128, 92, 60], rim: '#3e2e22', accent: '#b48a5a' } },
  { n: 5, key: 'hospital', name: 'Hospital & Blood', icon: '🏥', tagline: 'Antibiotics, and then the immune system',
    habitat: 'Wards and catheters where antibiotics rule – and finally the bloodstream, where white blood cells hunt every intruder.',
    theme: { lo: [26, 34, 38], hi: [196, 222, 226], rim: '#41545a', accent: '#9fd8e0' } },
];

// planned expansions after level 100 (shown as a teaser only)
export const EXPANSIONS = [
  { key: 'kitchen', name: 'Kitchen', icon: '🧀' },
  { key: 'extreme', name: 'Hot Springs', icon: '🌋' },
  { key: 'space', name: 'Space Station', icon: '🚀' },
];

export const LEVELS_PER_WORLD = 20;
export const worldOfLevel = (n) => WORLDS[Math.floor((n - 1) / LEVELS_PER_WORLD)] || WORLDS[0];
