import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';
import { createShareToken, hashShareToken } from '@/lib/file-share';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json() as { entryId?: unknown };
    if (typeof body.entryId !== 'string' || !body.entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }
    const db = getAdminDb(getAdminApp());
    const user = await db.collection('users').doc(auth.uid).get();
    if (!user.exists || !user.data()?.capabilityKeys?.includes('app.admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const entry = await db.collection('adminFiles').doc(body.entryId).get();
    if (!entry.exists) return NextResponse.json({ error: 'File or folder not found' }, { status: 404 });

    const token = createShareToken();
    await db.collection('adminFileShares').doc(hashShareToken(token)).set({
      entryId: entry.id,
      kind: entry.data()?.kind === 'folder' ? 'folder' : 'file',
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    const origin = request.nextUrl.origin;
    return NextResponse.json({ url: `${origin}/files/public/${token}` });
  } catch (error) {
    console.error('[admin/files/share] Failed to create share link:', error);
    return NextResponse.json({ error: 'Could not create share link' }, { status: 500 });
  }
}
