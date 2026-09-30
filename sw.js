// Coffre à Briques — fonctionnement hors ligne.
// Change VERSION à chaque mise à jour de l'appli pour forcer le rafraîchissement.
const VERSION = 'coffre-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('coffre-') && k !== VERSION && k !== VERSION + '-ext').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // L'appli elle-même : réseau d'abord (pour avoir les mises à jour), cache si hors ligne.
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
      event.respondWith(
        fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
          .catch(() => caches.match('./index.html'))
      );
      return;
    }
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Polices et photos officielles des sets : cache, puis réseau.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.rebrickable.com') {
    event.respondWith(
      caches.open(VERSION + '-ext').then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })))
    );
  }
  // Le reste (API Rebrickable, liens externes) passe directement par le réseau.
});
