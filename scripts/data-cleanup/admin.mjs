import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cell-abca4.firebasestorage.app';
if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing split Firebase Admin credentials in .env.local.');
}

const app = getApps()[0] ?? initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
  storageBucket,
});
export const db = getFirestore(app);
export const auth = getAuth(app);
export const bucket = storageBucket ? getStorage(app).bucket(storageBucket) : null;
