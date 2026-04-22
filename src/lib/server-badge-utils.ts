
import type { Firestore } from 'firebase-admin/firestore';
import type { Chat } from '@/types';
import { isChatUnread } from '@/lib/notification-utils';

/**
 * Calculates the total unread count for a given user across all chats and notifications.
 * Used by push notification API routes to set accurate badge counts.
 */
export async function calculateTotalUnread(userId: string, db: Firestore): Promise<number> {
    try {
        // 1. Unread System Notifications (Checking readBy array, limited to last 30 days for performance)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const notificationsSnapshot = await db.collection('notifications')
            .where('createdAt', '>=', thirtyDaysAgo)
            .get();
            
        let unreadNotifications = 0;
        notificationsSnapshot.forEach((doc: any) => {
            const data = doc.data();
            const readBy = Array.isArray(data.readBy) ? data.readBy : [];
            const isTargetUser = data.isGlobal || data.userId === userId || data.type === 'announcement';
            if (isTargetUser && !readBy.includes(userId)) {
                unreadNotifications++;
            }
        });

        // 2. Unread Chats (using memberSeen)
        const chatsSnapshot = await db.collection('chats').where('members', 'array-contains', userId).get();
        let unreadChats = 0;
        chatsSnapshot.forEach((doc: any) => {
            const chat = { id: doc.id, ...doc.data() } as Chat;
            if (isChatUnread(chat, userId)) {
                unreadChats++;
            }
        });

        return unreadNotifications + unreadChats;
    } catch (error) {
        console.error(`[calculateTotalUnread] Error for ${userId}:`, error);
        return 0; // Default to 0 on error
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
