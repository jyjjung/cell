import { type NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { PRAYER_SHEPHERD_EMAIL } from '@/lib/prayer-requests';
import { resolveUserIdByEmail, sendUserNotification } from '@/lib/server-notifications';

function preview(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestId = body.requestId as string | undefined;

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);

    let submitterUid: string;
    try {
      submitterUid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const requestRef = adminDb.collection('prayerRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Prayer request not found.' }, { status: 404 });
    }

    const prayerRequest = requestSnap.data()!;
    if (prayerRequest.submitterId !== submitterUid) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const createdAt = prayerRequest.createdAt as Timestamp | undefined;
    if (!createdAt) {
      return NextResponse.json({ error: 'Prayer request not ready.' }, { status: 400 });
    }
    const ageMs = Date.now() - createdAt.toMillis();
    if (ageMs > 2 * 60 * 1000) {
      return NextResponse.json({ error: 'Notification window expired.' }, { status: 400 });
    }

    const shepherdUserId = await resolveUserIdByEmail(adminDb, PRAYER_SHEPHERD_EMAIL);
    if (!shepherdUserId) {
      return NextResponse.json({ error: 'Shepherd account not found.' }, { status: 404 });
    }

    const requestText = (body.previewText as string) || prayerRequest.text || '';
    const authorLabel = prayerRequest.isAnonymous
      ? 'Anonymous'
      : (prayerRequest.submitterDisplayName || 'A member');

    const result = await sendUserNotification(adminDb, adminMessaging, {
      userId: shepherdUserId,
      title: 'New prayer request',
      message: `${authorLabel} submitted: "${preview(requestText)}"`,
      relatedUrl: '/prayer-requests',
      type: 'reminder',
      dedupeId: `prayer-request-${requestId}`,
    });

    return NextResponse.json({ success: true, sent: result === 'sent' ? 1 : 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[prayer-requests/notify]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
