'use strict';

// ═══════════════════════════════════════════════════════════
//  SERVICE WORKER – RailApp PWA
//  Strategie: Cache First für Assets, Network First für API
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'railapp-v1.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Dateien die sofort gecacht werden (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  // Supabase SDK (via CDN) – wird dynamisch gecacht
];

// Maximale Anzahl Einträge im Dynamic Cache
const DYNAMIC_CACHE_MAX = 60;

// Supabase URL (wird zur Erkennung von API-Requests verwendet)
// Kann leer bleiben – wird aus Request-URL erkannt
const API_HOSTS = ['supabase.co'];

// ═══════════════════════════════════════════════════════════
//  INSTALL – App Shell cachen
// ═══════════════════════════════════════════════════════════
self.addEventListener('install', event => {
  console.log('[SW] Install:', CACHE_VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching App Shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Sofort aktivieren
      .catch(err => console.error('[SW] Install-Fehler:', err))
  );
});

// ═══════════════════════════════════════════════════════════
//  ACTIVATE – Alte Caches löschen
// ═══════════════════════════════════════════════════════════
self.addEventListener('activate', event => {
  console.log('[SW] Activate:', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Lösche alten Cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim()) // Sofort für alle Tabs aktiv
  );
});

// ═══════════════════════════════════════════════════════════
//  FETCH – Caching-Strategie
// ═══════════════════════════════════════════════════════════
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignoriere nicht-GET Requests (POST, PUT, DELETE)
  if (request.method !== 'GET') return;

  // Ignoriere Chrome Extensions und andere Browser-Requests
  if (!request.url.startsWith('http')) return;

  // ── Supabase API → Network First ──────────────────────────
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Statische Assets → Cache First ────────────────────────
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Navigation (HTML) → Network First mit Fallback ────────
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // ── CDN (Supabase JS, Fonts etc.) → Stale While Revalidate
  if (isCDN(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── Default: Network First ─────────────────────────────────
  event.respondWith(networkFirst(request));
});

// ═══════════════════════════════════════════════════════════
//  CACHING STRATEGIEN
// ═══════════════════════════════════════════════════════════

// Network First: Immer Netzwerk versuchen, bei Fehler Cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Erfolgreiche Antworten im Dynamic Cache speichern
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      await trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_MAX);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(
      JSON.stringify({ error: 'Offline – keine gecachte Version verfügbar' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Cache First: Aus Cache laden, bei Miss Netzwerk
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache    = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network First mit HTML Fallback für Navigation
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    const cache    = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback zur index.html (SPA)
    return caches.match('/index.html') ||
           new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
  }
}

// Stale While Revalidate: Sofort aus Cache, im Hintergrund aktualisieren
async function staleWhileRevalidate(request) {
  const cache  = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_MAX);
    }
    return response;
  }).catch(() => null);

  return cached || (await networkFetch) || new Response('Offline', { status: 503 });
}

// ═══════════════════════════════════════════════════════════
//  HELPER
// ═══════════════════════════════════════════════════════════
function isApiRequest(url) {
  return API_HOSTS.some(host => url.hostname.includes(host));
}

function isStaticAsset(url) {
  return /\.(css|js|png|jpg|jpeg|webp|gif|ico|svg|woff2?|ttf)$/.test(url.pathname);
}

function isCDN(url) {
  return url.hostname.includes('jsdelivr.net') ||
         url.hostname.includes('cdn.jsdelivr') ||
         url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com');
}

// Cache-Größe begrenzen (älteste Einträge entfernen)
async function trimCache(cacheName, maxSize) {
  const cache   = await caches.open(cacheName);
  const keys    = await cache.keys();
  if (keys.length > maxSize) {
    const toDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ═══════════════════════════════════════════════════════════
//  BACKGROUND SYNC (optionale Erweiterung)
// ═══════════════════════════════════════════════════════════
self.addEventListener('sync', event => {
  console.log('[SW] Background Sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Sendet Nachricht an die App
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'BACKGROUND_SYNC' });
        });
      })
    );
  }
});

// ═══════════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS (Vorbereitung)
// ═══════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'RailApp', {
      body:    data.body || '',
      icon:    '/icon-192.png',
      badge:   '/icon-72.png',
      data:    data,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

// ═══════════════════════════════════════════════════════════
//  MESSAGE HANDLER (Kommunikation mit App)
// ═══════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage(CACHE_VERSION);
  }
});
