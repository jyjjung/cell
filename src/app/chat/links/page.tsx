"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Link2, Loader2 } from 'lucide-react';
import { useChats } from '@/hooks/useChats';
import { useAllUsers, useUsersById } from '@/hooks/use-all-users';
import { useAllChatMessages } from '@/hooks/use-all-chat-messages';
import { useAuth } from '@/contexts/auth-context';
import { getChatDisplayDetails } from '@/lib/chat-utils';
import { extractChatLinks } from '@/lib/chat-media-extract';
import { PageHeader } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import ChatLinkCard from '@/components/chat/ChatLinkCard';

type GlobalLink = {
  id: string;
  url: string;
  displayUrl: string;
  senderLabel: string;
  chatId: string;
  chatName: string;
  createdAtMillis: number;
};

export default function AllChatLinksPage() {
  const { currentUser } = useAuth();
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const usersById = useUsersById();
  const chatIds = useMemo(() => chats.map((c) => c.id), [chats]);
  const { messagesByChatId, loading: loadingMessages } = useAllChatMessages(chatIds);

  const links = useMemo(() => {
    if (!currentUser) return [];

    const seen = new Set<string>();
    const items: GlobalLink[] = [];

    for (const chat of chats) {
      const details = getChatDisplayDetails(chat, currentUser.uid, allUsers);
      if (!details) continue;

      const messages = messagesByChatId[chat.id] ?? [];
      const chatLinks = extractChatLinks(messages, usersById);

      for (const link of chatLinks) {
        const dedupeKey = `${link.url}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        items.push({
          id: `${chat.id}-${link.id}`,
          url: link.url,
          displayUrl: link.displayUrl,
          senderLabel: link.senderLabel,
          chatId: chat.id,
          chatName: details.name,
          createdAtMillis: link.createdAt?.toMillis?.() ?? 0,
        });
      }
    }

    return items.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
  }, [chats, messagesByChatId, usersById, allUsers, currentUser]);

  const loading = loadingChats || (chatIds.length > 0 && loadingMessages);

  return (
    <div className="page-container max-w-3xl space-y-6 pb-32">
      <PageHeader
        title="All Links"
        action={
          <Button asChild variant="outline" className="h-9 rounded-xl px-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
            <Link href="/chat">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/35 py-16 text-center">
          <Link2 className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold text-foreground">No links yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Links shared in your chats will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((link, i) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <ChatLinkCard
                url={link.url}
                displayUrl={link.displayUrl}
                senderLabel={link.senderLabel}
                chatName={link.chatName}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
