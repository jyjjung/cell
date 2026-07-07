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

  const notification = { id: preCheck.id, ...preData } as AppNotification;
  const delivered = await deliverNotificationPush(notification, adminDb, adminMessaging);

  if (delivered > 0) {
    const committed = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(notifDocRef);
      if (!snap.exists) return false;
      if (snap.data()?.pushSentAt) return false;
      tx.update(notifDocRef, { pushSentAt: FieldValue.serverTimestamp() });
      return true;
    });

    if (!committed) {
      return { delivered: 0, alreadySent: true };
    }
  }

  return { delivered };
}
