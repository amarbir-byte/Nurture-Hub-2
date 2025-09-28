/**
 * Enterprise Service Worker
 *
 * Features:
 * - Intelligent caching strategies
 * - Offline support for critical features
 * - Background sync for data persistence
 * - Push notifications
 * - Performance optimization
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `nurture-hub-static-${CACHE_VERSION}`,
  api: `nurture-hub-api-${CACHE_VERSION}`,
  images: `nurture-hub-images-${CACHE_VERSION}`,
  fonts: `nurture-hub-fonts-${CACHE_VERSION}`
};

// URLs to cache immediately when service worker installs
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add critical CSS and JS files here
];

// API routes that should be cached
const CACHEABLE_API_ROUTES = [
  '/api/contacts',
  '/api/properties',
  '/api/dashboard/stats',
  '/api/subscription'
];

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  // HTML pages: Network first, fallback to cache
  pages: 'network-first',
  // API calls: Cache first for read operations, network only for writes
  api: 'cache-first',
  // Static assets: Cache first with long TTL
  static: 'cache-first',
  // Images: Cache first with background sync
  images: 'cache-first',
  // Fonts: Cache first (rarely change)
  fonts: 'cache-first'
};

// Maximum cache sizes to prevent storage overflow
const MAX_CACHE_SIZES = {
  static: 50,
  api: 100,
  images: 200,
  fonts: 20
};

// TTL for different cache types (in milliseconds)
const CACHE_TTL = {
  static: 24 * 60 * 60 * 1000, // 24 hours
  api: 5 * 60 * 1000, // 5 minutes
  images: 7 * 24 * 60 * 60 * 1000, // 7 days
  fonts: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// 🚀 SERVICE WORKER INSTALLATION
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    Promise.all([
      // Precache critical resources
      caches.open(CACHE_NAMES.static).then((cache) => {
        console.log('📦 Precaching static resources...');
        return cache.addAll(PRECACHE_URLS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// 🔄 SERVICE WORKER ACTIVATION
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// 🌐 FETCH EVENT HANDLER (Main caching logic)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = getCacheStrategy(request);

  switch (strategy) {
    case 'network-first':
      event.respondWith(networkFirst(request));
      break;
    case 'cache-first':
      event.respondWith(cacheFirst(request));
      break;
    case 'network-only':
      event.respondWith(networkOnly(request));
      break;
    case 'cache-only':
      event.respondWith(cacheOnly(request));
      break;
    default:
      // Let browser handle the request
      break;
  }
});

// 📱 BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);

  if (event.tag === 'contact-sync') {
    event.waitUntil(syncContacts());
  } else if (event.tag === 'property-sync') {
    event.waitUntil(syncProperties());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

// 🔔 PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');

  const options = {
    body: 'You have new updates in Nurture Hub',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'nurture-hub-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-dismiss.png'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.title = data.title || 'Nurture Hub';
      options.tag = data.tag || options.tag;
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Nurture Hub', options)
  );
});

// 🖱️ NOTIFICATION CLICK HANDLER
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 🎯 CACHE STRATEGY IMPLEMENTATIONS

// Network First: Try network, fallback to cache
async function networkFirst(request) {
  const cacheName = getCacheName(request);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('🔄 Network failed, trying cache:', request.url);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If it's a page request and we have an offline page, serve that
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

// Cache First: Try cache, fallback to network
async function cacheFirst(request) {
  const cacheName = getCacheName(request);

  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse && !isExpired(cachedResponse, request)) {
    return cachedResponse;
  }

  console.log('💾 Cache miss or expired, fetching:', request.url);

  try {
    // Cache miss or expired, try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);

      // Add timestamp header for TTL tracking
      const responseWithTimestamp = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...networkResponse.headers,
          'sw-cached-at': Date.now().toString()
        }
      });

      cache.put(request, responseWithTimestamp.clone());
      return responseWithTimestamp;
    }

    // Return cached response even if expired when network fails
    if (cachedResponse) {
      console.log('🔄 Network failed, serving stale cache:', request.url);
      return cachedResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network Only: Always use network
async function networkOnly(request) {
  return fetch(request);
}

// Cache Only: Always use cache
async function cacheOnly(request) {
  return caches.match(request);
}

// 🔧 HELPER FUNCTIONS

function getCacheStrategy(request) {
  const url = new URL(request.url);

  // API requests
  if (url.pathname.startsWith('/api/')) {
    // Write operations should always go to network
    if (request.method !== 'GET') {
      return 'network-only';
    }

    // Cacheable API routes
    if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
      return 'cache-first';
    }

    return 'network-first';
  }

  // Static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/)) {
    return 'cache-first';
  }

  // HTML pages
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    return 'network-first';
  }

  // Default to network first
  return 'network-first';
}

function getCacheName(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return CACHE_NAMES.api;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    return CACHE_NAMES.images;
  }

  if (url.pathname.match(/\.(woff|woff2|ttf|eot)$/)) {
    return CACHE_NAMES.fonts;
  }

  return CACHE_NAMES.static;
}

function isExpired(response, request) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;

  const cacheAge = Date.now() - parseInt(cachedAt);
  const cacheName = getCacheName(request);

  let ttl = CACHE_TTL.static;
  if (cacheName === CACHE_NAMES.api) ttl = CACHE_TTL.api;
  else if (cacheName === CACHE_NAMES.images) ttl = CACHE_TTL.images;
  else if (cacheName === CACHE_NAMES.fonts) ttl = CACHE_TTL.fonts;

  return cacheAge > ttl;
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCacheNames = Object.values(CACHE_NAMES);

  return Promise.all(
    cacheNames.map((cacheName) => {
      if (!currentCacheNames.includes(cacheName)) {
        console.log('🗑️ Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Remove oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
    console.log(`🧹 Cleaned ${toDelete.length} items from ${cacheName}`);
  }
}

// 🔄 BACKGROUND SYNC HANDLERS

async function syncContacts() {
  console.log('🔄 Syncing contacts...');

  try {
    // Get pending contact changes from IndexedDB
    const pendingChanges = await getPendingChanges('contacts');

    for (const change of pendingChanges) {
      try {
        await fetch('/api/contacts', {
          method: change.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change.data)
        });

        await removePendingChange('contacts', change.id);
      } catch (error) {
        console.error('Failed to sync contact:', error);
      }
    }

    console.log('✅ Contact sync completed');
  } catch (error) {
    console.error('Contact sync failed:', error);
    throw error;
  }
}

async function syncProperties() {
  console.log('🔄 Syncing properties...');

  try {
    const pendingChanges = await getPendingChanges('properties');

    for (const change of pendingChanges) {
      try {
        await fetch('/api/properties', {
          method: change.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change.data)
        });

        await removePendingChange('properties', change.id);
      } catch (error) {
        console.error('Failed to sync property:', error);
      }
    }

    console.log('✅ Property sync completed');
  } catch (error) {
    console.error('Property sync failed:', error);
    throw error;
  }
}

async function syncAnalytics() {
  console.log('🔄 Syncing analytics...');

  try {
    const pendingEvents = await getPendingChanges('analytics');

    if (pendingEvents.length > 0) {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: pendingEvents })
      });

      await clearPendingChanges('analytics');
    }

    console.log('✅ Analytics sync completed');
  } catch (error) {
    console.error('Analytics sync failed:', error);
    throw error;
  }
}

// 💾 INDEXED DB HELPERS (Simplified - in real implementation, use a proper library)

async function getPendingChanges(store) {
  // In a real implementation, you would use IndexedDB to store pending changes
  // For now, return empty array
  return [];
}

async function removePendingChange(store, id) {
  // Remove specific pending change from IndexedDB
  console.log(`Removing pending change ${id} from ${store}`);
}

async function clearPendingChanges(store) {
  // Clear all pending changes for a store
  console.log(`Clearing all pending changes from ${store}`);
}

// 🎯 PERIODIC CACHE CLEANUP
setInterval(async () => {
  console.log('🧹 Running periodic cache cleanup...');

  // Limit cache sizes
  await Promise.all([
    limitCacheSize(CACHE_NAMES.static, MAX_CACHE_SIZES.static),
    limitCacheSize(CACHE_NAMES.api, MAX_CACHE_SIZES.api),
    limitCacheSize(CACHE_NAMES.images, MAX_CACHE_SIZES.images),
    limitCacheSize(CACHE_NAMES.fonts, MAX_CACHE_SIZES.fonts)
  ]);
}, 10 * 60 * 1000); // Every 10 minutes