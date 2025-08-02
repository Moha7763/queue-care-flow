// Service Worker for background notifications
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Keep the service worker alive
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    event.ports[0].postMessage('Service Worker is alive');
  }
});
