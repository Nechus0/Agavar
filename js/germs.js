// Echte Bakterien, die in den Leveln als Gegner auftreten – mit einem kurzen Fakt
// und einer einfachen Zeichnung ihrer typischen Form.

export const GERMS = {
  sepidermidis: {
    name: 'Staphylococcus epidermidis', shape: 'cluster', world: 1, home: 'Healthy skin everywhere',
    fact: 'Lives on the skin of every human. It has no flagella and cannot move on its own – it simply grows where it is.',
  },
  mluteus: {
    name: 'Micrococcus luteus', shape: 'tetrad', world: 1, home: 'Skin, dust and air',
    fact: 'Forms bright yellow colonies and usually sits in groups of four. It cannot move.',
  },
  mxanthus: {
    name: 'Myxococcus xanthus', shape: 'myxo', world: 4, home: 'Soil',
    fact: 'Glides across surfaces in swarms, regularly reverses direction and hunts other bacteria as a pack.',
  },
  ecoli: {
    name: 'Escherichia coli', shape: 'peritrich', world: 2, home: 'Gut – and unwashed hands',
    fact: 'Swims straight for a while with its flagella, then “tumbles” into a random new direction – this is called run-and-tumble.',
  },
  lacidophilus: {
    name: 'Lactobacillus acidophilus', shape: 'chain', world: 2, home: 'Yoghurt and the gut',
    fact: 'A lactic acid bacterium from yoghurt and the gut. The lactic acid it makes holds back many other bacteria.',
  },
  pputida: {
    name: 'Pseudomonas putida', shape: 'polar', world: 4, home: 'Soil and water',
    fact: 'Can “smell” nutrients and swims straight towards them (chemotaxis). It can even break down parts of crude oil.',
  },
  kpneumoniae: {
    name: 'Klebsiella pneumoniae', shape: 'capsule', world: 5, home: 'Gut, hospitals, lungs',
    fact: "Wraps itself in a thick slime capsule that attackers – and even the body's immune cells – slide off.",
  },
  synechococcus: {
    name: 'Synechococcus elongatus', shape: 'cyano', world: 3, home: 'Lakes, ponds and oceans',
    fact: 'A cyanobacterium that does photosynthesis like a plant. Billions of years ago, cyanobacteria put the oxygen into our air.',
  },
  bdellovibrio: {
    name: 'Bdellovibrio bacteriovorus', shape: 'predator', world: 4, home: 'Soil and water',
    fact: 'A predatory bacterium: it rams other bacteria, drills inside and eats them from within.',
  },
  pmirabilis: {
    name: 'Proteus mirabilis', shape: 'swarmer', world: 2, home: 'Gut, wounds, urinary tract',
    fact: 'Swarms across agar plates in rhythmic waves and leaves typical ring patterns behind.',
  },
  smarcescens: {
    name: 'Serratia marcescens', shape: 'rod', world: 3, home: 'Water, soil, bathrooms and wounds',
    fact: 'Makes a bright red pigment, prodigiosin, which can harm other microbes.',
  },
  bsubtilis: {
    name: 'Bacillus subtilis', shape: 'spore', world: 4, home: 'Soil',
    fact: 'When food runs out, it forms extremely tough spores that survive heat, drought and many years.',
  },
  vcholerae: {
    name: 'Vibrio cholerae', shape: 'comma', world: 3, home: 'Salty coastal water',
    fact: 'Comma-shaped and, with a single flagellum, one of the fastest swimmers among bacteria.',
  },
  hpylori: {
    name: 'Helicobacter pylori', shape: 'helix', world: 2, home: 'The stomach',
    fact: 'Corkscrew-shaped – it screws its way through the mucus of the stomach wall. About half of all people carry it.',
  },
  paeruginosa: {
    name: 'Pseudomonas aeruginosa', shape: 'polar', world: 1, home: 'Water, burns and hospitals',
    fact: 'A biofilm master: inside its slime layer it can be up to a thousand times more resistant to antibiotics.',
  },
  bcereus: {
    name: 'Bacillus cereus', shape: 'spore', world: 2, home: 'Soil and old rice',
    fact: 'Forms spores that even survive cooking – that is why it can cause food poisoning in reheated rice.',
  },
  saureus: {
    name: 'Staphylococcus aureus', shape: 'cluster', world: 1, home: 'Nose and skin – and infected wounds',
    fact: 'Makes many toxins that attack other cells. About one in three people carries it unnoticed in their nose.',
  },
  cbotulinum: {
    name: 'Clostridium botulinum', shape: 'drumstick', world: 4, home: 'Soil and badly canned food',
    fact: 'Forms spores and botulinum toxin – one of the strongest poisons known.',
  },
  acinetobacter: {
    name: 'Acinetobacter johnsonii', shape: 'rod', world: 1, home: 'Healthy skin',
    fact: 'Has no flagella, but pulls itself along with tiny hooks called pili – a jerky movement known as twitching.',
  },
  spyogenes: {
    name: 'Streptococcus pyogenes', shape: 'chain', world: 1, home: 'Throat and skin',
    fact: 'Grows in chains and wears a slime capsule. It causes sore throats and the skin infection impetigo.',
  },
  corynebacterium: {
    name: 'Corynebacterium', shape: 'rod', world: 1, home: 'Armpits and other warm, damp skin',
    fact: 'Fresh sweat has no smell – Corynebacterium breaks it down into the molecules that make armpits smell.',
  },
  ctetani: {
    name: 'Clostridium tetani', shape: 'drumstick', world: 4, home: 'Soil, dust – and deep cuts',
    fact: 'Its spores wait in soil and rust for years. In a deep, airless wound they wake up and make the toxin that causes tetanus.',
  },
  borrelia: {
    name: 'Borrelia burgdorferi', shape: 'helix', world: 1, home: 'Ticks – and the skin after a tick bite',
    fact: 'A corkscrew-shaped spirochete carried by ticks. After a bite it spreads through the skin as a growing red ring.',
  },
  abaumannii: {
    name: 'Acinetobacter baumannii', shape: 'capsule', world: 5, home: 'Wounds and hospitals',
    fact: 'A tough relative of the harmless skin Acinetobacter. It survives on dry surfaces for months and resists many antibiotics.',
  },
  cperfringens: {
    name: 'Clostridium perfringens', shape: 'spore', world: 2, home: 'Soil, gut – and deep wounds',
    fact: 'One of the fastest-growing bacteria: it can double in about 10 minutes. In deep wounds its toxins cause gas gangrene.',
  },
  cacnes: {
    name: 'Cutibacterium acnes', shape: 'rod', world: 1, home: 'Deep in the pores of the face and back',
    fact: 'Lives in hair follicles and feeds on skin oil (sebum). When a pore gets blocked it can multiply and cause a spot.',
  },
  brevibacterium: {
    name: 'Brevibacterium linens', shape: 'rod', world: 1, home: 'Between the toes',
    fact: 'The germ behind smelly feet – and behind the smell of some cheeses, which are ripened with it on purpose.',
  },
  cdiphtheriae: {
    name: 'Corynebacterium diphtheriae', shape: 'rod', world: 1, home: 'Throat and skin sores',
    fact: 'Makes diphtheria toxin. In warm countries it can infect skin sores. A vaccine protects almost everyone today.',
  },
  kocuria: {
    name: 'Kocuria rosea', shape: 'tetrad', world: 1, home: 'Healthy skin',
    fact: 'A harmless skin germ that forms pink colonies and sits in neat groups of four.',
  },
  shominis: {
    name: 'Staphylococcus hominis', shape: 'cluster', world: 1, home: 'Armpits and groin',
    fact: 'One of the most common germs on human skin, especially where there are many sweat glands.',
  },
  kytococcus: {
    name: 'Kytococcus sedentarius', shape: 'tetrad', world: 1, home: 'Soles of the feet',
    fact: 'Eats into the thick skin of sweaty soles and leaves tiny pits – a condition called pitted keratolysis.',
  },
  sagalactiae: {
    name: 'Streptococcus agalactiae', shape: 'chain', world: 1, home: 'Skin and mucous membranes',
    fact: 'Grows in chains and wears a sugar capsule. Usually harmless, but it can infect wounds and newborn babies.',
  },
};

