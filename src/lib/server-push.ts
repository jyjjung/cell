import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { AppNotification, UserProfileData } from '@/types';
import { calculateTotalUnread, toSafeStringMap } from '@/lib/server-badge-utils';

async function deliverToUser(
  userId: string,
  tokens: string[],
  notification: AppNotification,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<number> {
  const uniqueTokens = [...new Set(tokens)].filter(Boolean).slice(0, 3);
  if (uniqueTokens.length === 0) return 0;

  const badgeCount = await calculateTotalUnread(userId, adminDb);

  const message = {
    tokens: uniqueTokens,
    data: toSafeStringMap({
      title: notification.title || 'New Notification',
      body: notification.message || '',
      icon: '/icon-192x192-v4.png',
      tag: notification.id,
      link: notification.relatedUrl || '/',
      badge: String(badgeCount),
    }),
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          alert: {
            title: notification.title || 'New Notification',
            body: notification.message || '',
          },
          badge: badgeCount,
          sound: 'default',
          'mutable-content': 1,
          'content-available': 1,
        },
      },
    },
    webpush: {
      fcm_options: { link: notification.relatedUrl || '/' },
    },
  };

  const response = await adminMessaging.sendEachForMulticast(message as any);

  if (response.failureCount > 0) {
    const staleTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          staleTokens.push(uniqueTokens[idx]);
        }
      }
    });
    if (staleTokens.length > 0) {
      await adminDb.collection('users').doc(userId).update({
        fcmTokens: FieldValue.arrayRemove(...staleTokens),
      });
    }
  }

  return response.successCount;
}

export async function deliverNotificationPush(
  notification: AppNotification,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<number> {
  if (notification.isGlobal) {
    const usersSnapshot = await adminDb.collection('users').get();
    let total = 0;
    for (const doc of usersSnapshot.docs) {
      const user = doc.data() as UserProfileData;
      if (user.fcmTokens?.length) {
        total += await deliverToUser(doc.id, user.fcmTokens, notification, adminDb, adminMessaging);
      }
    }
    return total;
  }

  if (!notification.userId) return 0;

  const userDoc = await adminDb.collection('users').doc(notification.userId).get();
  if (!userDoc.exists) return 0;

  const user = userDoc.data() as UserProfileData;
  if (!user.fcmTokens?.length) return 0;

  return deliverToUser(notification.userId, user.fcmTokens, notification, adminDb, adminMessaging);
}
