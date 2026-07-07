import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { AppNotification } from '@/types';
import { getCommunityTodayIso } from '@/lib/duty-reminders';
import { deliverNotificationPush } from '@/lib/server-push';
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
    const notification = { id: doc.id, ...data } as AppNotification;

    try {
      await deliverNotificationPush(notification, adminDb, adminMessaging);
      await doc.ref.update({ pushSentAt: FieldValue.serverTimestamp() });
      sent++;
    } catch (error) {
      console.error('[deliverDueScheduledAnnouncements]', doc.id, error);
      skipped++;
    }
  }

  return { candidates, sent, skipped };
}
