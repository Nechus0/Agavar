// Kleine SVG-Symbole für Spezialfähigkeiten, Eigenschaften und Bewegungsschritte.
const wrap = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const SPECIAL_ICONS = {
  // gestrichelter Kreis = einfache Zelle ohne Extras
  none: wrap('<circle cx="12" cy="12" r="7" stroke-dasharray="3 3"/>'),
  // dicke Sporenhülle mit ruhendem Kern
  spores: wrap('<circle cx="12" cy="12" r="8.5" stroke-width="3"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><circle cx="7.6" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16.6" cy="15.6" r="1" fill="currentColor" stroke="none"/>'),
  // Zelle läuft auf einen Nahrungstropfen zu
  chemo: wrap('<path d="M2.5 12h9"/><path d="M8 8l4 4-4 4"/><path d="M18.5 5.5c2.2 3.2 3.3 5 3.3 6.8a3.3 3.3 0 0 1-6.6 0c0-1.8 1.1-3.6 3.3-6.8z" fill="currentColor" stroke="none"/>'),
  // dicht gepackte Zellschicht (Waben)
  biofilm: wrap('<path d="M8 3.5l3.5 2v4L8 11.5l-3.5-2v-4z"/><path d="M15.5 3.5l3.5 2v4l-3.5 2-3.5-2v-4z"/><path d="M11.8 10.5l3.5 2v4l-3.5 2-3.5-2v-4z"/><path d="M4.5 12.5L8 14.5v4l-3.5 2" /><path d="M19 12.5l-3.5 2"/>'),
  // Giftwolke mit Tropfen
  toxin: wrap('<path d="M7 15.5a4 4 0 1 1 .9-7.9A5.2 5.2 0 0 1 17.6 8a3.8 3.8 0 0 1-.1 7.5z"/><path d="M8.5 18.5v2M12.5 18.5v3.2M16.5 18.5v2"/>'),
};

export const SPECIAL_COLORS = {
  none: '#8d98a7', spores: '#c77dff', chemo: '#5ee06a', biofilm: '#3fa9f5', toxin: '#ff9f43',
};

export const TRAIT_ICONS = {
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
  Z: wrap('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none"/>'),
};

export const UNLOCK_ICON = wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>');
export const LOCK_ICON = wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>');
