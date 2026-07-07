import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { ADMIN_ROLE_NAMES } from '@/lib/admin-access';

const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    let uid: string;
    try {
      uid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userSnap, rolesSnap] = await Promise.all([
      adminDb.collection(USERS_COLLECTION).doc(uid).get(),
      adminDb.collection(ROLES_COLLECTION).get(),
    ]);

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userSnap.data()!;
    const adminRoleIds = rolesSnap.docs
      .filter((doc) => ADMIN_ROLE_NAMES.includes(doc.data()?.name as typeof ADMIN_ROLE_NAMES[number]))
      .map((doc) => doc.id);

    const roleIds: string[] = Array.isArray(user.roleIds) ? user.roleIds : [];
    const hasAdminRole = adminRoleIds.some((id) => roleIds.includes(id));

    if (hasAdminRole && !user.isAdmin) {
      await adminDb.collection(USERS_COLLECTION).doc(uid).update({
        isAdmin: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, synced: true });
    }

    return NextResponse.json({ success: true, synced: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auth/sync-admin-access]', message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
