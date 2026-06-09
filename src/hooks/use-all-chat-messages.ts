"use client";

import { useEffect, useState, useMemo } from 'react';
import type { ChatMessage } from '@/types';
import {
  chatMessagesCacheKey,
  chatMessagesCollection,
  mergeMessageListsStable,
  readAllMessagesFromDeviceCache,
  syncAllMessagesToDeviceCache,
} from '@/lib/chat-messages-device-cache';

export function useAllChatMessages(chatIds: string[]) {
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(true);

  const chatIdsKey = useMemo(
    () => [...chatIds].sort().join(','),
    [chatIds],
  );

  useEffect(() => {
    if (chatIds.length === 0) {
      setMessagesByChatId({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const abort = { aborted: false };

    const loadAll = async () => {
      const results: Record<string, ChatMessage[]> = {};

      await Promise.all(
        chatIds.map(async (chatId) => {
          const col = chatMessagesCollection(chatId);
          const cached = await readAllMessagesFromDeviceCache(col);
          results[chatId] = cached;

          void syncAllMessagesToDeviceCache(
            col,
            chatMessagesCacheKey(chatId),
            (batch) => {
              if (abort.aborted) return;
              setMessagesByChatId((prev) => ({
                ...prev,
                [chatId]: mergeMessageListsStable(prev[chatId] ?? [], batch, prev[chatId] ?? []),
              }));
            },
            abort,
          );
        }),
      );

      if (!abort.aborted) {
        setMessagesByChatId(results);
        setLoading(false);
      }
    };

    void loadAll();

    return () => {
      abort.aborted = true;
    };
  }, [chatIdsKey, chatIds]);

  return { messagesByChatId, loading };
}
