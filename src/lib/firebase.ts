
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, Timestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

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

// Disable offline persistence to prevent quota errors
// if (typeof window !== 'undefined') {
//   enableMultiTabIndexedDbPersistence(db)
//     .catch((err) => {
//       if (err.code == 'failed-precondition') {
//         console.warn('Firebase: Multiple tabs open, persistence can only be enabled in one tab at a time.');
//       } else if (err.code == 'unimplemented') {
//         console.warn('Firebase: The current browser does not support all of the features required to enable persistence.');
//       } else {
//         console.warn('Firebase: Error enabling persistence:', err);
//       }
//     });
// }


export { app, db, auth, Timestamp };
