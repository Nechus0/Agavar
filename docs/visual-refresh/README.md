# Visual refresh — "Bioluminescent Glass"

Design direction for making Agava look more modern, shiny and clean. Nothing in the game code has
changed yet; this folder is the spec to implement from.

- Live design canvas: https://claude.ai/artifact/U1bxosEf8or8fhw7my813S
- Mockups (source of the canvas boards): `mockups/*.dc.html` — Main (before/after), Palette,
  Components, Home, Lab, Battle, Results, Rendering. They are plain HTML with inline styles; all
  colours, sizes and gradients can be copied from them.

## 1. Colour tokens (replace `:root` in `css/style.css`)

The old palette is olive-tinted (`#0f1210`, `#1c2118`, sage text) — that is the "dirty green".
Move to a cool ink ground with neutral greys and saturated accents that read as light.

| Role | Old token | New value | Notes |
|---|---|---|---|
| Background | `--bg-base` | `#070B14` | Ink 950 |
| Raised bg | — (new `--bg-raised`) | `#0C1220` | Ink 900, segmented-control track |
| Surface | `--bg-surface` | `#131B2C` | Ink 800 |
| Surface 2 | `--bg-surface-2` | `#1C2740` | Ink 700, empty pips / meter track |
| Glass fill | — (new `--glass`) | `linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02))` | Cards, panels |
| Glass border | `--line` | `rgba(255,255,255,.12)` | 1 px hairline on every card |
| Glass highlight | — (new) | `inset 0 1px 0 rgba(255,255,255,.10)` | Top edge light |
| Plate base | `--bg-plate` | `#0A101C` | |
| Text primary | `--text-primary` | `#F2F5FA` | |
| Text secondary | `--text-secondary` | `#A3AEC4` | |
| Text tertiary | `--text-disabled` | `#7884A0` | Captions / disabled only |
| Accent (primary CTA) | `--accent` | `#2EF2B4` Bio mint | `--on-accent: #04241A` |
| Selection | `--selection` | `#8B7BFF` Plasma violet | `--on-selection: #120B3A` |
| Info | — (new `--info`) | `#38C8FF` Cyan | |
| Stars / warning | `--warning` | `#FFC93D` Star gold | |
| Danger | `--danger` | `#FF5A6E` Coral | |
| Success | `--success` | `#2EF2B4` | same as accent |
| Agar | `--plate-full` | `#F5B547` | plate gradient `#FFE1A0 → #F2A93B → #9A5412` |

Tinted chips: accent colour at 14–16 % alpha as background, a lighter tint as text
(mint `#7DFFD6`, violet `#C2BAFF`, gold `#FFD970`, coral `#FF8C9A`, cyan `#7FDBFF`).

### Culture colours (plate only, keep the symbol pairing)

| # | Old | New | Symbol |
|---|---|---|---|
| 1 | `#cc5252` | `#FF5A6E` coral | ● |
| 2 | `#cc8040` | `#FF9A3D` orange | ▲ |
| 3 | `#c0a030` | `#FFD23F` yellow | ■ |
| 4 | `#52a83e` | `#2EF2B4` mint | ◆ |
| 5 | `#38a0b4` | `#38C8FF` cyan | + |
| 6 | `#5858c4` | `#6E7BFF` indigo | ⬡ |
| 7 | `#a040a0` | `#C46BFF` violet | ★ |
| 8 | `#c04878` | `#FF6BC1` pink | ‹ |

World accents for world cards (radial glow in the top-right corner of a `#131B2C` card):
Skin `#FF9A3D`, Mouth & Gut `#FFD23F`, Water `#38C8FF`, Soil `#C48C50`, Hospital & Blood `#6E7BFF`.

## 2. Type

Bundle the fonts locally (offline PWA): Google Fonts, all OFL.

| Style | Font | Size / weight |
|---|---|---|
| Display (logo, VICTORY) | Unbounded | 36–44 / 800, letter-spacing .04–.06em |
| Title 1 | Unbounded | 28 / 700 |
| Title 2 (level names, bar titles) | Unbounded | 17–22 / 700 |
| Headline / row labels | Manrope | 15–17 / 700 |
| Body | Manrope | 16 / 500, line-height 1.5 |
| Score | Unbounded | 26–36 / 800 |
| Timer, stats, eyebrows | JetBrains Mono | 11–22 / 700; eyebrows uppercase, .12em tracking |

## 3. Shape, depth, components

- Radii: 10 / 16 / 24 / pill. Cards 20–24 px, icon buttons 14–16 px, all main buttons pill-shaped.
  4 pt spacing grid stays.
- **Primary button** (one per screen): height 56, pill,
  `linear-gradient(180deg, #7DFFD6 0%, #2EF2B4 55%, #14C893 100%)`, text `#04241A` 800,
  `box-shadow: 0 10px 28px rgba(46,242,180,.38), inset 0 1px 0 rgba(255,255,255,.65)`.
