// Downloads a photo for every germ from Wikipedia / Wikimedia Commons and records
// author and licence, so the atlas can show (and credit) real microscope images.
// Needs network access to en.wikipedia.org, commons.wikimedia.org and upload.wikimedia.org.
// Usage: node tools/fetch-germ-photos.mjs   (writes img/germs/*.jpg and js/germ-photos.js)
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { GERMS } from '../js/germs.js';
import { PHOTOS } from '../js/germ-photos.js';

const UA = 'AgavaGame/1.0 (educational game; contact via GitHub Nechus0/Agavar)';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Wikipedia limits fast clients: pause between requests and retry with growing waits on 429
const get = async (url) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    await wait(1500);
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) { await wait(5000 * 2 ** attempt); continue; }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r;
  }
  throw new Error(`gave up after retries: ${url}`);
};
const strip = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
// only licences that allow use in a commercial app (with attribution)
const OK = /^(public domain|pd|cc0|cc by(-sa)? \d|cc-by(-sa)?-\d)/i;

mkdirSync('img/germs', { recursive: true });
// Hand-picked Commons files for germs whose automatic pick does not fit (e.g. a cheese photo).
// null = no fitting microscope image on Commons -> the atlas keeps the drawing.
const OVERRIDES = {
  mxanthus: 'File:Myxococcus xanthus.png',
  pputida: 'File:Pseudomonas putida DIC image 400X.jpg',
  bdellovibrio: 'File:Slice from electron cryotomogram of Bdellovibrio bacteriovorus cell.jpg',
  pmirabilis: 'File:Proteus mirabilis.jpg',
  vcholerae: 'File:Vibrio cholerae.jpg',
  cbotulinum: 'File:Clostridium botulinum.jpg',
  corynebacterium: 'File:Corynebacterium glutamicum (VAAM).png',
  ctetani: 'File:Clostridium tetani.jpg',
  cperfringens: 'File:Clostridium perfringens.MET.1097.jpg',
  cdiphtheriae: 'File:Corynebacterium diphtheriae Gram stain.jpg',
  shominis: 'File:Staphylococcus hominis Gram staining.jpg',
  sagalactiae: 'File:Streptococcus agalactiae Gram staining of culture.jpg',
  brevibacterium: null, // only cheese photos
  kytococcus: null, // only an agar plate
};

// photos that are already here are kept (FORCE=1 fetches everything again, ONLY=a,b just these germs)
const force = process.env.FORCE === '1';
const only = (process.env.ONLY || '').split(',').filter(Boolean);
if (force) { rmSync('img/germs', { recursive: true, force: true }); mkdirSync('img/germs', { recursive: true }); }
const photos = force ? {} : Object.fromEntries(Object.entries(PHOTOS).filter(([, p]) => existsSync(p.src)));

// Commons file info (url, licence, author) or null
async function fileInfo(file) {
  const info = await (await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=480&titles=${encodeURIComponent(file)}`)).json();
  const ii = Object.values(info.query.pages)[0]?.imageinfo?.[0];
  if (!ii || !/image\/(jpeg|png)/.test(ii.mime || '')) return null;
  const meta = ii.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value);
  if (!OK.test(license)) return null;
  return { ii, license, author: strip(meta.Artist?.value) || 'Unknown', desc: strip(meta.ImageDescription?.value) };
}

// One look for the whole atlas: prefer scanning electron micrographs (grey, 3-D cells).
// A file only counts if its title names the germ and says it is an electron micrograph.
const SEM = /\b(sem|scanning electron|electron micrograph|electron microscop|micrograph)/i;
async function semPhoto(germ) {
  const [genus, species] = germ.name.split(' ');
  const must = (species || genus).toLowerCase();
  for (const q of [`${germ.name} scanning electron micrograph`, `${germ.name} SEM`, `${germ.name} electron micrograph`]) {
    const res = await (await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=10&srsearch=${encodeURIComponent(q)}`)).json();
    for (const hit of res.query?.search || []) {
      const t = hit.title.toLowerCase();
      if (!t.includes(must) || !t.includes(genus.toLowerCase().slice(0, 5))) continue;
      const fi = await fileInfo(hit.title);
      if (fi && (SEM.test(hit.title) || SEM.test(fi.desc))) return fi;
    }
  }
  return null;
}
async function pagePhoto(germ) {
  const title = encodeURIComponent(germ.name.replace(/ /g, '_'));
  const page = await (await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${title}`)).json();
  const file = Object.values(page.query.pages)[0]?.pageimage;
  return file ? fileInfo(`File:${file}`) : null;
}

for (const [key, germ] of Object.entries(GERMS)) {
  if (only.length && !only.includes(key)) continue;
  if (photos[key] && !only.includes(key)) { console.log(`= ${germ.name}: already there`); continue; }
  if (key in OVERRIDES && OVERRIDES[key] === null) { delete photos[key]; rmSync(`img/germs/${key}.jpg`, { force: true }); console.log(`– ${germ.name}: drawing (no fitting photo)`); continue; }
  try {
    let style = OVERRIDES[key] ? 'picked' : 'sem';
    let fi = OVERRIDES[key] ? await fileInfo(OVERRIDES[key]) : await semPhoto(germ);
    if (!fi) { style = 'other'; fi = await pagePhoto(germ); }
    if (!fi) { console.log(`– ${germ.name}: no usable photo`); continue; }
    const img = Buffer.from(await (await get(fi.ii.thumburl || fi.ii.url)).arrayBuffer());
    const out = `img/germs/${key}.jpg`;
    writeFileSync(out, img);
    photos[key] = { src: out, author: fi.author, license: fi.license, page: fi.ii.descriptionurl, style };
    console.log(`✓ ${germ.name}: ${style} · ${fi.license}`);
  } catch (e) {
    console.log(`✗ ${germ.name}: ${e.message}`);
  }
}
writeFileSync('js/germ-photos.js',
  '// Generated by tools/fetch-germ-photos.mjs – photos from Wikimedia Commons with author and licence.\n' +
  `export const PHOTOS = ${JSON.stringify(photos, null, 2)};\n`);
console.log(`${Object.keys(photos).length} photos saved.`);
