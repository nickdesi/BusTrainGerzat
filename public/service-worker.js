// AGGRESSIVE CACHE BUSTING - Version bumped on every deploy
const CACHE_VERSION = Date.now(); // Changes on every deploy
const CACHE_NAME = `gerzat-live-v${CACHE_VERSION}`;

// Only cache truly static assets (icons, fonts)
const STATIC_ASSETS = [
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install: Skip waiting immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // Take over immediately
});

// Activate: Delete ALL old caches aggressively
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating and clearing old caches');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      )
    ).then(() => {
      // Force all clients to use this new service worker
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first for EVERYTHING except icons
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: Network only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ updates: [], offline: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }

  // Static icons: Cache first (they rarely change)
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Everything else (HTML, JS, CSS): NETWORK FIRST, no caching
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache HTML/JS/CSS - always get fresh from network
        return response;
      })
      .catch(() => {
        // Offline fallback: try cache, or return offline page
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Return a simple offline message for navigation requests
          if (request.mode === 'navigate') {
            return new Response('<html><body><h1>Hors ligne</h1><p>Veuillez vérifier votre connexion internet.</p></body></html>', {
              headers: { 'Content-Type': 'text/html' }
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

// Force update check on every page load
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
