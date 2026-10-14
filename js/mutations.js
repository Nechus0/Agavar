// Mutationen: nach jedem ersten Sieg wählt man eine von drei zufälligen Eigenheiten für sein Bakterium.
// Jede ist ein kleiner, gezielter Vorteil – so entwickelt sich jedes Bakterium anders.
// Die Spielwerte liest sim.js über phenotype(); hier stehen nur Namen und Texte.
export const MUTATIONS = {
  thick_wall: { name: 'Thick wall', text: '+1 defense, but cells move a little less.' },
  thrifty: { name: 'Thrifty', text: 'Burns 12 % less energy just staying alive.' },
  sprinter: { name: 'Sprinter', text: 'Moves 12 % more often.' },
  long_life: { name: 'Long life', text: 'Cells live 20 % longer.' },
  sweet_tooth: { name: 'Sweet tooth', text: 'Eats 25 % faster on rich food (honey, fresh patches).' },
  keen_nose: { name: 'Keen nose', text: 'Smells food much better.' },
  big_brood: { name: 'Big brood', text: 'Divides 10 % sooner.' },
  fighter: { name: 'Fighter', text: '+1 attack.' },
  salt_tolerant: { name: 'Salt tolerant', text: 'Salt drains 60 % less energy.' },
  acid_proof: { name: 'Acid proof', text: 'Ages much less on sour ground.' },
  sun_hardy: { name: 'Sun hardy', text: 'The sun drains 60 % less energy.' },
  resistant: { name: 'Resistant', text: 'Antibiotics kill 40 % fewer cells.' },
  fast_capsule: { name: 'Quick slime', text: 'A lost capsule grows back twice as fast.', needs: 'capsule' },
  potent_toxin: { name: 'Potent toxin', text: 'Toxins hit harder.', needs: 'toxin' },
  deep_mat: { name: 'Deep mat', text: 'Biofilm forms sooner and holds better.', needs: 'biofilm' },
};
export const MUTATION_KEYS = Object.keys(MUTATIONS);

// drei Vorschläge für einen Sieg, fest für dieses Bakterium und Level (kein Neu-Würfeln durch Neuladen)
export function mutationChoices(bacterium, level) {
  const own = new Set(bacterium.mutations || []);
  const has = new Set([bacterium.special, bacterium.bonusSpecial]);
  const pool = MUTATION_KEYS.filter((k) => !own.has(k) && (!MUTATIONS[k].needs || has.has(MUTATIONS[k].needs)));
  let s = 0;
  for (const ch of `${bacterium.id}:${level}`) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
