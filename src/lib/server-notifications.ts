import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { AppNotification, AppNotificationType } from '@/types';
import { deliverPushWithLock } from '@/lib/push-delivery-lock';

export async function resolveUserIdByEmail(
  adminDb: Firestore,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const snap = await adminDb
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;

  const snapOriginal = await adminDb
    .collection('users')
    .where('email', '==', email.trim())
    .limit(1)
    .get();
  if (!snapOriginal.empty) return snapOriginal.docs[0].id;

  return null;
}

export async function getAdminUserIds(adminDb: Firestore): Promise<string[]> {
  const capabilitySnap = await adminDb
    .collection('users')
    .where('capabilityKeys', 'array-contains', 'app.admin')
    .get();
  return capabilitySnap.docs.map((doc) => doc.id);
}

export async function sendUserNotification(
  adminDb: Firestore,
  adminMessaging: Messaging,
  params: {
    userId: string;
    title: string;
    message: string;
    relatedUrl?: string;
    type?: AppNotificationType;
    dedupeId?: string;
    dedupeCollection?: string;
  },
): Promise<'sent' | 'skipped'> {
  const {
    userId,
    title,
    message,
    relatedUrl = '/',
    type = 'reminder',
    dedupeId,
    dedupeCollection = 'notificationLog',
  } = params;

  const notifRef = adminDb.collection('notifications').doc();
  const notification: AppNotification = {
    id: notifRef.id,
    title,
    message,
    type,
    isGlobal: false,
    userId,
    createdAt: FieldValue.serverTimestamp() as AppNotification['createdAt'],
    readBy: [],
    relatedUrl,
  };

  // Claim dedupe only after the notification write succeeds, so a crash between
  // claim and write cannot permanently skip a birthday/duty reminder for the day.
  if (dedupeId) {
    const logRef = adminDb.collection(dedupeCollection).doc(dedupeId);
    try {
      await adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(logRef);
        if (existing.exists) {
          throw new Error('DUPLICATE');
        }
        tx.set(notifRef, notification);
        tx.set(logRef, {
          userId,
          title,
          notificationId: notifRef.id,
          sentAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE') {
        return 'skipped';
      }
      // Race on create — treat as skipped when log already exists.
      const existing = await logRef.get().catch(() => null);
      if (existing?.exists) return 'skipped';
      throw error;
    }
  } else {
    await notifRef.set(notification);
  }

  const result = await deliverPushWithLock(notifRef.id, adminDb, adminMessaging);

  if (dedupeId) {
    await adminDb.collection(dedupeCollection).doc(dedupeId).update({
      notificationId: notifRef.id,
      pushDeliveredCount: result.delivered,
    }).catch(() => {});
  }

  return 'sent';
}
