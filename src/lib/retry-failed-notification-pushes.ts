import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { deliverPushWithLock } from '@/lib/push-delivery-lock';

const MAX_RETRY_ATTEMPTS = 5;
const MAX_BATCH = 40;

/**
 * Re-attempt notification pushes that previously delivered to zero devices
 * (or failed mid-send). Caps attempts so permanently tokenless users stop looping.
 */
export async function retryFailedNotificationPushes(
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<{ candidates: number; sent: number; skipped: number }> {
  const snap = await adminDb
    .collection('notifications')
    .where('pushNeedsRetry', '==', true)
    .limit(MAX_BATCH)
    .get();

  let candidates = 0;
  let sent = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const attempts = typeof data.pushRetryCount === 'number' ? data.pushRetryCount : 0;
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      skipped++;
      continue;
    }

    candidates++;
    await doc.ref
      .update({
        pushRetryCount: attempts + 1,
      })
      .catch(() => {});

    try {
      const result = await deliverPushWithLock(doc.id, adminDb, adminMessaging);
      if (result.delivered > 0) {
        sent++;
        await doc.ref
          .update({
            pushNeedsRetry: FieldValue.delete(),
          })
          .catch(() => {});
      } else if (result.alreadySent || result.deferred) {
        skipped++;
        if (result.alreadySent) {
          await doc.ref
            .update({
              pushNeedsRetry: FieldValue.delete(),
            })
            .catch(() => {});
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error('[retryFailedNotificationPushes]', doc.id, error);
      skipped++;
    }
  }

  return { candidates, sent, skipped };
}
