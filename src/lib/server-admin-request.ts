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
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
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
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}
