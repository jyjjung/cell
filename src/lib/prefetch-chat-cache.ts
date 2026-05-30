import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { primeMediaUrls } from '@/lib/media-cache';
import type { ChatMessage } from '@/types';

/** How many recent messages to pull into the local Firestore cache per chat (offline / PWA read). */
const PREFETCH_LIMIT = 200;

/**
 * Warms IndexedDB so installed PWA / offline mode can show recent messages without opening each thread first.
 * Fire-and-forget; ignores errors (permissions, network).
 */
export function prefetchChatMessagesCache(db: Firestore, chatIds: string[]): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (!chatIds.length) return;

  const run = async () => {
    for (const chatId of chatIds) {
      try {
        const q = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(PREFETCH_LIMIT)
        );
        const snapshot = await getDocs(q);
        primeMediaUrls(
          snapshot.docs.map((doc) => (doc.data() as ChatMessage).imageUrl),
        );
      } catch {
        /* best-effort */
      }
    }
  };

  void run();
}
