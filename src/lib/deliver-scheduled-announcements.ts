import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { getCommunityTodayIso } from '@/lib/duty-reminders';
import { deliverPushWithLock } from '@/lib/push-delivery-lock';
import { getScheduledDateIso } from '@/lib/scheduled-notifications';

const DEFAULT_TIMEZONE = 'Australia/Brisbane';

export async function deliverDueScheduledAnnouncements(
  adminDb: Firestore,
  adminMessaging: Messaging,
  timeZone = process.env.DUTY_REMINDER_TIMEZONE || DEFAULT_TIMEZONE,
): Promise<{ candidates: number; sent: number; skipped: number }> {
  const todayIso = getCommunityTodayIso(timeZone);
  const snap = await adminDb
    .collection('notifications')
    .where('type', '==', 'announcement')
    .get();

  let candidates = 0;
  let sent = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.scheduledFor || data.pushSentAt) continue;

    const scheduledDateIso = getScheduledDateIso(data.scheduledFor, timeZone);
    if (!scheduledDateIso || scheduledDateIso > todayIso) continue;

    candidates++;

    try {
      const result = await deliverPushWithLock(doc.id, adminDb, adminMessaging);
      if (result.delivered > 0) sent++;
      else skipped++;
    } catch (error) {
      console.error('[deliverDueScheduledAnnouncements]', doc.id, error);
      skipped++;
    }
  }

  return { candidates, sent, skipped };
}
