/**
 * @fileOverview Pure Native Web Push Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 * Bypasses Firebase SDK to avoid conflicts and guarantee iOS/Desktop constraints are met.
 */

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

self.addEventListener('push', (event) => {
    // 1. Immediately wrap in waitUntil to satisfy Safari's background contract
    event.waitUntil(
        (async () => {
            let title = 'New Message';
            let options = {
                body: 'You have a new update.',
                icon: '/apple-touch-icon-v3.png',
                tag: 'community-update',
                badge: '/icon-192x192-v3.png',
                data: { link: '/' }
            };

            try {
                // 2. Parse standard Web Push (FCM) JSON payload
                if (event.data) {
                    const payload = event.data.json();
                    const data = payload.data || {};
                    const notification = payload.notification || {};
                    
                    title = notification.title || data.title || title;
                    options.body = notification.body || data.body || options.body;
                    options.icon = notification.icon || data.icon || options.icon;
                    options.tag = notification.tag || data.tag || options.tag;
                    options.data = payload.data || options.data;
                    
                    if (data.link) {
                        options.data.link = data.link;
                    }

                    // 3. Update the app badge natively and via IndexedDB
                    const currentCount = await getBadgeCount();
                    const nextCount = currentCount + 1;
                    await setBadgeCount(nextCount);
                    if (self.navigator && 'setAppBadge' in self.navigator) {
                        await self.navigator.setAppBadge(nextCount);
                    }
                    
                    // 4. Broadcast to clients so they can show an in-app toast if focused
                    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                    for (const client of clientList) {
                        client.postMessage({
                            type: 'FOREGROUND_PUSH',
                            payload: { title, body: options.body, link: options.data.link, tag: options.tag, icon: options.icon }
                        });
                    }

                }
            } catch (e) {
                console.error('[firebase-messaging-sw.js] Payload parsing or badge error:', e);
            }

            // 5. Final Handshake: Always show a notification to satisfy OS constraints (mainly iOS)
            return self.registration.showNotification(title, options);
        })()
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Safely extract the deep link, fallback to home
    const linkToOpen = event.notification.data?.link || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If there is already an open window, focus it and redirect
            for (const client of clientList) {
                if ('focus' in client) {
                    client.postMessage({ type: 'NAVIGATE', link: linkToOpen });
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(linkToOpen);
            }
        })
    );
});
