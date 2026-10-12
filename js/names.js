// Erfundene lateinische Namen für Zufallsgegner.
const GENERA = [
  'Bacillus', 'Streptococcus', 'Vibrio', 'Clostridium', 'Lactobacillus', 'Spirillum',
  'Micrococcus', 'Pseudomonas', 'Serratia', 'Proteus', 'Listeria', 'Sarcina',
  'Rhizobium', 'Nocardia', 'Treponema', 'Borrelia', 'Myxococcus', 'Azotobacter',
];
const SPECIES = [
  'furiosus', 'lentus', 'vagans', 'rapax', 'tenax', 'audax', 'avidus', 'errans',
  'velox', 'pertinax', 'vorax', 'mollis', 'ferox', 'quietus', 'crudelis', 'sinister',
  'gloriosus', 'minimus', 'maximus', 'insolens', 'timidus', 'tardus', 'mirabilis', 'rubiginosus',
];

export function randomName(rng) {
  return `${rng.pick(GENERA)} ${rng.pick(SPECIES)}`;
}
