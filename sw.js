// Service Worker: macht Agava offline spielbar.
// Strategie: erst Netzwerk (immer aktuell), bei fehlender Verbindung aus dem Cache.
const CACHE = 'agava-v63';
const ASSETS = [
  './', 'index.html', 'css/style.css', 'css/refresh.css', 'css/fonts.css', 'fonts/manrope-1.woff2', 'fonts/unbounded-2.woff2', 'fonts/jetbrains-mono-0.woff2', 'manifest.webmanifest',
  'js/main.js', 'js/sim.js', 'js/genome.js', 'js/levels.js', 'js/storage.js',
  'js/render.js', 'js/rng.js', 'js/names.js', 'js/icons.js', 'js/progression.js', 'js/germs.js', 'js/movement.js', 'js/insights.js', 'js/meters.js', 'js/sound.js', 'js/music.js', 'js/worlds.js', 'js/germ-photos.js', 'js/elements.js', 'js/mutations.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // immer beim Server nachfragen (no-cache), damit Updates sofort ankommen; offline aus dem Cache
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
