"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDocs,
  getDocsFromCache,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import {
  chatMessagesCollection,
  readAllMessagesFromDeviceCache,
} from '@/lib/chat-messages-device-cache';
import { mergeMessageListsStable } from '@/lib/chat-message-merge';
import type { ChatMessage } from '@/types';

/** Max message pages to scan when building the photos album (same cap as before). */
const PHOTO_ALBUM_MAX_PAGES = 20;
const PHOTO_ALBUM_PAGE_SIZE = 30;

function isAlbumPhotoMessage(m: ChatMessage): boolean {
  return Boolean(m.imageUrl && !m.songId && !m.isDeleted);
}

function docToMessage(docSnap: QueryDocumentSnapshot<DocumentData>): ChatMessage {
  return { id: docSnap.id, ...docSnap.data() } as ChatMessage;
}

/**
 * Loads photo messages for the Photos tab without inflating the live chat message window.
 * Seeds from the on-device cache, then pages older history into a separate list (once per chat).
 */
export function useChatPhotoMessages(
  chatId: string | null,
  enabled: boolean,
  liveMessages: ChatMessage[],
) {
  const [albumMessages, setAlbumMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const hydrateGenRef = useRef(0);
  const lastCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const pagesRef = useRef(0);
  const exhaustedRef = useRef(false);
  const hydratedChatRef = useRef<string | null>(null);

  // Reset when switching chats.
  useEffect(() => {
    hydrateGenRef.current += 1;
    hydratedChatRef.current = null;
    setAlbumMessages([]);
    lastCursorRef.current = null;
    pagesRef.current = 0;
    exhaustedRef.current = false;
    setLoading(false);
    setLoadingMore(false);
  }, [chatId]);

  // Merge live window photos so newly sent images appear immediately.
  const livePhotos = useMemo(
    () => liveMessages.filter(isAlbumPhotoMessage),
    [liveMessages],
  );

  useEffect(() => {
    if (!enabled || !chatId) return;
    // Already fully hydrated this chat for the photos tab this session.
    if (hydratedChatRef.current === chatId) return;

    const gen = hydrateGenRef.current;
    const messagesCol = chatMessagesCollection(chatId);
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // Instant paint from IndexedDB / persistent cache.
      try {
        const cached = await readAllMessagesFromDeviceCache(messagesCol);
        if (cancelled || gen !== hydrateGenRef.current) return;
        const cachedPhotos = cached.filter(isAlbumPhotoMessage);
        if (cachedPhotos.length > 0) {
          setAlbumMessages((prev) => mergeMessageListsStable(cachedPhotos, prev, prev));
        }
      } catch {
        /* ignore cache errors */
      }

      // Page server/cache history without writing into the live messages list.
      while (
        !cancelled &&
        gen === hydrateGenRef.current &&
        !exhaustedRef.current &&
        pagesRef.current < PHOTO_ALBUM_MAX_PAGES
      ) {
        setLoadingMore(true);
        const q = lastCursorRef.current
          ? query(
              messagesCol,
              orderBy('createdAt', 'desc'),
              startAfter(lastCursorRef.current),
              limit(PHOTO_ALBUM_PAGE_SIZE),
            )
          : query(messagesCol, orderBy('createdAt', 'desc'), limit(PHOTO_ALBUM_PAGE_SIZE));

        let snap;
        try {
          const cachedSnap = await getDocsFromCache(q);
          if (cachedSnap.docs.length === PHOTO_ALBUM_PAGE_SIZE) {
            snap = cachedSnap;
          } else {
            snap = await getDocs(q);
          }
        } catch {
          try {
            snap = await getDocs(q);
          } catch {
            break;
          }
        }

        if (cancelled || gen !== hydrateGenRef.current) return;

        if (snap.empty) {
          exhaustedRef.current = true;
          break;
        }

        const pageMessages = snap.docs.map(docToMessage);
        const pagePhotos = pageMessages.filter(isAlbumPhotoMessage);
        if (pagePhotos.length > 0) {
          setAlbumMessages((prev) => mergeMessageListsStable(pagePhotos, prev, prev));
        }

        lastCursorRef.current = snap.docs[snap.docs.length - 1];
        pagesRef.current += 1;

        if (snap.docs.length < PHOTO_ALBUM_PAGE_SIZE) {
          exhaustedRef.current = true;
          break;
        }
      }

      if (!cancelled && gen === hydrateGenRef.current) {
        hydratedChatRef.current = chatId;
        setLoading(false);
        setLoadingMore(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, chatId]);

  const photoMessages = useMemo(
    () => mergeMessageListsStable(livePhotos, albumMessages, albumMessages),
    [livePhotos, albumMessages],
  );

  return {
    photoMessages,
    loading: loading && photoMessages.length === 0,
    loadingMore,
  };
}
