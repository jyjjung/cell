
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, Timestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';


// Ensuring this matches the user's latest provided configuration
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

const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Firebase: Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code == 'unimplemented') {
        console.warn('Firebase: The current browser does not support all of the features required to enable persistence.');
      } else {
        console.warn('Firebase: Error enabling persistence:', err);
      }
    });
}

// Push Notifications
export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error("This browser does not support desktop notification");
  }

  const messaging = getMessaging(app);
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    console.log('Notification permission granted.');
    // Get the token
    const currentToken = await getToken(messaging, { vapidKey: 'BPE1Sj5U6D6wULADs8p87r8iOo_i1PSVOPtqVaxLqgA6yNBhXgO1AtA0X8KjG8F3s6eA0e8-0J0c6S7i3B_X8vE' });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // Save the token to the user's profile
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        fcmTokens: arrayUnion(currentToken)
      });
      return true;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      throw new Error('Could not get FCM token.');
    }
  } else {
    console.log('Unable to get permission to notify.');
    return false; // Return false instead of throwing an error
  }
};

export const removeNotificationToken = async (userId: string) => {
    if (typeof window === 'undefined') return;
    const messaging = getMessaging(app);
    const currentToken = await getToken(messaging, { vapidKey: 'BPE1Sj5U6D6wULADs8p87r8iOo_i1PSVOPtqVaxLqgA6yNBhXgO1AtA0X8KjG8F3s6eA0e8-0J0c6S7i3B_X8vE' });
    if (currentToken) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            fcmTokens: arrayRemove(currentToken)
        });
    }
};

// Set up the listener for foreground messages
if (typeof window !== 'undefined') {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // You can customize how you handle the foreground message here.
        // For example, by showing a custom toast.
        new Notification(payload.notification?.title || 'New Message', {
            body: payload.notification?.body,
            icon: payload.notification?.icon,
        });
    });
}


export { app, db, auth, Timestamp };
