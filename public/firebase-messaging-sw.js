
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


// Robust 'Failsafe' push listener for iOS reliability
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    // 1. Immediately wrap in waitUntil to satisfy Safari's background contract
    event.waitUntil(
        (async () => {
            const origin = self.location.origin;
            let title = 'New Message';
            let options = {
                body: 'You have a new update in your Sync chat.',
                icon: `${origin}/icon-192x192-v3.png`,
                tag: 'community-update',
                badge: `${origin}/icon-192x192-v3.png`,
            };

            try {
                if (event.data) {
                    const payload = event.data.text();
                    console.log('[SW] Raw payload:', payload);

                    try {
                        const json = event.data.json();
                        console.log('[SW] JSON parsed:', json);

                        // 2. Extract from standard notification block
                        const fcmNotif = json.notification || (json.data && json.data.notification ? JSON.parse(json.data.notification) : null);
                        
                        if (fcmNotif) {
                            title = fcmNotif.title || title;
                            options.body = fcmNotif.body || options.body;
                        }

                        // 3. Extract from custom data block (Badge & Link)
                        const data = json.data || {};
                        title = data.title || title;
                        options.body = data.body || options.body;
                        options.tag = data.tag || options.tag;
                        
                        if (data.link) {
                            options.data = { link: data.link };
                        }

                        // 4. Server-Side Badging: Set the app icon badge directly from the signal
                        if (data.badge && self.navigator && 'setAppBadge' in self.navigator) {
                            const count = parseInt(data.badge, 10);
                            console.log('[SW] Setting App Badge:', count);
                            if (!isNaN(count)) {
                                await self.navigator.setAppBadge(count);
                            }
                        }
                    } catch (err) {
                        console.warn('[SW] JSON parse failed, using text fallback');
                        options.body = payload || options.body;
                    }
                } else {
                    console.warn('[SW] No data in push event');
                }
            } catch (e) {
                console.error('[SW] Failsafe parsing error:', e);
            }

            // 5. Final Handshake: Always show a notification
            console.log('[SW] Showing notification:', title, options);
            return self.registration.showNotification(title, options);
        })()
    );
});

