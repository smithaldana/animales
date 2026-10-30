// Service worker: la app funciona sin conexión.
// Al cambiar sonidos o la página, sube VERSION para que los móviles descarguen lo nuevo.
const VERSION = 'v6';
const CACHE = 'animales-' + VERSION;
const BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Solo borra cachés viejas de esta app: el dominio lo comparte con /pletina/
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('animales-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Sonidos: caché primero, y si no está, red y guardar (los mp3 no cambian).
  if (url.pathname.includes('/sonidos/')) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Página y resto: red primero (para coger cambios), caché si no hay conexión.
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
