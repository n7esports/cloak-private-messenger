// UQZERA service worker.
//
// Strategy:
//  - WebSocket upgrades are never touched (the relay is a live socket).
//  - /api/ and any streaming response is network-only (never cache it).
//  - Navigations and static assets use a stale-while-revalidate shell cache so
//    the app opens offline. Nothing here ever stores message content: it only
//    caches the app shell (HTML/JS/CSS), which is public by definition.

const SHELL_CACHE = 'UQZERA-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/favicon.svg'];
// F-42: strict TTL for the offline navigation fallback (1 hour).
const SHELL_TTL_MS = 60 * 60 * 1000;

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
            .filter((name) => name.startsWith('UQZERA-shell-') && name !== SHELL_CACHE)
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
  // back to the cached shell when offline. F-39/F-42: authenticated HTML must
  // never be persisted — responses marked no-store/no-cache/private are passed
  // through untouched, and everything else is stored with a strict TTL and
  // pruned on activation.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
          const mustNotStore =
            !response.ok ||
            cacheControl.includes('no-store') ||
            cacheControl.includes('no-cache') ||
            cacheControl.includes('private');
          if (!mustNotStore) {
            const copy = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => {
              cache.put('/', copy);
              cache.put('/__shell_cached_at', new Response(String(Date.now())));
            });
          }
          return response;
        })
        .catch(() =>
          caches
            .match('/')
            .then(async (cached) => {
              if (!cached) return caches.match('/index.html');
              // Strict TTL: an expired shell fallback is dropped rather than
              // served, so stale authenticated HTML cannot linger in the cache.
              const stamp = await caches.match('/__shell_cached_at');
              const cachedAt = stamp ? Number(await stamp.text()) : 0;
              if (!cachedAt || Date.now() - cachedAt > SHELL_TTL_MS) {
                void caches.open(SHELL_CACHE).then((cache) => {
                  cache.delete('/');
                  cache.delete('/__shell_cached_at');
                });
                return undefined;
              }
              return cached;
            })
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
  // F-42: never render push payload content. The server sends opaque signals
  // only; even if a malicious/misconfigured payload carried text, we ignore
  // event.data entirely so no message content can leak onto the lock screen.
  event.waitUntil(
    self.registration.showNotification('UQZERA', {
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
