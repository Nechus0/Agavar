// Service Worker: macht Agava offline spielbar.
// Strategie: erst Netzwerk (immer aktuell), bei fehlender Verbindung aus dem Cache.
const CACHE = 'agava-v6';
const ASSETS = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/main.js', 'js/sim.js', 'js/genome.js', 'js/levels.js', 'js/storage.js',
  'js/render.js', 'js/rng.js', 'js/names.js', 'js/icons.js', 'js/progression.js', 'js/germs.js', 'js/movement.js', 'js/insights.js',
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
  e.respondWith(
    fetch(e.request)
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
