
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 */

// Import and configure the Firebase SDK
// Lifecycle events (install/activate) are handled by the main sw.js file.
// We only include the messaging logic here.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase app for common background logic (badge/storage)
firebase.initializeApp({
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.firebasestorage.app",
  messagingSenderId: "942477536312",
  appId: "1:942477536312:web:9487c6359a19a4c0e7cacd",
});

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

// Robust 'Failsafe' push listener for iOS reliability
// We MUST call showNotification() within event.waitUntil() to avoid 
// Safari's "Silent Push" blacklist penalty.
self.addEventListener('push', (event) => {
    // 1. Immediately wrap in waitUntil to satisfy Safari's background contract
    event.waitUntil(
        (async () => {
            let title = 'New Message';
            let options = {
                body: 'You have a new update in your Sync chat.',
                icon: '/apple-touch-icon-v3.png',
                tag: 'community-update', // Default tag to prevent flooding
                badge: '/icon-192x192-v3.png',
            };

            try {
                // 1b. Smart Deduplication: If the FCM message already contains a top-level 
                // 'notification' block, the browser (or the SDK) will show it automatically.
                // We SKIP the manual showNotification to prevent "Double Banners".
                if (event.data) {
                    const json = event.data.json();
                    if (json && (json.notification || json.webpush?.notification)) {
                        console.log('[firebase-messaging-sw.js] Browser is handling the banner. Skipping manual display.');
                        return; // Exit silently
                    }
                }

                // 2. Attempt to parse rich data for manual display (only if above check passed)
                if (event.data) {
                    const text = event.data.text();
                    try {
                        const payload = JSON.parse(text);
                        const data = payload.data || {};
                        title = data.title || title;
                        options.body = data.body || options.body;
                        options.tag = data.tag || options.tag;
                        if (data.link) {
                            options.data = { link: data.link };
                        }
                    } catch (jsonErr) {
                        // Not JSON, but could be plain text
                        options.body = text || options.body;
                    }
                }

                // 3. Update the app badge silently
                const currentCount = await getBadgeCount();
                const nextCount = currentCount + 1;
                await setBadgeCount(nextCount);
                if (self.navigator && 'setAppBadge' in self.navigator) {
                    await self.navigator.setAppBadge(nextCount);
                }
            } catch (e) {
                console.error('[firebase-messaging-sw.js] Failsafe parsing error:', e);
                // We continue anyway—showing the default 'New Message' is better 
                // than showing nothing and getting blacklisted by Safari.
            }

            // 4. Final Handshake: Always show a notification
            return self.registration.showNotification(title, options);
        })()
    );
});

