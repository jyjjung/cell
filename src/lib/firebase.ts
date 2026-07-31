
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import {
    clearIndexedDbPersistence,
    getFirestore,
    initializeFirestore,
    memoryLocalCache,
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

const IDB_RECOVERY_FLAG = 'idb_recovery_attempted';

function createDb(): Firestore {
  if (typeof window === 'undefined') {
    return getFirestore(app);
  }

  // If a previous recovery attempt already happened, fall back to memory cache
  // to avoid an infinite reload loop when IndexedDB remains broken.
  const recoveryAttempted = sessionStorage.getItem(IDB_RECOVERY_FLAG) === '1';
  if (recoveryAttempted) {
    sessionStorage.removeItem(IDB_RECOVERY_FLAG);
    return initializeFirestore(app, { localCache: memoryLocalCache() });
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

/**
 * Detects Firestore IndexedDB corruption (e.g. after the user clears site data)
 * and automatically recovers by wiping the stale IndexedDB and reloading once.
 */
function isIndexedDbCorruptionError(reason: unknown): boolean {
  if (!(reason instanceof Error)) return false;
  const msg = reason.message ?? '';
  return (
    msg.includes('IndexedDB transaction') &&
    (msg.includes('AbortError') || msg.includes('code=unavailable'))
  );
}

const db = createDb();

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isIndexedDbCorruptionError(event.reason)) {
      // Prevent the error from surfacing further while we recover.
      event.preventDefault();
      if (sessionStorage.getItem(IDB_RECOVERY_FLAG) === '1') {
        // Already tried once — don't loop; let the memory-cache fallback handle it.
        return;
      }
      sessionStorage.setItem(IDB_RECOVERY_FLAG, '1');
      // clearIndexedDbPersistence must be called before any Firestore operations;
      // since we're mid-session we reload immediately after clearing.
      clearIndexedDbPersistence(db)
        .catch(() => { /* ignore secondary errors */ })
        .finally(() => window.location.reload());
    }
  });
}

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
