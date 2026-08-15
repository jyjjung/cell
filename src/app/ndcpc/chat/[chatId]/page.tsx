'use client';

import ChatWindow from '@/components/chat/ChatWindow';
import { use } from 'react';

export default function NdcpcChatDetailsPage(props: { params: Promise<{ chatId: string }> }) {
  const params = use(props.params);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatWindow chatId={params.chatId} backHref="/ndcpc/chat" />
    </div>
  );
}
