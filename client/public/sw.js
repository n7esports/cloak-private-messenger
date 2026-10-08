self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isWebSocket =
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    request.mode === 'websocket' ||
    request.headers.get('upgrade')?.toLowerCase() === 'websocket';

  if (isWebSocket) return;

  const bypassCache =
    url.pathname.startsWith('/api/') ||
    request.headers.get('accept')?.includes('text/event-stream');
  if (!bypassCache) return;

  event.respondWith(fetch(request, { cache: 'no-store' }));
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
