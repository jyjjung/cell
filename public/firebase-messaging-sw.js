
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


// Robust 'Master' push listener for all platforms
self.addEventListener('push', (event) => {
    console.log('[SW] Push signal received');

    event.waitUntil(
        (async () => {
            const origin = self.location.origin;
            let title = 'em.';
            let options = {
                body: 'New update received.',
                icon: `${origin}/icon-192x192-v3.png`,
                badge: `${origin}/icon-192x192-v3.png`,
                tag: 'em-notification-sync',
                data: { link: '/' },
            };

            try {
                if (!event.data) throw new Error("No data in push event");
                
                const json = event.data.json();
                console.log('[SW] Payload:', json);

                // 1. Extract content from multiple potential FCM blocks
                const data = json.data || {};
                const notification = json.notification || {};

                title = data.title || notification.title || title;
                options.body = data.body || notification.body || options.body;
                options.tag = data.tag || options.tag;
                
                if (data.link) options.data.link = data.link;

                // 2. Core Feature: OS-Level Badging
                // This must happen in the waitUntil block to guarantee execution on iOS/Safari
                if (data.badge && 'setAppBadge' in self.navigator) {
                    const count = parseInt(data.badge, 10);
                    if (!isNaN(count)) {
                        console.log('[SW] Updating OS badge:', count);
                        await self.navigator.setAppBadge(count);
                    }
                }
            } catch (err) {
                console.warn('[SW] Parsing failed or partial data:', err.message);
            }

            // 3. Final Display: Always show a notification to satisfy browser background contracts
            // We use the 'tag' to ensure that if the browser natively showed an FCM notification, 
            // our custom one replaces it with the correct localized content and links.
            return self.registration.showNotification(title, options);
        })()
    );
});

/**
 * Handle Notification Click: 
 * Opens the app or focuses an existing window and navigates to the target link.
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);
    event.notification.close();

    const urlToOpen = event.notification.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 1. If a window is already open at this origin, focus it and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then((focusedClient) => {
                        return focusedClient.navigate(urlToOpen);
                    });
                }
            }
            // 2. If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

