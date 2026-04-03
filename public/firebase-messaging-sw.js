
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 */

// Import and configure the Firebase SDK
// Lifecycle events (install/activate) are handled by the main sw.js file.
// We only include the messaging logic here.

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
    event.waitUntil(setBadgeCount(event.data.count));
  }
});

// Explicit 'Silent Sync' push listener for iOS reliability
// Now that the backend sends a 'notification' block (to wake up iOS),
// this worker focuses on updating the app icon badge in the background.
self.addEventListener('push', (event) => {
    // All background tasks MUST be wrapped in event.waitUntil
    event.waitUntil(
        (async () => {
            // 1. Update the app badge
            try {
                const currentCount = await getBadgeCount();
                const nextCount = currentCount + 1;
                await setBadgeCount(nextCount);
                if (self.navigator && 'setAppBadge' in self.navigator) {
                    await self.navigator.setAppBadge(nextCount);
                }
            } catch (e) {
                console.error('[firebase-messaging-sw.js] Badge sync error:', e);
            }

            // Note: We do NOT manually call showNotification here because 
            // the backend now sends a 'notification' object, which Safari 
            // displays automatically. This prevents duplicate banners.
        })()
    );
});

