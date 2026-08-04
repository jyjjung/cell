import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDocsFromCache,
  doc,
  getDoc,
  type CollectionReference,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage } from '@/types';
import { mergeMessageListsStable } from '@/lib/chat-message-merge';

/** Real-time listener window — keep small to limit ongoing read costs. */
export const CHAT_MESSAGES_LIVE_LIMIT = 30;

/** Page size when the user scrolls up to load older messages. */
const CHAT_MESSAGES_PAGE_SIZE = 30;

/** Internal page size when reading the Firestore persistent cache. */
const CHAT_MESSAGES_CACHE_PAGE = 100;

/**
 * Hard cap for device-cache walks (global photos/links albums, thread seed).
 * Prevents unbounded local iteration on huge chats.
 */
export const CHAT_MESSAGES_CACHE_READ_MAX = 600;

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';
const THREAD_SUBCOLLECTION = 'thread';

export function chatMessagesCollection(chatId: string): CollectionReference {
  return collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
}

export function threadMessagesCollection(
  chatId: string,
  parentMessageId: string,
): CollectionReference {
  return collection(
    db,
    CHATS_COLLECTION,
    chatId,
    MESSAGES_SUBCOLLECTION,
    parentMessageId,
    THREAD_SUBCOLLECTION,
  );
}

function docToMessage(docSnap: QueryDocumentSnapshot<DocumentData>): ChatMessage {
  return { id: docSnap.id, ...docSnap.data() } as ChatMessage;
}

/** Read messages already stored in Firestore's on-device persistent cache. */
export async function readAllMessagesFromDeviceCache(
  messagesCol: CollectionReference,
  options?: { maxMessages?: number },
): Promise<ChatMessage[]> {
  const maxMessages = options?.maxMessages ?? CHAT_MESSAGES_CACHE_READ_MAX;
  const all: ChatMessage[] = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  while (all.length < maxMessages) {
    const pageSize = Math.min(CHAT_MESSAGES_CACHE_PAGE, maxMessages - all.length);
    const q: Query<DocumentData> = lastDoc
      ? query(
          messagesCol,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize),
        )
      : query(messagesCol, orderBy('createdAt', 'desc'), limit(pageSize));

    let snap;
    try {
      snap = await getDocsFromCache(q);
    } catch {
      break;
    }

    if (snap.empty) break;

    all.push(...snap.docs.map(docToMessage));
    if (snap.docs.length < pageSize) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return all;
}

/** Load the latest live window (cache first, then server). */
export async function fetchLatestMessagesWindow(
  messagesCol: CollectionReference,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(CHAT_MESSAGES_LIVE_LIMIT));

  let snap;
  try {
    snap = await getDocs(q);
  } catch {
    try {
      snap = await getDocsFromCache(q);
    } catch {
      return { messages: [], hasMore: false };
    }
  }

  const messages = snap.docs.map(docToMessage);
  return {
    messages,
    hasMore: snap.docs.length >= CHAT_MESSAGES_LIVE_LIMIT,
  };
}

/** Load the next page of older messages (cache first, then server). */
export async function fetchOlderMessagesPage(
  messagesCol: CollectionReference,
  oldestMessageId: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const cursorSnap = await getDoc(doc(messagesCol, oldestMessageId));
  if (!cursorSnap.exists()) {
    return { messages: [], hasMore: false };
  }

  const q = query(
    messagesCol,
    orderBy('createdAt', 'desc'),
    startAfter(cursorSnap),
    limit(CHAT_MESSAGES_PAGE_SIZE),
  );

  let snap;
  try {
    const cached = await getDocsFromCache(q);
    if (cached.docs.length === CHAT_MESSAGES_PAGE_SIZE) {
      snap = cached;
    } else {
      snap = await getDocs(q);
    }
  } catch {
    snap = await getDocs(q);
  }

  const messages = snap.docs.map(docToMessage);
  return {
    messages,
    hasMore: snap.docs.length === CHAT_MESSAGES_PAGE_SIZE,
  };
}

export { mergeMessageListsStable };
