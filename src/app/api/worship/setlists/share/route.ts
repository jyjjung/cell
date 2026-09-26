import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';
import { createShareToken, hashShareToken } from '@/lib/file-share';
import { userCanManageWorship } from '@/lib/server-worship-access';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json() as { setlistId?: unknown };
    if (typeof body.setlistId !== 'string' || !body.setlistId) {
      return NextResponse.json({ error: 'setlistId is required' }, { status: 400 });
    }

    const db = getAdminDb(getAdminApp());
    if (!(await userCanManageWorship(db, auth.uid))) {
      return NextResponse.json({ error: 'Worship manager access required' }, { status: 403 });
    }
    const setlist = await db.collection('worshipSetlists').doc(body.setlistId).get();
    if (!setlist.exists) return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });

    const token = createShareToken();
    await db.collection('worshipSetlistShares').doc(hashShareToken(token)).set({
      setlistId: setlist.id,
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ url: `${request.nextUrl.origin}/worship/public/${token}` });
  } catch (error) {
    console.error('[worship/setlists/share] Failed to create public link:', error);
    return NextResponse.json({ error: 'Could not create share link' }, { status: 500 });
  }
}
