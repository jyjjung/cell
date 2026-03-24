
"use client";

import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatDetailsPage({ params }: { params: { chatId: string } }) {
  return <ChatWindow chatId={params.chatId} />;
}
