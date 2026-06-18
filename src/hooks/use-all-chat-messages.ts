"use client";

import { useEffect, useState, useMemo } from 'react';
import type { ChatMessage } from '@/types';
import {
  chatMessagesCollection,
  readAllMessagesFromDeviceCache,
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
          results[chatId] = await readAllMessagesFromDeviceCache(col);
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
