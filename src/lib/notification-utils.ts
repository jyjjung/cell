/**
 * Shared utility for robustly converting any timestamp-like value to milliseconds.
 * This ensures consistency between client-side and server-side badge calculations.
 */
function getMillis(timestamp: any): number {
    if (!timestamp) return 0;
    
    // Firestore Timestamp (Client or Admin SDK)
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    
    // JS Date
    if (timestamp instanceof Date) return timestamp.getTime();
    
    // Raw Number (ms)
    if (typeof timestamp === 'number') return timestamp;
    
    // ISO String
    if (typeof timestamp === 'string') {
        const ms = Date.parse(timestamp);
        return isNaN(ms) ? 0 : ms;
    }
    
    // Internal Firestore structure (_seconds, _nanoseconds) used by Admin SDK occasionally
    if (timestamp._seconds !== undefined) {
        return timestamp._seconds * 1000 + ((timestamp._nanoseconds || 0) / 1000000);
    }
    
    return 0;
}

/**
 * Shared logic to determine if a chat is unread for a specific user.
 */
export function isChatUnread(chat: any, userId: string): boolean {
    if (!chat.lastMessageSentAt || !chat.lastMessageSenderId) return false;
    if (chat.lastMessageSenderId === userId) return false;
    
    const lastSeen = chat.memberSeen?.[userId];
    const lastSentMs = getMillis(chat.lastMessageSentAt);
    const lastSeenMs = getMillis(lastSeen);
    
    return lastSentMs > lastSeenMs;
}

/**
 * Unseen message count for badges. Prefers denormalized `memberUnreadCount`;
 * legacy chats without a counter fall back to 1 when the chat is unread.
 */
export function getChatUnreadMessageCount(chat: any, userId: string): number {
    const stored = chat?.memberUnreadCount?.[userId];
    if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0) {
        return Math.floor(stored);
    }
    return isChatUnread(chat, userId) ? 1 : 0;
}

/**
 * Chat-doc field updates that bump unread for every member except the sender
 * (sender cleared to 0). Pass the SDK-specific increment helper.
 */
export function buildUnreadCountIncrements(
    memberIds: string[],
    senderId: string,
    incrementFn: (n: number) => unknown,
): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    for (const uid of memberIds) {
        if (!uid) continue;
        updates[`memberUnreadCount.${uid}`] =
            uid === senderId ? 0 : incrementFn(1);
    }
    return updates;
}

/** Zero the caller's unread counter (pair with memberSeen updates). */
export function buildUnreadCountClear(userId: string): Record<string, number> {
    return { [`memberUnreadCount.${userId}`]: 0 };
}

/** Sum unseen messages across chats (optional per-chat skip, e.g. open thread). */
export function sumChatUnreadMessageCounts(
    chats: any[],
    userId: string,
    shouldSkip?: (chat: any) => boolean,
): number {
    let total = 0;
    for (const chat of chats) {
        if (shouldSkip?.(chat)) continue;
        total += getChatUnreadMessageCount(chat, userId);
    }
    return total;
}
