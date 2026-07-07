import { type NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { getAdminUserIds, sendUserNotification } from '@/lib/server-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);

    let callerUid: string;
    try {
      callerUid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    if (callerUid !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const user = userSnap.data()!;
    if (user.isApproved || user.isAdmin) {
      return NextResponse.json({ success: true, sent: 0, skipped: 'already_approved' });
    }

    const createdAt = user.createdAt as Timestamp | undefined;
    if (!createdAt) {
      return NextResponse.json({ error: 'User profile not ready.' }, { status: 400 });
    }
    const ageMs = Date.now() - createdAt.toMillis();
    if (ageMs > 2 * 60 * 1000) {
      return NextResponse.json({ error: 'Notification window expired.' }, { status: 400 });
    }

    const adminIds = await getAdminUserIds(adminDb);
    if (adminIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, skipped: 'no_admins' });
    }

    const firstName = (user.firstName as string) || '';
    const lastName = (user.lastName as string) || '';
    const email = (user.email as string) || '';
    const displayName = `${firstName} ${lastName}`.trim() || email || 'Someone';

    let sent = 0;
    let skipped = 0;

    for (const adminId of adminIds) {
      if (adminId === userId) continue;

      const result = await sendUserNotification(adminDb, adminMessaging, {
        userId: adminId,
        title: 'New signup pending approval',
        message: `${displayName} (${email}) signed up and is waiting for approval.`,
        relatedUrl: '/admin/users',
        type: 'reminder',
        dedupeId: `signup-pending-${userId}-${adminId}`,
      });

      if (result === 'sent') sent++;
      else skipped++;
    }

    return NextResponse.json({ success: true, sent, skipped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[signup/notify]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
