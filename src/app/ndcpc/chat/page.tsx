'use client';

import dynamic from 'next/dynamic';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { NavPageHeader } from '@/components/ui/page-layout';

const ChatList = dynamic(() => import('@/components/chat/ChatList'), {
  loading: () => (
    <div className="page-container stack-gap-sm pb-20">
      <NavPageHeader />
      <ListLoadingSkeleton rows={8} />
    </div>
  ),
});

export default function NdcpcChatPage() {
  return <ChatList appScope="ndcpc" basePath="/ndcpc/chat" showTools={false} />;
}
