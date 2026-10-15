// Mutationen: nach jedem ersten Sieg wählt man eine von drei zufälligen Eigenheiten für sein Bakterium.
// Jede ist ein kleiner, gezielter Vorteil – so entwickelt sich jedes Bakterium anders.
// Die Spielwerte liest sim.js über phenotype(); hier stehen nur Namen und Texte.
export const MUTATIONS = {
  thick_wall: { name: 'Thick wall', text: '+1 defense, but cells move a little less.' },
  thrifty: { name: 'Thrifty', text: 'Burns 12 % less energy just staying alive.' },
  sprinter: { name: 'Sprinter', text: 'Moves 12 % more often.' },
  long_life: { name: 'Long life', text: 'Cells live 20 % longer.' },
  sweet_tooth: { name: 'Sweet tooth', text: 'Eats 25 % faster on rich food (honey, fresh patches).', element: 'sugar' },
  keen_nose: { name: 'Keen nose', text: 'Smells food much better.' },
  big_brood: { name: 'Big brood', text: 'Divides 10 % sooner.' },
  fighter: { name: 'Fighter', text: '+1 attack.' },
  salt_tolerant: { name: 'Salt tolerant', text: 'Salt drains 60 % less energy.', element: 'salt' },
  acid_proof: { name: 'Acid proof', text: 'Ages much less on sour ground.', element: 'acid' },
  sun_hardy: { name: 'Sun hardy', text: 'The sun drains 60 % less energy.', element: 'sun' },
  resistant: { name: 'Resistant', text: 'Antibiotics kill 40 % fewer cells.', element: ['disc', 'mould'] },
  fast_capsule: { name: 'Quick slime', text: 'A lost capsule grows back twice as fast.', needs: 'capsule' },
  potent_toxin: { name: 'Potent toxin', text: 'Toxins hit harder.', needs: 'toxin' },
  deep_mat: { name: 'Deep mat', text: 'Biofilm forms sooner and holds better.', needs: 'biofilm' },
};
export const MUTATION_KEYS = Object.keys(MUTATIONS);
// allgemeine Mutationen lassen sich bis zu viermal nehmen (I–IV) – so gibt es immer drei zur Wahl
export const maxRank = (k) => (MUTATIONS[k].element || MUTATIONS[k].needs || k === 'sweet_tooth' ? 1 : 4);
export const rankOf = (bacterium, k) => (bacterium.mutations || []).filter((x) => x === k).length;
const ROMAN = ['', '', ' II', ' III', ' IV'];
export const mutationName = (k, rank = 1) => MUTATIONS[k].name + ROMAN[rank];

// drei Vorschläge für einen Sieg, fest für dieses Bakterium und Level (kein Neu-Würfeln durch Neuladen)
// Umwelt-Mutationen (Salz, Sonne …) erst, wenn diese Gefahr schon auf einer Platte vorkam
export function mutationChoices(bacterium, level, seen = new Set()) {
  const has = new Set([bacterium.special, bacterium.bonusSpecial]);
  const relevant = (m) => !m.element || [].concat(m.element).some((e) => seen.has(e));
  const open = MUTATION_KEYS.filter((k) => rankOf(bacterium, k) < maxRank(k) && (!MUTATIONS[k].needs || has.has(MUTATIONS[k].needs)) && relevant(MUTATIONS[k]));
  // neue Mutationen zuerst, Verstärkungen schon vorhandener füllen auf drei auf
  const fresh = open.filter((k) => !rankOf(bacterium, k)), again = open.filter((k) => rankOf(bacterium, k));
  let s = 0;
  for (const ch of `${bacterium.id}:${level}`) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  for (const pool of [fresh, again]) while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
