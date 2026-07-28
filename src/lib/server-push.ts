import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { AppNotification, UserProfileData } from '@/types';
import { toSafeStringMap } from '@/lib/server-badge-utils';
import { badgeCountWithTimeout } from '@/lib/server-chat-push';
import { chatPushBadgeFields } from '@/lib/chat-push-badge';

/** Keep in sync with client MAX_FCM_TOKENS — validate/send all stored tokens, not a silent first-3 subset. */
const MAX_FCM_TOKENS = 5;

export type DataPushPayload = {
  title: string;
  body: string;
  tag: string;
  link: string;
};

async function deliverDataPush(
  userId: string,
  tokens: string[],
  payload: DataPushPayload,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<number> {
  const uniqueTokens = [...new Set(tokens)].filter(Boolean).slice(0, MAX_FCM_TOKENS);
  if (uniqueTokens.length === 0) return 0;

  // Never block birthday/duty fan-out on a slow unread calc — omit badge instead of delaying/failing.
  const badgeCount = await badgeCountWithTimeout(userId, adminDb);
  const { dataBadge, apnsBadge } = chatPushBadgeFields(badgeCount);
  const title = payload.title || 'New Notification';
  const body = payload.body || '';
  const link = payload.link || '/';

  const dataPayload: Record<string, unknown> = {
    title,
    body,
    icon: '/icon-192x192-v4.png',
    tag: payload.tag,
    link,
  };
  if (dataBadge != null) {
    dataPayload.badge = dataBadge;
  }

  const aps: Record<string, unknown> = {
    alert: {
      title,
      body,
    },
    sound: 'default',
    'mutable-content': 1,
    'content-available': 1,
  };
  if (apnsBadge != null) {
    aps.badge = apnsBadge;
  }

  const message = {
    tokens: uniqueTokens,
    data: toSafeStringMap(dataPayload),
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps,
      },
    },
    webpush: {
      fcm_options: { link },
    },
  };

  const response = await adminMessaging.sendEachForMulticast(message as Parameters<Messaging['sendEachForMulticast']>[0]);

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

async function deliverToUser(
  userId: string,
  tokens: string[],
  notification: AppNotification,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<number> {
  return deliverDataPush(
    userId,
    tokens,
    {
      title: notification.title || 'New Notification',
      body: notification.message || '',
      tag: notification.id,
      link: notification.relatedUrl || '/',
    },
    adminDb,
    adminMessaging,
  );
}

/** Load a user's FCM tokens and deliver a data push (no notifications collection write). */
export async function deliverDataPushToUser(
  userId: string,
  payload: DataPushPayload,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<number> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) return 0;

  const user = userDoc.data() as UserProfileData;
  if (!user.fcmTokens?.length) return 0;

  return deliverDataPush(userId, user.fcmTokens, payload, adminDb, adminMessaging);
}

export async function deliverNotificationPush(
  notification: AppNotification,
  adminDb: Firestore,
  adminMessaging: Messaging,
): Promise<number> {
  if (notification.isGlobal) {
    const usersSnapshot = await adminDb.collection('users').get();
    let delivered = 0;
    const CONCURRENCY = 8;
    const docs = usersSnapshot.docs;
    for (let i = 0; i < docs.length; i += CONCURRENCY) {
      const batch = docs.slice(i, i + CONCURRENCY);
      const counts = await Promise.all(
        batch.map(async (userDoc) => {
          const user = { uid: userDoc.id, ...userDoc.data() } as UserProfileData;
          if (user.isApproved === false) return 0;
          if (!user.fcmTokens?.length) return 0;
          return deliverToUser(userDoc.id, user.fcmTokens, notification, adminDb, adminMessaging);
        }),
      );
      delivered += counts.reduce((sum, n) => sum + n, 0);
    }
    return delivered;
  }

  if (!notification.userId) return 0;
  const userDoc = await adminDb.collection('users').doc(notification.userId).get();
  if (!userDoc.exists) return 0;
  const user = userDoc.data() as UserProfileData;
  if (!user.fcmTokens?.length) return 0;
  return deliverToUser(notification.userId, user.fcmTokens, notification, adminDb, adminMessaging);
}
