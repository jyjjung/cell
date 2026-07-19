import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { reconcileAllRoleState } from '@/lib/server-role-state';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const app = getAdminApp();
    const auth = getAdminAuth(app);
    const db = getAdminDb(app);
    const uid = (await auth.verifyIdToken(token)).uid;
    if (!(await userHasAdminAccess(db, uid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: true, ...(await reconcileAllRoleState(db)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Role synchronization failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
