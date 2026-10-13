// Erfundene lateinische Namen. Jede Welt hat eigene Gattungen (die dort wirklich vorkommen)
// und eigene Artnamen (lateinische Wörter für den Lebensraum). Namen echter Keime der Welt
// und schon vergebene Namen werden nie vorgeschlagen.
import { GERMS } from './germs.js';

const PARTS = {
  1: { // Haut
    genera: ['Staphylococcus', 'Corynebacterium', 'Micrococcus', 'Cutibacterium', 'Kocuria', 'Brevibacterium', 'Dermabacter', 'Dermacoccus', 'Kytococcus', 'Rothia', 'Streptococcus', 'Acinetobacter'],
    species: ['cutis', 'cutaneus', 'dermalis', 'epidermicus', 'sudoris', 'sebaceus', 'follicularis', 'pilosus', 'axillaris', 'plantaris', 'digitalis', 'palmaris', 'cicatricis', 'vulneris', 'pruriens', 'squamosus', 'salsus', 'rubescens'],
  },
  2: { // Mund & Darm
    genera: ['Streptococcus', 'Lactobacillus', 'Bifidobacterium', 'Bacteroides', 'Enterococcus', 'Veillonella', 'Actinomyces', 'Fusobacterium', 'Prevotella', 'Escherichia'],
    species: ['dentalis', 'oralis', 'molaris', 'cariosus', 'gastricus', 'intestinalis', 'colicus', 'mucosus', 'dulcis', 'lacticus', 'fermentans', 'saccharivorus'],
  },
  3: { // Wasser
    genera: ['Vibrio', 'Synechococcus', 'Caulobacter', 'Aeromonas', 'Aliivibrio', 'Prochlorococcus', 'Flavobacterium', 'Shewanella', 'Pseudomonas'],
    species: ['aquaticus', 'marinus', 'fluvialis', 'lacustris', 'salinus', 'undosus', 'profundus', 'lucidus', 'natans', 'palustris', 'litoralis', 'pelagicus'],
  },
  4: { // Boden
    genera: ['Bacillus', 'Streptomyces', 'Clostridium', 'Rhizobium', 'Myxococcus', 'Nocardia', 'Azotobacter', 'Arthrobacter', 'Pseudomonas'],
    species: ['terrestris', 'humicola', 'radicis', 'arvensis', 'lapidosus', 'silvaticus', 'fodiens', 'glebae', 'stercoris', 'subterraneus', 'lutosus', 'hortensis'],
  },
  5: { // Krankenhaus & Blut
    genera: ['Klebsiella', 'Acinetobacter', 'Enterococcus', 'Staphylococcus', 'Pseudomonas', 'Neisseria', 'Serratia', 'Enterobacter'],
    species: ['resistens', 'nosocomialis', 'sanguinis', 'febrilis', 'venosus', 'clinicus', 'catheteris', 'invictus', 'persistens', 'tenax', 'pertinax', 'sterilis'],
  },
};

const ALL = {
  genera: [...new Set(Object.values(PARTS).flatMap((p) => p.genera))],
  species: [...new Set(Object.values(PARTS).flatMap((p) => p.species))],
};

const norm = (s) => String(s).trim().toLowerCase();

// Alle möglichen Namen einer Welt (ohne echte Keime dieser Welt und ohne `taken`).
export function namePool(world = null, taken = []) {
  const parts = PARTS[world] || ALL;
  const blocked = new Set([
    ...Object.values(GERMS).filter((g) => !world || g.world === world).map((g) => norm(g.name)),
    ...taken.map(norm),
  ]);
  const out = [];
  for (const g of parts.genera) for (const s of parts.species) {
    const name = `${g} ${s}`;
    if (!blocked.has(norm(name))) out.push(name);
  }
  return out;
}

// Zufallsname passend zur Welt; `taken` = schon vergebene Namen (eigene Bakterien, Gegner).
export function randomName(rng, world = null, taken = []) {
  const pool = namePool(world, taken);
  return pool.length ? rng.pick(pool) : `${rng.pick(ALL.genera)} ${rng.pick(ALL.species)}`;
}
