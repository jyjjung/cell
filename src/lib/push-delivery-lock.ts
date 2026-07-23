import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { AppNotification } from '@/types';
import { deliverNotificationPush } from '@/lib/server-push';
import { shouldDeferScheduledAnnouncement } from '@/lib/scheduled-notifications';

export type PushDeliveryResult = {
  delivered: number;
  alreadySent?: boolean;
  deferred?: boolean;
};

/**
 * Claim push delivery before sending so concurrent callers cannot double-deliver.
 * On total failure the claim is released (and pushNeedsRetry set) so cron/retries can try again.
 */
export async function deliverPushWithLock(
  notificationId: string,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<PushDeliveryResult> {
  const notifDocRef = adminDb.collection('notifications').doc(notificationId);

  const preCheck = await notifDocRef.get();
  if (!preCheck.exists) {
    throw new Error('NOTIFICATION_NOT_FOUND');
  }

  const preData = preCheck.data()!;
  if (preData.pushSentAt) {
    return { delivered: 0, alreadySent: true };
  }

  if (shouldDeferScheduledAnnouncement(preData.scheduledFor)) {
    return { delivered: 0, deferred: true };
  }

  const claimed = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(notifDocRef);
    if (!snap.exists) return false;
    const data = snap.data()!;
    if (data.pushSentAt) return false;
    if (shouldDeferScheduledAnnouncement(data.scheduledFor)) return false;
    tx.update(notifDocRef, {
      pushSentAt: FieldValue.serverTimestamp(),
      pushClaimedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!claimed) {
    const after = await notifDocRef.get();
    if (after.exists && shouldDeferScheduledAnnouncement(after.data()?.scheduledFor)) {
      return { delivered: 0, deferred: true };
    }
    return { delivered: 0, alreadySent: true };
  }

  const latest = await notifDocRef.get();
  if (!latest.exists) {
    throw new Error('NOTIFICATION_NOT_FOUND');
  }

  const notification = { id: latest.id, ...latest.data() } as AppNotification;

  try {
    const delivered = await deliverNotificationPush(notification, adminDb, adminMessaging);

    if (delivered > 0) {
      await notifDocRef
        .update({
          pushDeliveredCount: delivered,
          pushNeedsRetry: FieldValue.delete(),
        })
        .catch(() => {});
      return { delivered };
    }

    // No devices received the push — release claim so a later retry can succeed.
    await notifDocRef
      .update({
        pushSentAt: FieldValue.delete(),
        pushClaimedAt: FieldValue.delete(),
        pushDeliveredCount: 0,
        pushNeedsRetry: true,
      })
      .catch(() => {});

    return { delivered: 0 };
  } catch (error) {
    await notifDocRef
      .update({
        pushSentAt: FieldValue.delete(),
        pushClaimedAt: FieldValue.delete(),
        pushNeedsRetry: true,
      })
      .catch(() => {});
    throw error;
  }
}
