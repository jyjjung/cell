import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { AppNotification, AppNotificationType } from '@/types';
import { deliverNotificationPush } from '@/lib/server-push';
import { ADMIN_ROLE_NAMES } from '@/lib/admin-access';

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
  const ids = new Set<string>();

  const adminSnap = await adminDb.collection('users').where('isAdmin', '==', true).get();
  adminSnap.docs.forEach((doc) => ids.add(doc.id));

  const rolesSnap = await adminDb.collection('roles').get();
  const adminRoleIds = rolesSnap.docs
    .filter((doc) => ADMIN_ROLE_NAMES.includes(doc.data()?.name as typeof ADMIN_ROLE_NAMES[number]))
    .map((doc) => doc.id);

  if (adminRoleIds.length > 0) {
    const roleSnap = await adminDb
      .collection('users')
      .where('roleIds', 'array-contains-any', adminRoleIds)
      .get();
    roleSnap.docs.forEach((doc) => ids.add(doc.id));
  }

  return [...ids];
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
  await deliverNotificationPush(notification, adminDb, adminMessaging);

  if (dedupeId) {
    await adminDb.collection(dedupeCollection).doc(dedupeId).update({
      notificationId: notifRef.id,
    }).catch(() => {});
  }

  return 'sent';
}
