'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/components/ui/loading-spinner';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { useRouter } from 'next/navigation';
import { useEffect, use } from 'react';

const ChatWindow = dynamic(() => import('@/components/chat/ChatWindow'), {
  loading: () => (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
      <ListLoadingSkeleton rows={6} className="flex-1 p-4" />
    </div>
  ),
});

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
