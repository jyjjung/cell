
import { type App, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Singleton helper to initialize Firebase Admin reliably across all API routes.
 * Includes robust JSON parsing for environment variables.
 */
export function getAdminApp(): App {
  const UNIFIED_APP_NAME = 'firebase-admin-unified';
  const existingApp = getApps().find(app => app.name === UNIFIED_APP_NAME);
  if (existingApp) return existingApp;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.');
  }

  try {
    // Remove whitespace and handle potential literal \n characters from shell environments
    const sanitizedKey = serviceAccountKey.trim();
    const parsedKey = JSON.parse(sanitizedKey);
    
    return initializeApp({
      credential: cert(parsedKey)
    }, UNIFIED_APP_NAME);
  } catch (e: any) {
    console.error('[Admin Init] Fatal Parse Error:', e.message);
    throw new Error(`Admin SDK Initialization Failed: ${e.message}. Ensure your Service Account JSON is correctly formatted in Vercel.`);
  }
}

export const getAdminDb = (app: App) => getFirestore(app);
export const getAdminAuth = (app: App) => getAuth(app);
export const getAdminMessaging = (app: App) => getMessaging(app);
