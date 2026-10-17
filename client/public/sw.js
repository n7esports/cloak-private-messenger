// Cloak service worker.
//
// Strategy:
//  - WebSocket upgrades are never touched (the relay is a live socket).
//  - /api/ and any streaming response is network-only (never cache it).
//  - Navigations and static assets use a stale-while-revalidate shell cache so
//    the app opens offline. Nothing here ever stores message content: it only
//    caches the app shell (HTML/JS/CSS), which is public by definition.

const SHELL_CACHE = 'cloak-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // A failed shell warm-up must not block installation; the fetch
        // handler will populate the cache lazily on first visit.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('cloak-shell-') && name !== SHELL_CACHE)
            .map((name) => caches.delete(name))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isWebSocket =
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    request.mode === 'websocket' ||
    request.headers.get('upgrade')?.toLowerCase() === 'websocket';
  if (isWebSocket) return;

  const bypassCache =
    url.pathname.startsWith('/api/') ||
    request.headers.get('accept')?.includes('text/event-stream');
  if (bypassCache) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Navigations: network-first so a fresh shell is always preferred, falling
  // back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() =>
          caches
            .match('/')
            .then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            void caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Cloak', {
      body: 'New encrypted message received',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      (clients) => {
        const existingClient = clients.find(
          (client) => 'focus' in client
        );
        if (existingClient) {
          return existingClient.focus();
        }
        return self.clients.openWindow(
          event.notification.data?.url || '/'
        );
      }
    )
  );
});
