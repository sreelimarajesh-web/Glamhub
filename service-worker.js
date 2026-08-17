const cacheName = 'zaya-shell-v1';
const shell = ['/', '/index.html', '/src/app.js', '/src/styles.css', '/assets/zaya-mark.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(shell))));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(cacheName).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request)));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(([client]) => client ? client.focus() : clients.openWindow('/')));
});
