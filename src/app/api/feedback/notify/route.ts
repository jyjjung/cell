import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { getStatusLabel } from '@/lib/formatting';
import { resolveUserIdByEmail, sendUserNotification } from '@/lib/server-notifications';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit';

const FEEDBACK_ADMIN_EMAIL =
  process.env.FEEDBACK_NOTIFY_EMAIL || 'yejoon7154@gmail.com';

type FeedbackAction = 'submitted' | 'status_updated' | 'admin_note_updated';

function preview(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function getFeedbackAdminUserId(
  adminDb: FirebaseFirestore.Firestore,
): Promise<string | null> {
  return resolveUserIdByEmail(adminDb, FEEDBACK_ADMIN_EMAIL);
}

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`feedback-notify:${ip}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

  try {
    const body = await request.json();
    const action = body.action as FeedbackAction;
    const suggestionId = body.suggestionId as string | undefined;

    if (!action || !suggestionId) {
      return NextResponse.json({ error: 'action and suggestionId are required' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    let actorUid: string | null = null;
    let actorIsAdmin = false;

    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        actorUid = decoded.uid;
        actorIsAdmin = await userHasAdminAccess(adminDb, actorUid);
      } catch {
        return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
      }
    }

    if (action !== 'submitted' && (!actorUid || !actorIsAdmin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const suggestionRef = adminDb.collection('suggestions').doc(suggestionId);
    const suggestionSnap = await suggestionRef.get();
    if (!suggestionSnap.exists) {
      return NextResponse.json({ error: 'Suggestion not found.' }, { status: 404 });
    }

    const suggestion = suggestionSnap.data()!;
    const posterUserId =
      typeof suggestion.userId === 'string' && suggestion.userId !== 'anonymous'
        ? suggestion.userId
        : null;
    const suggestionText = (body.previewText as string) || suggestion.text || '';
    const status = (body.status as string) || suggestion.status || 'pending';

    if (action === 'submitted') {
      if (!actorUid || actorUid !== suggestion.userId) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }
    }

    const adminUserId = await getFeedbackAdminUserId(adminDb);
    let sent = 0;
    let skipped = 0;

    const record = async (userId: string | null, title: string, message: string) => {
      if (!userId || userId === actorUid) return;
      const result = await sendUserNotification(adminDb, adminMessaging, {
        userId,
        title,
        message,
        relatedUrl: '/feedback',
        type: 'reminder',
      });
      if (result === 'sent') sent++;
      else skipped++;
    };

    if (action === 'submitted') {
      await record(
        adminUserId,
        'New feedback submitted',
        `${suggestion.userName || 'Someone'} submitted: "${preview(suggestionText)}"`,
      );
    }

    if (action === 'status_updated') {
      const statusLabel = getStatusLabel(status);
      await record(
        posterUserId,
        'Your feedback was updated',
        `Status changed to "${statusLabel}" for: "${preview(suggestionText)}"`,
      );
      await record(
        adminUserId,
        'Feedback status updated',
        `"${preview(suggestionText)}" is now ${statusLabel}.`,
      );
    }

    if (action === 'admin_note_updated') {
      const note = (suggestion.adminNote as string) || '';
      await record(
        posterUserId,
        'Response to your feedback',
        note
          ? `Admin replied: "${preview(note)}"`
          : `There is an update on your feedback: "${preview(suggestionText)}"`,
      );
      await record(
        adminUserId,
        'Feedback admin note updated',
        `Admin note saved on: "${preview(suggestionText)}"`,
      );
    }

    return NextResponse.json({ success: true, sent, skipped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[feedback/notify]', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
