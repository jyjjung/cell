
"use client";

import ChatWindow from "@/components/chat/ChatWindow";
import SystemChat from "@/components/admin/system-chat";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChatDetailsPage({ params }: { params: { chatId: string } }) {
  const { isAdmin, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (params.chatId === 'system' && !loadingAuth && !isAdmin) {
      router.push('/chat');
    }
  }, [params.chatId, isAdmin, loadingAuth, router]);

  if (params.chatId === 'system') {
    if (loadingAuth) return null;
    if (!isAdmin) return null;
    return <SystemChat />;
  }

  return <ChatWindow chatId={params.chatId} />;
}
