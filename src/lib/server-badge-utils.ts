import type { Firestore } from 'firebase-admin/firestore';
import type { Chat } from '@/types';
import { sumChatUnreadMessageCounts } from '@/lib/notification-utils';
import {
  NOTIFICATION_QUERY_LIMITS,
  NOTIFICATION_UNREAD_LOOKBACK_DAYS,
  countUnreadNotificationsForUser,
  type NotificationUnreadFields,
} from '@/lib/notification-visibility';

function lookbackDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - NOTIFICATION_UNREAD_LOOKBACK_DAYS);
  return d;
}

function mapDocs(docs: FirebaseFirestore.QueryDocumentSnapshot[]): NotificationUnreadFields[] {
  return docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId ?? null,
      isGlobal: data.isGlobal === true,
      type: data.type,
      readBy: Array.isArray(data.readBy) ? data.readBy : [],
      createdAt: data.createdAt,
    };
  });
}

/**
 * Calculates the total unread count for a given user across all chats and notifications.
 * Used by push notification API routes to set accurate badge counts.
 * Query shapes mirror the client NotificationsProvider listeners.
 */
export async function calculateTotalUnread(userId: string, db: Firestore): Promise<number> {
  try {
    const since = lookbackDate();

    // Explicit orderBy matches existing composite indexes. A bare >= range
    // defaults to ASC and fails when only DESC indexes exist (userId/type).
    const [personalSnap, globalSnap, announcementSnap, chatsSnapshot] = await Promise.all([
      db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('createdAt', '>=', since)
        .orderBy('createdAt', 'desc')
        .limit(NOTIFICATION_QUERY_LIMITS.personal)
        .get(),
      db
        .collection('notifications')
        .where('isGlobal', '==', true)
        .where('createdAt', '>=', since)
        .orderBy('createdAt', 'desc')
        .limit(NOTIFICATION_QUERY_LIMITS.globals)
        .get(),
      db
        .collection('notifications')
        .where('type', '==', 'announcement')
        .where('createdAt', '>=', since)
        .orderBy('createdAt', 'desc')
        .limit(NOTIFICATION_QUERY_LIMITS.announcements)
        .get(),
      db.collection('chats').where('members', 'array-contains', userId).get(),
    ]);

    const unreadNotifications = countUnreadNotificationsForUser(
      [
        ...mapDocs(personalSnap.docs),
        ...mapDocs(globalSnap.docs),
        ...mapDocs(announcementSnap.docs),
      ],
      userId,
    );

    const chats = chatsSnapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Chat,
    );
    const unreadMessages = sumChatUnreadMessageCounts(chats, userId);

    return unreadNotifications + unreadMessages;
  } catch (error) {
    console.error(`[calculateTotalUnread] Error for ${userId}:`, error);
    return 0;
  }
}

/**
 * Forcefully converts all values in a record to strings to create a safe FCM data payload.
 */
export function toSafeStringMap(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = String(value ?? '');
  }
  return out;
}
