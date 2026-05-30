// Service Worker — RouteAuto Pro
const CACHE = 'routeauto-v2';

// Fichiers à mettre en cache pour mode hors-ligne
const PRECACHE = [
  './',
  './index.html',
  './data.js',
  './city_coords.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Installation : mise en cache initiale
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // On cache les fichiers locaux (les CDN peuvent échouer offline, c'est OK)
      return cache.addAll(['./index.html', './data.js', './city_coords.js']).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour les fichiers locaux, network-first pour les API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API Google Maps / TomTom / corsproxy → toujours réseau (pas de cache)
  if (url.hostname.includes('googleapis') ||
      url.hostname.includes('tomtom') ||
      url.hostname.includes('corsproxy') ||
      url.hostname.includes('api.gouv')) {
    return; // laisser passer sans interception
  }

  // Fichiers locaux : cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Mettre en cache les nouvelles ressources locales
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Hors ligne + pas de cache → page d'erreur minimale
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
