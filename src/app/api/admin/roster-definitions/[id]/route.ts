import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    await db.recursiveDelete(db.collection('rosterDefinitions').doc(params.id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not delete roster definition.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
