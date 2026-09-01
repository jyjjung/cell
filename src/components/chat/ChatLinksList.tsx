"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link2 } from 'lucide-react';
import type { ChatMessage } from '@/types';
import type { UserProfileData } from '@/types';
import { extractChatLinks } from '@/lib/chat-media-extract';
import { EmptyState } from '@/components/ui/page-layout';
import ChatLinkCard from './ChatLinkCard';

export { extractChatLinks } from '@/lib/chat-media-extract';

export default function ChatLinksList({
  messages,
  allUsers,
}: {
  messages: ChatMessage[];
  allUsers: UserProfileData[];
}) {
  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.uid, u])),
    [allUsers],
  );

  const links = useMemo(
    () => extractChatLinks(messages, usersById),
    [messages, usersById],
  );

  if (links.length === 0) {
    return (
      <EmptyState
        icon={Link2}
        title="No links yet"
        description="Links shared in messages will appear here."
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
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
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
