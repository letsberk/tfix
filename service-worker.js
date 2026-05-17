'use strict';

const CACHE_VERSION = 'railapp-v2.0.0';
const CACHE_NAME    = `${CACHE_VERSION}-shell`;

// App Shell – alles in index.html
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Install:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activate:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // Supabase API → immer Netzwerk
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.com')) {
    return; // Browser-Default (kein SW-Eingriff)
  }

  // Externe APIs (RIS, Trassenfinder, bahn.expert) → immer Netzwerk
  if (!url.hostname.includes('bahn.berkipedia.de') && url.hostname !== location.hostname) {
    return;
  }

  // App Shell (index.html) → Cache First mit Netzwerk-Update
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => null);

      // Sofort aus Cache, im Hintergrund aktualisieren
      return cached || networkFetch || caches.match('/index.html');
    })
  );
});

// ── UPDATE PROMPT ────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'GET_VERSION') event.ports[0]?.postMessage(CACHE_VERSION);
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'RailApp', {
      body:  data.body || '',
      icon:  '/icon-192.png',
      badge: '/icon-72.png',
      tag:   data.tag || 'railapp',
      data:  data,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
