
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 */

// Import and configure the Firebase SDK
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.firebasestorage.app",
  messagingSenderId: "942477536312",
  appId: "1:942477536312:web:9487c6359a19a4c0e7cacd",
});

const messaging = firebase.messaging();

function getBadgeCount() {
  return new Promise((resolve) => {
    const request = indexedDB.open('badgeDB', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('badgeStore');
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('badgeStore')) {
        return resolve(0);
      }
      const tx = db.transaction('badgeStore', 'readonly');
      const store = tx.objectStore('badgeStore');
      const getReq = store.get('count');
      getReq.onsuccess = () => resolve(getReq.result || 0);
      getReq.onerror = () => resolve(0);
    };
    request.onerror = () => resolve(0);
  });
}

function setBadgeCount(count) {
  return new Promise((resolve) => {
    const request = indexedDB.open('badgeDB', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('badgeStore');
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('badgeStore', 'readwrite');
      tx.objectStore('badgeStore').put(count, 'count');
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_BADGE') {
    setBadgeCount(event.data.count);
  }
});

// Explicit native push listener for guaranteed badging updates on iOS Safari
// Ensures the OS waits for indexedDB resolution before closing the service worker
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      if (self.navigator && 'setAppBadge' in self.navigator) {
        try {
          const currentCount = await getBadgeCount();
          const nextCount = currentCount + 1;
          await setBadgeCount(nextCount);
          if (self.navigator.setAppBadge) {
            await self.navigator.setAppBadge(nextCount);
          }
        } catch (e) {
          console.error('[firebase-messaging-sw.js] Error setting app badge:', e);
        }
      }
    })()
  );
});

// Handle background messages for fallback data-only notification rendering
messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // If the payload has a 'notification' field, FirebaseSDK automatically displays it.
  // We ONLY show a notification manually if it's a data-only fallback.
  if (!payload.notification) {
    const notificationTitle = payload.data?.title || 'New Message';
    const notificationOptions = {
      body: payload.data?.body || 'You have a new update.',
      icon: payload.data?.icon || '/icon-192x192.png',
      tag: payload.data?.tag || 'default-tag',
      data: {
          link: payload.data?.link || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

