
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

// Explicit 'Hard Handshake' push listener for iOS reliability
// We manually parse the data, update the badge, and show the notification.
// This ensures that the OS keeps the worker alive until the alert is shown.
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const payload = event.data.json();
        console.log('[firebase-messaging-sw.js] Manual Push received:', payload);

        // All asynchronous tasks MUST be wrapped in event.waitUntil
        event.waitUntil(
            (async () => {
                // 1. Update the app badge
                const currentCount = await getBadgeCount();
                const nextCount = currentCount + 1;
                await setBadgeCount(nextCount);
                if (self.navigator && 'setAppBadge' in self.navigator) {
                    await self.navigator.setAppBadge(nextCount);
                }

                // 2. Extract notification details from the 'data' payload
                const data = payload.data || {};
                const title = data.title || 'New Message';
                const notificationOptions = {
                    body: data.body || 'You have a new update.',
                    icon: data.icon || '/apple-touch-icon-v3.png', // Fallback to v3 solid png
                    tag: data.tag || 'community-update',
                    badge: '/icon-192x192-v3.png',
                    data: {
                        link: data.link || '/'
                    }
                };

                // 3. Show the notification (Safari REQUIRED - must show for background survival)
                await self.registration.showNotification(title, notificationOptions);
            })()
        );
    } catch (err) {
        console.error('[firebase-messaging-sw.js] Push Processing Error:', err);
    }
});

