import { type NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { resolveUserIdByEmail, sendUserNotification } from '@/lib/server-notifications';
import { hasCapability } from '@/lib/role-capabilities';
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit';

const SIGNUP_NOTIFY_EMAIL =
  process.env.SIGNUP_NOTIFY_EMAIL || 'yejoon7154@gmail.com';

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`signup-notify:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

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
    if (user.isApproved || hasCapability(user.capabilityKeys, 'app.admin')) {
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

    const notifyUserId = await resolveUserIdByEmail(adminDb, SIGNUP_NOTIFY_EMAIL);
    if (!notifyUserId || notifyUserId === userId) {
      return NextResponse.json({ success: true, sent: 0, skipped: 'no_recipient' });
    }

    const firstName = (user.firstName as string) || '';
    const lastName = (user.lastName as string) || '';
    const email = (user.email as string) || '';
    const displayName = `${firstName} ${lastName}`.trim() || email || 'Someone';

    const result = await sendUserNotification(adminDb, adminMessaging, {
      userId: notifyUserId,
      title: 'New signup pending approval',
      message: `${displayName} (${email}) signed up and is waiting for approval.`,
      relatedUrl: '/admin/users',
      type: 'reminder',
      dedupeId: `signup-pending-${userId}-${notifyUserId}`,
    });

    return NextResponse.json({
      success: true,
      sent: result === 'sent' ? 1 : 0,
      skipped: result === 'skipped' ? 1 : 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[signup/notify]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
