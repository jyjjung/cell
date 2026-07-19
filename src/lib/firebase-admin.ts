
import { type App, getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

function loadServiceAccountFromEnv(): ServiceAccount | null {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const trimmed = raw.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^"|"$/g, ''),
    trimmed.replace(/^"|"$/g, '').replace(/\\"/g, '"'),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as ServiceAccount;
    } catch {
      // try next parse strategy
    }
  }

  return null;
}

function loadServiceAccountFromParts(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/**
 * Singleton helper to initialize Firebase Admin reliably across all API routes.
 * Supports full JSON service account env vars or split project/email/key vars.
 */
export function getAdminApp(): App {
  const UNIFIED_APP_NAME = 'firebase-admin-unified';
  const existingApp = getApps().find(app => app.name === UNIFIED_APP_NAME);
  if (existingApp) return existingApp;

  const serviceAccount =
    loadServiceAccountFromEnv() ?? loadServiceAccountFromParts();

  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.',
    );
  }

  return initializeApp({ credential: cert(serviceAccount) }, UNIFIED_APP_NAME);
}

export const getAdminDb = (app: App) => getFirestore(app);
export const getAdminAuth = (app: App) => getAuth(app);
export const getAdminMessaging = (app: App) => getMessaging(app);
export const getAdminStorage = (app: App) => getStorage(app);