- **Secondary button**: glass fill + `1px rgba(255,255,255,.16)` border, white text.
- **Ghost**: transparent, `#A3AEC4`. **Danger**: coral 12 % fill, coral 35 % border, `#FF8C9A` text.
- **Segmented control** (Lab tabs, speed 1×/2×/4×): `#0C1220` pill track, selected segment violet
  gradient `#A398FF → #8B7BFF` with `0 4px 14px rgba(139,123,255,.45)` glow.
- **Meter** (upgrade points): 12 px pill, track `#131B2C` with inset shadow, fill
  `linear-gradient(90deg, #14C893, #2EF2B4 70%, #B8FFEA)` + `0 0 12px rgba(46,242,180,.7)`.
- **Trait pips**: 18×6 px rounded bars; on = mint with glow, off = `#1C2740`.
- **Stars**: gold fill `#FFC93D`, stroke `#FFF1BF`, `drop-shadow(0 0 12px rgba(255,201,61,.75))`;
  empty = `#1C2740` with 20 % white stroke.
- **Toast**: `rgba(19,27,44,.88)` + border tinted by severity + coloured dot with glow.
- Replace emoji world icons (🖐 🌀 🌊 …) with SVG line icons (2 px stroke).

## 4. Screens / menus

- **Home**: profile chip (colony colour + name) and star counter at the top, settings icon button;
  big glowing hero plate (~236 px) with `0 0 90px rgba(245,181,71,.38)` glow; AGAVA logotype;
  one "Next level" glass card with stars, opponent dots and the Play button; horizontally scrolling
  world cards; floating glass tab bar (Play / Lab / Atlas / Awards) 16 px from the edges, 28 px above the bottom.
- **Lab**: colony preview + name field + colour swatches in one glass card; points meter;
  Traits / Abilities / Body segmented control; trait rows with icon tile, pips, −/+ buttons;
  sticky Save button over a fade-to-background gradient.
- **Battle**: glass top bar (pause, level name, mono timer); stacked share bar with glowing
  player segment and labels with symbols; edge-to-edge plate (358 px on a 390 pt screen);
  event pill floating over the plate rim; star-goal chips; speed segmented control at the bottom.
- **Victory**: gold radial glow + faint conic light rays behind; VICTORY in Unbounded with gold
  text-shadow; three stars, middle one larger, side ones tilted ±12°; stat tiles (plate share, time);
  reward chips; Next level primary + Go to lab / Again secondary.
- Background of every screen: `#070B14` with one soft radial highlight
  (`radial-gradient(420px 380px at 50% 25%, #1A2A48, #0B1120 60%, #070B14)`).

## 5. Motion

Button press: scale .96 + glow dims, 120 ms spring. Stars pop in staggered (300 ms each) with a
burst. Numbers count up. Meters fill 380 ms. Toxin glow pulses slowly. All collapse to 0 ms under
`prefers-reduced-motion` (already required).

## 6. Plate rendering & resolution (`js/render.js`)

Biggest single quality win. Today `PlateRenderer` sizes the canvas to a fixed
`sim.N * ceil(720 / sim.N)` ≈ 720 px (`render.js:32`) and draws one cell per pixel, scaled up with
smoothing. On a 3× iPhone the plate is ~1100 device px, so it is upscaled twice → soft and blurry.

1. **Native resolution**: size the plate canvas to `clientWidth × devicePixelRatio` (cap ~2048),
   like the other canvases already do (`render.js:230`, `:319`, `:490`). Re-size on resize.
2. **Organic edges**: instead of stretching the cell bitmap, threshold a blurred density field
   (metaball look) — e.g. blur the cells layer then alpha-threshold, or marching squares. Best: a
   small WebGL fragment shader that takes the N×N cell grid as a texture and outputs smooth edges.
3. **Lighting** (same shader or extra 2D passes):
   - agar radial gradient `#FFE6AE → #F2AD45 → #8E4C10`, darker where nutrients are depleted;
   - soft glow (blurred culture colour, ~40 % alpha) under each colony;
   - specular highlight ellipses on colonies (white, ~35–40 %) from the density gradient;
   - toxin zones as coral radial glow (`#FF5A6E` 55 % → 0), pulsing;
   - capsule as a culture-colour ring at 45 %; spores as tiny bright dots;
   - inner vignette at the rim, glass sheen (white radial at 30 %/20 %, 45 % → 0) and a thin
     curved specular arc on the top-left of the dish; 1 px `rgba(255,255,255,.3)` rim.
4. **Tick interpolation**: blend between simulation states so growth animates at 60 fps.
5. **Assets**: icons as SVG; germ photos and the app icons at 3× (`tools/make-icons.mjs`).

## Suggested order

1. Tokens + fonts in `css/style.css` (instant new look across all screens).
2. Native-resolution plate canvas.
3. Buttons, cards, meter, segmented control, tab bar.
4. Screen layouts (Home → Battle → Victory → Lab).
5. Plate lighting / shader, motion polish.
