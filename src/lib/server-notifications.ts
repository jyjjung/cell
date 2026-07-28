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

  if (dedupeId) {
    const logRef = adminDb.collection(dedupeCollection).doc(dedupeId);
    try {
      await logRef.create({
        userId,
        title,
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch {
      return 'skipped';
    }
  }

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

  await notifRef.set(notification);
  try {
    const result = await deliverPushWithLock(notifRef.id, adminDb, adminMessaging);

    if (dedupeId) {
      await adminDb.collection(dedupeCollection).doc(dedupeId).update({
        notificationId: notifRef.id,
        pushDeliveredCount: result.delivered,
      }).catch(() => {});
    }
  } catch (error) {
    // In-app notification is already saved — never abort remaining recipients
    // because one device's FCM delivery failed.
    console.error('[sendUserNotification] push delivery failed:', error);
    if (dedupeId) {
      await adminDb.collection(dedupeCollection).doc(dedupeId).update({
        notificationId: notifRef.id,
        pushDeliveredCount: 0,
        pushError: error instanceof Error ? error.message : 'push_failed',
      }).catch(() => {});
    }
  }

  return 'sent';
}
