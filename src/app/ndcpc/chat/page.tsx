'use client';

import dynamic from 'next/dynamic';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { NavPageHeader, PageShell } from '@/components/ui/page-layout';

const ChatList = dynamic(() => import('@/components/chat/ChatList'), {
  loading: () => (
    <PageShell className="stack-gap-sm pb-20">
      <NavPageHeader />
      <ListLoadingSkeleton rows={8} />
    </PageShell>
  ),
});

export default function NdcpcChatPage() {
  return <ChatList appScope="ndcpc" basePath="/ndcpc/chat" showTools={false} />;
}
