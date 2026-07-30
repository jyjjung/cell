
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager, type Firestore
} from 'firebase/firestore';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.firebasestorage.app",
  messagingSenderId: "942477536312",
  appId: "1:942477536312:web:9487c6359a19a4c0e7cacd",
  measurementId: "G-1E3HH6TK1J"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

function createDb(): Firestore {
  if (typeof window === 'undefined') {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        cacheSizeBytes: 100 * 1024 * 1024, // 100 MB — keep more chat history on device
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
}

const db = createDb();

const auth = getAuth(app);

if (typeof window !== 'undefined') {
  void setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Firebase auth persistence could not be enabled:', error);
  });
}

const storage = getStorage(app);

let messaging: Messaging | null = null;

/**
 * Resolves to a Messaging instance when the browser supports all APIs required
 * by Firebase Messaging (Service Worker, Push, Notifications, IndexedDB).
 * Resolves to null on unsupported browsers (e.g. Safari without Push support).
 */
export const messagingPromise: Promise<Messaging | null> =
  typeof window !== 'undefined'
    ? isSupported()
        .then((supported) => {
          if (!supported) return null;
          try {
            messaging = getMessaging(app);
            return messaging;
          } catch {
            return null;
          }
        })
        .catch(() => null)
    : Promise.resolve(null);

export { db, auth, storage, messaging, };
