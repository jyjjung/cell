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
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage } from '@/types';
import { mergeMessageLists, mergeMessageListsStable } from '@/lib/chat-message-merge';

/** Real-time listener window — keep small to limit ongoing read costs. */
export const CHAT_MESSAGES_LIVE_LIMIT = 30;

/** Page size when the user scrolls up to load older messages. */
export const CHAT_MESSAGES_PAGE_SIZE = 30;

/** Internal page size when reading the Firestore persistent cache. */
export const CHAT_MESSAGES_CACHE_PAGE = 100;

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';
const THREAD_SUBCOLLECTION = 'thread';

export function chatMessagesCacheKey(chatId: string) {
  return chatId;
}

export function threadMessagesCacheKey(chatId: string, parentMessageId: string) {
  return `${chatId}_thread_${parentMessageId}`;
}

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

function docToMessage(docSnap: QueryDocumentSnapshot): ChatMessage {
  return { id: docSnap.id, ...docSnap.data() } as ChatMessage;
}

/** Read every message already stored in Firestore's on-device persistent cache. */
export async function readAllMessagesFromDeviceCache(
  messagesCol: CollectionReference,
): Promise<ChatMessage[]> {
  const all: ChatMessage[] = [];
  let lastDoc: QueryDocumentSnapshot | null = null;

  while (true) {
    const q = lastDoc
      ? query(
          messagesCol,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(CHAT_MESSAGES_CACHE_PAGE),
        )
      : query(messagesCol, orderBy('createdAt', 'desc'), limit(CHAT_MESSAGES_CACHE_PAGE));

    let snap;
    try {
      snap = await getDocsFromCache(q);
    } catch {
      break;
    }

    if (snap.empty) break;

    all.push(...snap.docs.map(docToMessage));
    if (snap.docs.length < CHAT_MESSAGES_CACHE_PAGE) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return all;
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

export { mergeMessageLists, mergeMessageListsStable };