// Kleine SVG-Zeichnung (Seitenverhältnis 3:2) der typischen Zellform.
export function germSvg(shape, color) {
  const body = (x, y, w, h, rot = 0) =>
    `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" transform="rotate(${rot} ${x} ${y})" fill="${color}" stroke="#0e1116" stroke-width="2"/>`;
  const ball = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#0e1116" stroke-width="2"/>`;
  const flag = (d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`;
  let s = '';
  switch (shape) {
    case 'cluster':
      [[42, 34], [58, 30], [74, 36], [50, 48], [66, 50], [82, 52], [58, 64], [40, 60], [74, 66]].forEach(([x, y]) => (s += ball(x, y, 9)));
      break;
    case 'tetrad':
      [[48, 30], [70, 30], [48, 52], [70, 52]].forEach(([x, y]) => (s += ball(x, y, 11)));
      break;
    case 'chain':
      [20, 42, 64, 86].forEach((x, k) => (s += body(x + 4, 40 + (k % 2) * 4, 22, 11, k % 2 ? 8 : -8)));
      break;
    case 'myxo':
      [[30, 28, 10], [52, 38, 4], [74, 30, -6], [40, 52, -4], [66, 56, 8], [88, 46, 2]].forEach(([x, y, r]) => (s += body(x, y, 34, 7, r)));
      break;
    case 'peritrich':
      s += flag('M30 30 q-10 -10 -20 -4') + flag('M34 54 q-8 12 -20 10') + flag('M90 28 q10 -10 22 -4') + flag('M86 54 q10 12 22 8') + flag('M60 26 q4 -14 -6 -20') + flag('M60 56 q-4 14 6 18');
      s += body(60, 40, 64, 26);
      break;
    case 'polar':
      s += flag('M92 40 q10 -10 18 0 t16 0');
      s += body(56, 40, 64, 24);
      break;
    case 'swarmer':
      for (let k = 0; k < 8; k++) s += flag(`M${22 + k * 10} ${k % 2 ? 32 : 48} q6 ${k % 2 ? -14 : 14} 14 ${k % 2 ? -18 : 18}`);
      s += body(60, 40, 90, 16);
      break;
    case 'rod':
      s += body(44, 34, 46, 22, -10) + body(76, 48, 46, 22, 14);
      break;
    case 'spore':
      s += body(60, 40, 70, 28);
      s += `<ellipse cx="60" cy="40" rx="10" ry="8" fill="#f4ecd8" stroke="#0e1116" stroke-width="2"/>`;
      break;
    case 'capsule':
      s += `<ellipse cx="60" cy="40" rx="44" ry="28" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += body(60, 40, 56, 24);
      break;
    case 'cyano':
      s += body(60, 40, 76, 26);
      [44, 54, 64, 74].forEach((x) => (s += `<path d="M${x} 32 v16" stroke="#0e1116" stroke-width="2" opacity=".45"/>`));
      break;
    case 'predator':
      s += body(76, 44, 54, 30);
      s += flag('M24 26 q-8 -6 -14 2');
      s += `<path d="M30 30 Q42 18 56 34" fill="none" stroke="#0e1116" stroke-width="15" stroke-linecap="round"/><path d="M30 30 Q42 18 56 34" fill="none" stroke="#ff5d5d" stroke-width="11" stroke-linecap="round"/>`;
      break;
    case 'drumstick':
      s += body(54, 40, 66, 22);
      s += `<circle cx="90" cy="40" r="13" fill="#f4ecd8" stroke="#0e1116" stroke-width="2"/>`;
      break;
    case 'comma':
      s += flag('M92 30 q12 -6 22 4');
      s += `<path d="M28 52 Q50 14 90 30" fill="none" stroke="#0e1116" stroke-width="22" stroke-linecap="round"/><path d="M28 52 Q50 14 90 30" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>`;
      break;
    case 'helix':
      s += flag('M100 34 q8 -8 16 -2') + flag('M100 36 q8 6 16 10');
      s += `<path d="M18 40 q10 -18 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#0e1116" stroke-width="14" stroke-linecap="round"/><path d="M18 40 q10 -18 20 0 t20 0 t20 0 t20 0" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>`;
      break;
    default:
      s += ball(60, 40, 18);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">${s}</svg>`;
}