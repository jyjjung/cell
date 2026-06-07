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

/** Real-time listener window — small to limit ongoing read costs. */
export const CHAT_MESSAGES_LIVE_LIMIT = 75;

/** Page size when backfilling history into the Firestore persistent cache. */
export const CHAT_MESSAGES_SYNC_PAGE = 100;

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';
const THREAD_SUBCOLLECTION = 'thread';

function syncCursorKey(cacheKey: string) {
  return `chat_msgs_sync_cursor_${cacheKey}`;
}

function syncCompleteKey(cacheKey: string) {
  return `chat_msgs_sync_complete_${cacheKey}`;
}

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
          limit(CHAT_MESSAGES_SYNC_PAGE),
        )
      : query(messagesCol, orderBy('createdAt', 'desc'), limit(CHAT_MESSAGES_SYNC_PAGE));

    let snap;
    try {
      snap = await getDocsFromCache(q);
    } catch {
      break;
    }

    if (snap.empty) break;

    all.push(...snap.docs.map(docToMessage));
    if (snap.docs.length < CHAT_MESSAGES_SYNC_PAGE) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return all;
}

/** Paginate from server into Firestore persistent cache until history is complete. */
export async function syncAllMessagesToDeviceCache(
  messagesCol: CollectionReference,
  cacheKey: string,
  onBatch: (messages: ChatMessage[]) => void,
  signal?: { aborted: boolean },
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (localStorage.getItem(syncCompleteKey(cacheKey)) === '1') return;

  let lastDoc: QueryDocumentSnapshot | null = null;
  const savedCursorId = localStorage.getItem(syncCursorKey(cacheKey));

  if (savedCursorId) {
    try {
      const cursorSnap = await getDoc(doc(messagesCol, savedCursorId));
      if (cursorSnap.exists()) {
        lastDoc = cursorSnap as QueryDocumentSnapshot;
      } else {
        localStorage.removeItem(syncCursorKey(cacheKey));
      }
    } catch {
      localStorage.removeItem(syncCursorKey(cacheKey));
    }
  } else {
    try {
      const cachedFirst = await getDocsFromCache(
        query(messagesCol, orderBy('createdAt', 'desc'), limit(CHAT_MESSAGES_SYNC_PAGE)),
      );
      if (!cachedFirst.empty) {
        if (cachedFirst.docs.length < CHAT_MESSAGES_SYNC_PAGE) {
          localStorage.setItem(syncCompleteKey(cacheKey), '1');
          return;
        }
        lastDoc = cachedFirst.docs[cachedFirst.docs.length - 1];
      }
    } catch {
      /* live listener has not warmed cache yet */
    }
  }

  while (!signal?.aborted) {
    const q = lastDoc
      ? query(
          messagesCol,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(CHAT_MESSAGES_SYNC_PAGE),
        )
      : query(messagesCol, orderBy('createdAt', 'desc'), limit(CHAT_MESSAGES_SYNC_PAGE));

    let snap;
    try {
      snap = await getDocs(q);
    } catch {
      break;
    }

    if (snap.empty) {
      localStorage.setItem(syncCompleteKey(cacheKey), '1');
      localStorage.removeItem(syncCursorKey(cacheKey));
      break;
    }

    onBatch(snap.docs.map(docToMessage));

    lastDoc = snap.docs[snap.docs.length - 1];
    localStorage.setItem(syncCursorKey(cacheKey), lastDoc.id);

    if (snap.docs.length < CHAT_MESSAGES_SYNC_PAGE) {
      localStorage.setItem(syncCompleteKey(cacheKey), '1');
      localStorage.removeItem(syncCursorKey(cacheKey));
      break;
    }
  }
}

export { mergeMessageLists, mergeMessageListsStable };
