
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
