
"use client";

import ChatList from "@/components/chat/ChatList";
import { useAuth } from '@/contexts/auth-context';
import { useGrantSecretAchievement } from '@/hooks/use-grant-secret-achievement';

export default function ChatPage() {
  const { currentUser } = useAuth();
  useGrantSecretAchievement('chat', !!currentUser);
  return <ChatList />;
}
