
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, Timestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.appspot.com",
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

const db = getFirestore(app);

// Enable offline persistence for better performance and "instant" feel
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence: Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence: The current browser does not support all of the features required to enable persistence.');
    }
  });
}

const auth = getAuth(app);
const storage = getStorage(app);

let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.warn("Firebase Messaging not supported in this browser. Push notifications will be disabled.", e);
    }
}

export { app, db, auth, storage, messaging, Timestamp, firebaseConfig };
