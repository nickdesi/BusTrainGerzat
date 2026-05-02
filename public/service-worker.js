// Cache schema version for static SW-cached assets. Bump only when the cache strategy/assets change.
const CACHE_VERSION = 'static-assets-1';
const CACHE_NAME = `gerzat-live-${CACHE_VERSION}`;

// Only cache truly static assets (icons, fonts)
const STATIC_ASSETS = [
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('gerzat-live-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

const offlineApiResponse = () => new Response(
  JSON.stringify({ error: 'offline', updates: [], offline: true, timestamp: Math.floor(Date.now() / 1000) }),
  {
    headers: { 'Content-Type': 'application/json' },
    status: 503
  }
);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let the browser handle cross-origin requests directly (analytics, CDN, map tiles, etc.).
  if (url.origin !== self.location.origin) {
    return;
  }

  // API calls: Network only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(offlineApiResponse));
    return;
  }

  // Static icons: Cache first (they rarely change)
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Everything else (HTML, JS, CSS): network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return new Response('<html lang="fr"><body><h1>Hors ligne</h1><p>Veuillez vérifier votre connexion internet.</p></body></html>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Gerzat Live', {
      body: data.body,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
