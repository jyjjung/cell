"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useChats } from "@/hooks/useChats";
import { useAllUsers } from "@/hooks/use-all-users";
import { useAuth } from "@/contexts/auth-context";
import { usePageLoading } from "@/contexts/page-loading-context";
import { cn } from "@/lib/utils";
import { getMemberDisplayName, resolveChatAvatar } from "@/lib/chat-utils";
import { formatUserDisplayName } from "@/lib/formatting";
import { isChatUnread } from "@/lib/notification-utils";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight, Plus, Sparkles, Images, Link2 } from "lucide-react";
import { NavPageHeader, EmptyState } from "@/components/ui/page-layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import CreateChatDialog from "./CreateChatDialog";
import { GroupChatAvatar } from "./GroupChatAvatar";
import type { Chat } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { translations } from "@/lib/translations";
import { formatDistanceToNow } from "date-fns";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function ChatList() {
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const { currentUser, isAdmin } = useAuth();
  const online = useOnlineStatus();
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
        avatarData: resolveChatAvatar(peerFullProfile, peerInfoFromChat),
      };
    }

    if (chat.type === 'group') {
      return {
        name: chat.name || t.unnamedCircle,
        avatarData: null,
        photoURL: chat.photoURL || null,
      };
    }

    return null;
  };

  const filteredChats = chats.filter((chat) => !!getChatDetails(chat));

  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setIsPageLoading(true);
    }
  };

  return (
    <div className="page-container stack-gap-sm pb-20">
      <NavPageHeader
        action={
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="h-8 rounded-lg px-3 text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t.newChat}
          </Button>
        }
      />

      {!online && chats.length > 0 && (
        <p className="text-micro-label px-1">{t.chatOfflineBanner}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-8 rounded-lg px-3 text-sm">
          <Link href="/chat/photos" onClick={() => handleLinkClick('/chat/photos')}>
            <Images className="mr-2 h-4 w-4" />
            {t.allPhotos}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-8 rounded-lg px-3 text-sm">
          <Link href="/chat/links" onClick={() => handleLinkClick('/chat/links')}>
            <Link2 className="mr-2 h-4 w-4" />
            {t.allLinks}
          </Link>
        </Button>
      </div>

      <div className="relative">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredChats.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={t.silenceInTheAir}
            description={t.startConversation}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {isAdmin && (
                <motion.div key="system-assistant" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                  <Link
                    href={`/chat/system`}
                    onClick={() => handleLinkClick(`/chat/system`)}
                    className={cn(
                      "ui-card flex items-center gap-3 p-3 transition-shadow hover:shadow-md w-full",
                      pathname === '/chat/system' && "ring-1 ring-primary bg-primary/5"
                    )}
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center border border-border/40 bg-primary/5">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-semibold truncate text-sm">{t.systemAssistant}</p>
                        <span className="text-micro-label text-primary shrink-0">{t.adminTool}</span>
                      </div>
                      <p className="text-micro-label truncate">{t.launchWizard}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </motion.div>
              )}

              {filteredChats.map((chat, i) => {
                const details = getChatDetails(chat);
                if (!details) return null;

                const isActive = pathname === `/chat/${chat.id}`;
                const isUnread = Boolean(
                  currentUser && !isActive && isChatUnread(chat, currentUser.uid),
                );
                const lastSenderProfile = allUsers.find(u => u.uid === chat.lastMessageSenderId);
                const lastSenderName = formatUserDisplayName(lastSenderProfile);

                return (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: i * 0.02 }}
                    className="w-full"
                  >
                    <Link
                      href={`/chat/${chat.id}`}
                      onClick={() => handleLinkClick(`/chat/${chat.id}`)}
                      className={cn(
                        "ui-card flex items-center gap-3 p-3 transition-shadow hover:shadow-md w-full",
                        isActive && "ring-1 ring-primary bg-primary/5",
                        isUnread && !isActive && "ring-1 ring-primary/20"
                      )}
                    >
                      <div className="relative h-10 w-10 shrink-0">
                        <div className="h-full w-full rounded-full border border-border/40 bg-muted/20">
                          {details.avatarData || details.photoURL ? (
                            <GroupChatAvatar avatar={details.avatarData} photoURL={details.photoURL} active={isActive} />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-primary/5 rounded-full">
                              <MessageCircle className="h-5 w-5 text-primary/60" />
                            </div>
                          )}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="font-semibold truncate text-sm">{details.name}</p>
                          {chat.lastMessageSentAt && (
                            <span className="text-micro-label whitespace-nowrap shrink-0">
                              {formatDistanceToNow(chat.lastMessageSentAt.toDate(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-xs truncate",
                          isUnread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {chat.lastMessageText ? (
                            <>
                              <span className="font-medium text-primary/80 mr-1">{lastSenderName}:</span>
                              {chat.lastMessageText}
                            </>
                          ) : t.messenger}
                        </p>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      {isCreateDialogOpen && (
        <CreateChatDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
      )}
    </div>
  );
}
