import type { NextRequest } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';

export type VerifiedAdminContext = {
  adminAuth: Auth;
  adminDb: Firestore;
  callerUid: string;
};

export async function verifyAdminRequest(
  request: NextRequest,
): Promise<{ ok: true; ctx: VerifiedAdminContext } | { ok: false; status: number; error: string }> {
  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  try {
    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);
    const decoded = await adminAuth.verifyIdToken(token);
    const callerIsAdmin = await userHasAdminAccess(adminDb, decoded.uid);
    if (!callerIsAdmin) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    return { ok: true, ctx: { adminAuth, adminDb, callerUid: decoded.uid } };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Firebase Admin credentials missing')) {
      console.error('[verifyAdminRequest] Firebase Admin credentials are not configured');
      return { ok: false, status: 503, error: 'Server authentication is not configured for local development.' };
    }
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}
