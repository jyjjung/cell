'use client';

import ChatWindow from '@/components/chat/ChatWindow';
import { PageLoading } from '@/components/ui/loading-spinner';
import { useRouter } from 'next/navigation';
import { useEffect, use } from 'react';

export default function CellChatDetailsPage(props: { params: Promise<{ chatId: string }> }) {
  const params = use(props.params);
  const router = useRouter();

  useEffect(() => {
    if (params.chatId === 'system') {
      router.replace('/cell/chat');
    }
  }, [params.chatId, router]);

  if (params.chatId === 'system') {
    return <PageLoading />;
  }

  return <ChatWindow chatId={params.chatId} backHref="/cell/chat" />;
}
