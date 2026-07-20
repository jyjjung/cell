
import { type App, getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n').trim();
}

function loadServiceAccountFromParts(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyRaw) return null;
  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
  };
}

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
      const parsed = JSON.parse(candidate) as ServiceAccount & {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const projectId = parsed.projectId || parsed.project_id;
      const clientEmail = parsed.clientEmail || parsed.client_email;
      const privateKey = parsed.privateKey || parsed.private_key;
      if (!projectId || !clientEmail || !privateKey) return null;
      return {
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey),
      };
    } catch {
      // try next parse strategy
    }
  }

  return null;
}

/**
 * Singleton helper to initialize Firebase Admin reliably across all API routes.
 * Prefers split FIREBASE_* vars so a stale JSON env var cannot override a rotated key.
 */
export function getAdminApp(): App {
  const UNIFIED_APP_NAME = 'firebase-admin-unified';
  const existingApp = getApps().find(app => app.name === UNIFIED_APP_NAME);
  if (existingApp) return existingApp;

  // Prefer split vars: after key rotation, old FIREBASE_SERVICE_ACCOUNT_KEY often
  // lingers on Vercel and would otherwise keep using a revoked key.
  const serviceAccount =
    loadServiceAccountFromParts() ?? loadServiceAccountFromEnv();

  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (preferred), or FIREBASE_SERVICE_ACCOUNT_KEY (JSON).',
    );
  }

  return initializeApp({ credential: cert(serviceAccount) }, UNIFIED_APP_NAME);
}

export const getAdminDb = (app: App) => getFirestore(app);
export const getAdminAuth = (app: App) => getAuth(app);
export const getAdminMessaging = (app: App) => getMessaging(app);
export const getAdminStorage = (app: App) => getStorage(app);
