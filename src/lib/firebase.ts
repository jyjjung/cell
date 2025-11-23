
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { useToast } from '@/hooks/use-toast';

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

// --- Firebase Cloud Messaging (FCM) ---
export const getMessagingInstance = () => {
    if (typeof window !== 'undefined' && getApps().length > 0) {
        return getMessaging(app);
    }
    return null;
};

export const requestNotificationPermission = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    const messaging = getMessagingInstance();
    if (!messaging) return null;
    
    console.log("Requesting permission...");
    const permission = await Notification.requestPermission();
  
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      try {
        const currentToken = await getToken(messaging, {
          vapidKey: 'BJEgWAg5YpC4ZJ1XG3dYqX8c9q5z4J3c6k8fE7zJ7yF1gP3nJ9bB2c7kR6', // Replace with your VAPID key
        });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          return currentToken;
        } else {
          console.log('No registration token available. Request permission to generate one.');
          throw new Error('No registration token available.');
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        throw err;
      }
    } else {
      console.log('Unable to get permission to notify.');
      throw new Error('Notification permission not granted.');
    }
  };
  
export const saveTokenToFirestore = async (userId: string, token: string) => {
    if (!userId || !token) return;
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        fcmTokens: arrayUnion(token)
    });
};

export const removeTokenFromFirestore = async (userId: string, token: string) => {
    if (!userId || !token) return;
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        fcmTokens: arrayRemove(token)
    });
};


// Foreground message handler
export const onForegroundMessage = () => {
    const messaging = getMessagingInstance();
    if (messaging) {
        onMessage(messaging, (payload) => {
            console.log('Foreground message received.', payload);
            const { toast } = useToast();
            toast({
                title: payload.notification?.title,
                description: payload.notification?.body,
            });
        });
    }
};

export { app, db, auth, Timestamp };
