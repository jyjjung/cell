"use client";

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Chat } from '@/types';
import { useChatsSubscription } from '@/hooks/use-chats-subscription';

type ChatsContextValue = {
  chats: Chat[];
  loading: boolean;
};

const ChatsContext = createContext<ChatsContextValue | null>(null);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { chats, loading } = useChatsSubscription();

  const value = useMemo(() => ({ chats, loading }), [chats, loading]);

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChatsContext() {
  return useContext(ChatsContext);
}
