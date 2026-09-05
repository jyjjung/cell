"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from 'next/navigation';
import { useChats } from "@/hooks/useChats";
import { useAllUsers } from "@/hooks/use-all-users";
import { useAuth } from "@/contexts/auth-context";
import { usePageLoading } from "@/contexts/page-loading-context";
import { cn } from "@/lib/utils";
import { getMemberDisplayName, resolveChatAvatar, chatBelongsToApp } from "@/lib/chat-utils";
import { formatUserDisplayName } from "@/lib/formatting";
import { isChatUnread } from "@/lib/notification-utils";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus } from "lucide-react";
import { NavPageHeader, EmptyState } from "@/components/ui/page-layout";
import { ListLoadingSkeleton } from "@/components/ui/loading-state";
import { GroupChatAvatar } from "./GroupChatAvatar";
import type { Chat } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { translations } from "@/lib/translations";
import { formatDistanceToNow } from "date-fns";

const CreateChatDialog = dynamic(() => import("./CreateChatDialog"), { ssr: false });

export type ChatListAppScope = 'cell' | 'ndcpc';

type ChatListProps = {
  /** Which app's chats to show. Default: cell (excludes preschool). */
  appScope?: ChatListAppScope;
  /** Base path for chat links. Default `/chat`. */
  basePath?: string;
  /** Show new-chat control. Default true for cell. */
  showTools?: boolean;
};

export default function ChatList({
  appScope = 'cell',
  basePath = '/chat',
  showTools,
}: ChatListProps) {
  const toolsVisible = showTools ?? appScope === 'cell';
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const loading = loadingChats && chats.length === 0;
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const getChatDetails = (chat: Chat) => {
    if (!currentUser) return null;

    if (chat.type === 'private') {
      const peerId = chat.members.find(id => id !== currentUser.uid);
      const peerInfoFromChat = peerId ? chat.memberInfo[peerId] : null;
      const peerFullProfile = peerId ? allUsers.find(u => u.uid === peerId) : null;

      let fullName = t.privateChat;
      if (peerFullProfile && peerFullProfile.firstName) {
        fullName = formatUserDisplayName(peerFullProfile);
      } else if (peerInfoFromChat) {
        fullName = getMemberDisplayName(peerInfoFromChat, t.privateChat);
      } else if (!peerId && chat.members.length === 1) {
        fullName = t.archivedConversation;
      }

      return {
        name: fullName,
        avatarData: resolveChatAvatar(peerFullProfile, peerInfoFromChat, appScope),
        showHalo: appScope !== 'ndcpc',
      };
    }

    if (chat.type === 'group') {
      return {
        name: chat.name || t.unnamedCircle,
        avatarData: null,
        photoURL: chat.photoURL || null,
        showHalo: appScope !== 'ndcpc',
      };
    }

    return null;
  };

  const filteredChats = chats
    .filter((chat) => chatBelongsToApp(chat, appScope))
    .filter((chat) => !!getChatDetails(chat));

  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setIsPageLoading(true);
    }
  };

  const chatHref = (chatId: string) => `${basePath}/${chatId}`;

  return (
    <div className="page-container stack-gap-sm pb-20">
      <NavPageHeader
        className="flex-row items-center justify-between gap-3"
        action={
          toolsVisible ? (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-8 shrink-0 rounded-lg px-3 text-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.newChat}
            </Button>
          ) : undefined
        }
      />

      <div className="relative">
        {loading ? (
          <ListLoadingSkeleton rows={8} />
        ) : filteredChats.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={t.silenceInTheAir}
            description={
              appScope === 'ndcpc'
                ? 'Role chats appear here when you are assigned a preschool role.'
                : t.startConversation
            }
          />
        ) : (
          <div className="overflow-hidden border-y border-border bg-background">
            <AnimatePresence mode="popLayout">
              {filteredChats.map((chat, i) => {
                const details = getChatDetails(chat);
                if (!details) return null;

                const href = chatHref(chat.id);
                const isActive = pathname === href;
                const isUnread = Boolean(
                  currentUser && !isActive && isChatUnread(chat, currentUser.uid),
                );
                const lastSenderProfile = allUsers.find(u => u.uid === chat.lastMessageSenderId);
                const lastSenderName = formatUserDisplayName(lastSenderProfile);
                const isLast = i === filteredChats.length - 1;

                return (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className="w-full"
                  >
                    <Link
                      href={href}
                      onClick={() => handleLinkClick(href)}
                      className={cn(
                        "flex h-16 w-full items-center gap-3 px-3 transition-colors hover:bg-muted/40",
                        !isLast && "border-b border-border",
                        isActive && "bg-accent",
                      )}
                    >
                      <div className="relative h-10 w-10 shrink-0">
                        <div className="h-full w-full overflow-hidden rounded-full bg-muted">
                          {details.avatarData || details.photoURL ? (
                            <GroupChatAvatar
                              avatar={details.avatarData}
                              photoURL={details.photoURL}
                              active={isActive}
                              showHalo={details.showHalo !== false}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                              <MessageCircle className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {isUnread && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 text-left">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <p className={cn(
                            "truncate text-sm",
                            isUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
                          )}>{details.name}</p>
                          {chat.lastMessageSentAt && (
                            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                              {formatDistanceToNow(chat.lastMessageSentAt.toDate(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "truncate text-xs",
                          isUnread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {chat.lastMessageText ? (
                            <>
                              <span className="mr-1 font-medium text-foreground/80">{lastSenderName}:</span>
                              {chat.lastMessageText}
                            </>
                          ) : t.messenger}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      {toolsVisible && isCreateDialogOpen && (
        <CreateChatDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
      )}
    </div>
  );
}
