
import type { Firestore } from 'firebase-admin/firestore';
import type { Chat } from '@/types';
import { isChatUnread } from '@/lib/notification-utils';

/**
 * Calculates the total unread count for a given user across all chats and notifications.
 * Used by push notification API routes to set accurate badge counts.
 */
export async function calculateTotalUnread(userId: string, db: Firestore): Promise<number> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [personalSnap, globalSnap, announcementSnap, chatsSnapshot] = await Promise.all([
            db.collection('notifications')
                .where('userId', '==', userId)
                .where('createdAt', '>=', thirtyDaysAgo)
                .get(),
            db.collection('notifications')
                .where('isGlobal', '==', true)
                .where('createdAt', '>=', thirtyDaysAgo)
                .get(),
            db.collection('notifications')
                .where('type', '==', 'announcement')
                .where('createdAt', '>=', thirtyDaysAgo)
                .get(),
            db.collection('chats').where('members', 'array-contains', userId).get(),
        ]);

        const seenIds = new Set<string>();
        let unreadNotifications = 0;

        const countUnread = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
            docs.forEach((docSnap) => {
                if (seenIds.has(docSnap.id)) return;
                seenIds.add(docSnap.id);
                const data = docSnap.data();
                const readBy = Array.isArray(data.readBy) ? data.readBy : [];
                if (!readBy.includes(userId)) {
                    unreadNotifications++;
                }
            });
        };

        countUnread(personalSnap.docs);
        countUnread(globalSnap.docs);
        countUnread(announcementSnap.docs);

        let unreadChats = 0;
        chatsSnapshot.forEach((docSnap) => {
            const chat = { id: docSnap.id, ...docSnap.data() } as Chat;
            if (isChatUnread(chat, userId)) {
                unreadChats++;
            }
        });

        return unreadNotifications + unreadChats;
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
