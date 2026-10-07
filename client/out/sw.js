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
