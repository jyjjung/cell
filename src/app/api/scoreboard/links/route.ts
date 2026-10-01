import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { verifyAuthToken, isAuthError } from '@/lib/api-auth';
import { userHasAdminAccess } from '@/lib/server-admin-access';

const LINKS_COLLECTION = 'scoreboardLinks';

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const adminDb = getAdminDb(getAdminApp());
    if (!(await userHasAdminAccess(adminDb, authResult.uid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const publicToken = randomUUID();
    const editToken = randomUUID();
    const batch = adminDb.batch();
    const now = new Date();
    batch.set(adminDb.collection(LINKS_COLLECTION).doc(publicToken), {
      kind: 'view',
      createdBy: authResult.uid,
      createdAt: now,
    });
    batch.set(adminDb.collection(LINKS_COLLECTION).doc(editToken), {
      kind: 'edit',
      createdBy: authResult.uid,
      createdAt: now,
    });
    await batch.commit();

    const origin = new URL(request.url).origin;
    return NextResponse.json({
      publicUrl: `${origin}/scoreboard/public/${publicToken}`,
      editUrl: `${origin}/scoreboard/public/${editToken}`,
    });
  } catch (error) {
    console.error('Could not create scoreboard links:', error);
    return NextResponse.json({ error: 'Could not create scoreboard links' }, { status: 500 });
  }
}
