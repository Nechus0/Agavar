// Echte Bakterien, die in den Leveln als Gegner auftreten – mit einem kurzen Fakt
// und einer einfachen Zeichnung ihrer typischen Form.

export const GERMS = {
  sepidermidis: {
    name: 'Staphylococcus epidermidis', shape: 'cluster',
    fact: 'Lebt auf der Haut jedes Menschen. Er hat keine Geißeln und kann sich nicht selbst fortbewegen – er wächst einfach dort, wo er gerade ist.',
  },
  mluteus: {
    name: 'Micrococcus luteus', shape: 'tetrad',
    fact: 'Bildet leuchtend gelbe Kolonien und liegt meist in Vierergruppen zusammen. Bewegen kann er sich nicht.',
  },
  mxanthus: {
    name: 'Myxococcus xanthus', shape: 'myxo',
    fact: 'Gleitet in Schwärmen über Oberflächen, kehrt dabei regelmäßig seine Richtung um und jagt im Rudel andere Bakterien.',
  },
  ecoli: {
    name: 'Escherichia coli', shape: 'peritrich',
    fact: 'Schwimmt mit seinen Geißeln ein Stück geradeaus und „taumelt“ dann in eine zufällige neue Richtung – das nennt man Run-and-Tumble.',
  },
  lacidophilus: {
    name: 'Lactobacillus acidophilus', shape: 'chain',
    fact: 'Ein Milchsäurebakterium aus Joghurt und Darm. Die Milchsäure, die er bildet, hemmt viele andere Bakterien.',
  },
  pputida: {
    name: 'Pseudomonas putida', shape: 'polar',
    fact: 'Kann Nährstoffe „riechen“ und schwimmt gezielt auf sie zu (Chemotaxis). Er baut sogar Bestandteile von Erdöl ab.',
  },
  pmirabilis: {
    name: 'Proteus mirabilis', shape: 'swarmer',
    fact: 'Schwärmt in rhythmischen Wellen über Agarplatten und hinterlässt dabei typische ringförmige Muster.',
  },
  smarcescens: {
    name: 'Serratia marcescens', shape: 'rod',
    fact: 'Bildet einen knallroten Farbstoff, das Prodigiosin, der andere Mikroben schädigen kann.',
  },
  bsubtilis: {
    name: 'Bacillus subtilis', shape: 'spore',
    fact: 'Bildet bei Nahrungsmangel extrem widerstandsfähige Sporen, die Hitze, Trockenheit und viele Jahre überdauern können.',
  },
  vcholerae: {
    name: 'Vibrio cholerae', shape: 'comma',
    fact: 'Kommaförmig und mit einer einzigen Geißel einer der schnellsten Schwimmer unter den Bakterien.',
  },
  hpylori: {
    name: 'Helicobacter pylori', shape: 'helix',
    fact: 'Korkenzieherförmig – er schraubt sich durch den Schleim der Magenwand. Etwa die Hälfte aller Menschen trägt ihn in sich.',
  },
  paeruginosa: {
    name: 'Pseudomonas aeruginosa', shape: 'polar',
    fact: 'Ein Meister des Biofilms: In seiner Schleimschicht kann er bis zu tausendmal unempfindlicher gegen Antibiotika sein.',
  },
  bcereus: {
    name: 'Bacillus cereus', shape: 'spore',
    fact: 'Bildet Sporen, die sogar das Kochen überstehen – deshalb kann er in aufgewärmtem Reis Lebensmittelvergiftungen auslösen.',
  },
  saureus: {
    name: 'Staphylococcus aureus', shape: 'cluster',
    fact: 'Bildet zahlreiche Toxine, die andere Zellen angreifen. Etwa jeder dritte Mensch trägt ihn unbemerkt in der Nase.',
  },
  cbotulinum: {
    name: 'Clostridium botulinum', shape: 'drumstick',
    fact: 'Bildet Sporen und das Botulinumtoxin – eines der stärksten bekannten Gifte überhaupt.',
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
