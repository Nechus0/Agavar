// Lists candidate photos on Wikimedia Commons for some germs (title, licence, short description),
// so suitable micrographs can be picked by hand and pinned in tools/fetch-germ-photos.mjs (OVERRIDES).
// Usage: GERMS=borrelia,kocuria node tools/list-germ-photos.mjs
import { GERMS } from '../js/germs.js';

const UA = 'AgavaGame/1.0 (educational game; contact via GitHub Nechus0/Agavar)';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    await wait(1200);
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) { await wait(5000 * 2 ** attempt); continue; }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }
  throw new Error(`gave up: ${url}`);
};
const strip = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const keys = (process.env.GERMS || '').split(',').filter(Boolean);

for (const key of keys) {
  const germ = GERMS[key];
  if (!germ) continue;
  console.log(`\n### ${key} – ${germ.name}`);
  const seen = new Set();
  for (const q of [`${germ.name} electron micrograph`, `${germ.name} microscopy`, germ.name]) {
    const res = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=12&srsearch=${encodeURIComponent(q)}`);
    const titles = (res.query?.search || []).map((h) => h.title).filter((t) => !seen.has(t) && /\.(jpe?g|png)$/i.test(t));
    titles.forEach((t) => seen.add(t));
    if (!titles.length) continue;
    const info = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|size&titles=${encodeURIComponent(titles.join('|'))}`);
    for (const p of Object.values(info.query?.pages || {})) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata || {};
      console.log(`- ${p.title} | ${strip(m.LicenseShortName?.value)} | ${ii.width}x${ii.height} | ${strip(m.ImageDescription?.value).slice(0, 160)}`);
    }
  }
}
