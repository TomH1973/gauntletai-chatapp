/// <reference lib="webworker" />

const CACHE_NAME = 'chatapp-v1';
const OFFLINE_QUEUE_NAME = 'offline-messages';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets
];

declare const self: ServiceWorkerGlobalScope;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - handle offline requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle API requests differently from static assets
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              return response;
            });
        })
    );
  }
});

// Message event - handle offline message queue
self.addEventListener('message', async (event) => {
  if (event.data.type === 'QUEUE_MESSAGE') {
    const db = await openDB();
    const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE_NAME);
    await store.add({
      ...event.data.message,
      timestamp: new Date().toISOString(),
    });
    await tx.complete;
  }
});

// IndexedDB setup
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatAppDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_NAME)) {
        db.createObjectStore(OFFLINE_QUEUE_NAME, { 
          keyPath: 'id',
          autoIncrement: true 
        });
      }
    };
  });
}

// Sync event - process offline queue when back online
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  const db = await openDB();
  const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
  const store = tx.objectStore(OFFLINE_QUEUE_NAME);
  const messages = await store.getAll();

  for (const message of messages) {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      await store.delete(message.id);
    } catch (error) {
      console.error('Failed to sync message:', error);
    }
  }

  await tx.complete;
} 