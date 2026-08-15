'use client';

import ChatList from '@/components/chat/ChatList';

export default function NdcpcChatPage() {
  return <ChatList appScope="ndcpc" basePath="/ndcpc/chat" showTools={false} />;
}
