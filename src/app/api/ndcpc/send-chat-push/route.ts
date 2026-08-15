import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { deliverNdcpcChatPush } from '@/lib/ndcpc/server-chat-push';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';
import { hasNdcpcAccess } from '@/lib/app-access';

export async function POST(request: NextRequest) {
  let body: { messageId?: string; authorUid?: string; authorName?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const authResult = await verifyAuthToken(request);
  if (isAuthError(authResult)) return authResult;

  const { messageId, authorUid, authorName, text } = body;
  if (!messageId || typeof messageId !== 'string') {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
  }
  if (typeof authorUid !== 'string' || authorUid !== authResult.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (typeof authorName !== 'string' || !authorName.trim()) {
    return NextResponse.json({ error: 'authorName is required' }, { status: 400 });
  }
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);

    const userSnap = await adminDb.collection('users').doc(authResult.uid).get();
    const profile = userSnap.data();
    if (!userSnap.exists || !hasNdcpcAccess(profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await deliverNdcpcChatPush(
      { messageId, authorUid, authorName: authorName.trim(), text },
      adminDb,
      adminMessaging,
    );

    if (result.reason === 'Already sent') {
      return NextResponse.json({ success: true, delivered: 0, alreadySent: true });
    }

    if (result.delivered === 0 && result.reason && result.reason !== 'No recipients') {
      return NextResponse.json({ success: false, error: result.reason }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      skipped: result.skipped,
      reason: result.reason,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ndcpc/send-chat-push] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
