import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { deliverPushWithLock } from '@/lib/push-delivery-lock';

const MAX_RETRY_ATTEMPTS = 5;
const MAX_BATCH = 40;

/**
 * Retries run in parallel chunks so a full batch does not stretch the cron run
 * towards the function timeout. Each notification is claimed independently by
 * `deliverPushWithLock`, so concurrent docs cannot double-send.
 */
const RETRY_CONCURRENCY = 8;

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

  const retryable: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const doc of snap.docs) {
    const attempts = doc.data().pushRetryCount;
    if (typeof attempts === 'number' && attempts >= MAX_RETRY_ATTEMPTS) {
      skipped++;
      continue;
    }
    retryable.push(doc);
  }

  for (let i = 0; i < retryable.length; i += RETRY_CONCURRENCY) {
    const chunk = retryable.slice(i, i + RETRY_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((doc) => retryOne(doc, adminDb, adminMessaging)),
    );
    for (const result of results) {
      candidates++;
      if (result === 'sent') sent++;
      else skipped++;
    }
  }

  return { candidates, sent, skipped };
}

async function retryOne(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<'sent' | 'skipped'> {
  const previousAttempts = doc.data().pushRetryCount;
  const attempts = typeof previousAttempts === 'number' ? previousAttempts : 0;
  await doc.ref.update({ pushRetryCount: attempts + 1 }).catch(() => {});

  try {
    const result = await deliverPushWithLock(doc.id, adminDb, adminMessaging);
    if (result.delivered > 0) {
      await doc.ref.update({ pushNeedsRetry: FieldValue.delete() }).catch(() => {});
      return 'sent';
    }
    if (result.alreadySent) {
      await doc.ref.update({ pushNeedsRetry: FieldValue.delete() }).catch(() => {});
    }
    return 'skipped';
  } catch (error) {
    console.error('[retryFailedNotificationPushes]', doc.id, error);
    return 'skipped';
  }
}
