// Kleine SVG-Symbole für Spezialfähigkeiten, Eigenschaften und Bewegungsschritte.
const wrap = (body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const SPECIAL_ICONS = {
  // gestrichelter Kreis = einfache Zelle ohne Extras
  none: wrap('<circle cx="12" cy="12" r="7" stroke-dasharray="3 3"/>'),
  // dicke Sporenhülle mit ruhendem Kern
  spores: wrap('<circle cx="12" cy="12" r="8.5" stroke-width="3"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><circle cx="7.6" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16.6" cy="15.6" r="1" fill="currentColor" stroke="none"/>'),
  // Schleimkapsel um eine Zelle
  capsule: wrap('<ellipse cx="12" cy="12" rx="9.5" ry="7.5" stroke-dasharray="2.5 2"/><rect x="6.5" y="9" width="11" height="6" rx="3" fill="currentColor" stroke="none"/>'),
  // Sonne mit Blatt-Zelle
  photo: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
  // Räuber: Zelle mit Biss
  predator: wrap('<path d="M20 12a8 8 0 1 1-3-6.2L12 12l5 6.2A8 8 0 0 0 20 12z" fill="currentColor" stroke="none"/>'),
  // dicht gepackte Zellschicht (Waben)
  biofilm: wrap('<path d="M8 3.5l3.5 2v4L8 11.5l-3.5-2v-4z"/><path d="M15.5 3.5l3.5 2v4l-3.5 2-3.5-2v-4z"/><path d="M11.8 10.5l3.5 2v4l-3.5 2-3.5-2v-4z"/><path d="M4.5 12.5L8 14.5v4l-3.5 2" /><path d="M19 12.5l-3.5 2"/>'),
  // Giftwolke mit Tropfen
  toxin: wrap('<path d="M7 15.5a4 4 0 1 1 .9-7.9A5.2 5.2 0 0 1 17.6 8a3.8 3.8 0 0 1-.1 7.5z"/><path d="M8.5 18.5v2M12.5 18.5v3.2M16.5 18.5v2"/>'),
};

// Spezialfähigkeiten erscheinen in der Oberfläche einfarbig (Textfarbe), siehe Design-System.
export const SPECIAL_COLORS = {
  none: 'currentColor', spores: 'currentColor', capsule: 'currentColor', photo: 'currentColor', predator: 'currentColor', biofilm: 'currentColor', toxin: 'currentColor',
};

export const TRAIT_ICONS = {
  chemotaxis: wrap('<path d="M2.5 12h9"/><path d="M8 8l4 4-4 4"/><path d="M18.5 5.5c2.2 3.2 3.3 5 3.3 6.8a3.3 3.3 0 0 1-6.6 0c0-1.8 1.1-3.6 3.3-6.8z" fill="currentColor" stroke="none"/>'),
  speed: wrap('<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>'),
  lifespan: wrap('<path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5c0 5 9 6 9 9.5s-9 4.5-9 9.5"/><path d="M16.5 2.5c0 5-9 6-9 9.5s9 4.5 9 9.5"/>'),
  efficiency: wrap('<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l7-7"/>'),
  attack: wrap('<path d="M12 2.5l2.2 6.3L20.5 7l-3.9 5 3.9 5-6.3-1.8L12 21.5l-2.2-6.3L3.5 17l3.9-5-3.9-5 6.3 1.8z"/>'),
  defense: wrap('<path d="M12 2.5l8 3v6c0 5.2-3.4 8.6-8 10-4.6-1.4-8-4.8-8-10v-6z"/>'),
  division: wrap('<circle cx="7.5" cy="12" r="5"/><circle cx="16.5" cy="12" r="5"/>'),
  metabolism: wrap('<path d="M12 2.5c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-2.5 1.2-4 2.5-5.5.3 2 1.2 3 2.5 3.5 0-3.5-.5-6 1-9z"/>'),
};

// Pfeil, gedreht nach der Wirkung des Schritts
const arrow = (deg) => wrap(`<g transform="rotate(${deg} 12 12)"><path d="M12 20V5"/><path d="M6 10.5L12 4.5l6 6"/></g>`, 'stroke-width="2.6"');

export const STEP_ICONS = {
  F: arrow(0), R: arrow(45), D: arrow(90), B: arrow(180), L: arrow(-45), S: arrow(-90),
  P: wrap('<path d="M9 6v12M15 6v12"/>', 'stroke-width="3"'),
  M: wrap('<path d="M4 8h15"/><path d="M15 4l4 4-4 4"/><path d="M20 16H5"/><path d="M9 12l-4 4 4 4"/>', 'stroke-width="2.4"'),
  Z: wrap('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none"/>'),
};

export const UNLOCK_ICON = wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>');
export const LOCK_ICON = wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>');

// Linien-Symbole der Oberfläche (24 pt, 2 px Strich, keine Füllung) – ersetzen die Emojis.
export const UI_ICONS = {
  home: wrap('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  atlas: wrap('<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h7"/>'),
  awards: wrap('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4"/>'),
  settings: wrap('<path d="M10.3 2.5h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.8c.1.6.1 1.3 0 1.9l2 1.8-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.8a6 6 0 0 1 0-1.9l-2-1.8 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9z"/><circle cx="12" cy="12" r="3"/>'),
  play: wrap('<path d="M7 4l13 8-13 8z"/>'),
  pause: wrap('<path d="M9 6v12M15 6v12"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  chevron: wrap('<path d="M9 5l7 7-7 7"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  restart: wrap('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  upgrade: wrap('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  dice: wrap('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
  dish: wrap('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="14" r="1.5"/><circle cx="14" cy="8" r="1"/>'),
  bulb: wrap('<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>'),
  sound: wrap('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
  music: wrap('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  book: wrap('<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'),
  hand: wrap('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0"/>'),
  trash: wrap('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  food: wrap('<path d="M12 3c3.5 4.2 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0C6.5 10 8.5 7.2 12 3z"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: wrap('<path d="M5 12l5 5 9-10"/>'),
  flask: wrap('<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>'),
  lock: wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
};

// Erfolge: eigene Linien-Symbole
export const ACH_ICONS = {
  first_win: wrap('<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>'),
  three_stars: wrap('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  blitz: wrap('<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>'),
  giant: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>'),
  hunter: wrap('<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>'),
  comeback: wrap('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  sitter: wrap('<circle cx="12" cy="12" r="3"/><path d="M5 5l3 3M19 5l-3 3M5 19l3-3M19 19l-3-3"/>'),
  pure: wrap('<circle cx="12" cy="12" r="7"/>'),
  crowd: wrap('<circle cx="12" cy="5" r="2"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><circle cx="12" cy="19" r="2"/><path d="M12 7v10M7 10h10"/>'),
  all_specials: wrap('<path d="M3 8h18v12H3zM8 8V5h8v3M3 13h18"/>'),
  collector: wrap('<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'),
  master: wrap('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4"/>'),
};
