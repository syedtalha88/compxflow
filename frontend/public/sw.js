// Simple service worker to satisfy PWA installation criteria
// No offline caching implemented as per Phase 13 requirements.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to network
  return;
});
