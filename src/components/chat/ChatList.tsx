
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useChats } from "@/hooks/useChats";
import { useAllUsers } from "@/hooks/use-all-users";
import { useAuth } from "@/contexts/auth-context";
import { usePageLoading } from "@/contexts/page-loading-context";
import { cn } from "@/lib/utils";
import { getMemberFullName } from "@/lib/chat-utils";

import { Button } from "@/components/ui/button";
import { Loader2, Users, MessageCircle, ArrowRight, Plus, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/ui/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import CreateChatDialog from "./CreateChatDialog";
import { PixelAvatar } from "../avatar/PixelAvatar";
import type { Chat } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { translations } from "@/lib/translations";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/firebase";
import { prefetchChatMessagesCache } from "@/lib/prefetch-chat-cache";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function ChatList() {
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const { currentUser, isAdmin } = useAuth();
  const online = useOnlineStatus();
  const prefetchedIdsRef = useRef<string>('');
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "private" | "group">("all");

  const loading = loadingChats && chats.length === 0;
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const userMap = useMemo(() => {
    const map: Record<string, any> = {};
    allUsers.forEach(u => {
      map[u.uid] = u;
    });
    return map;
  }, [allUsers]);

  useEffect(() => {
    if (!online || !chats.length) return;
    const key = chats.map((c) => c.id).sort().join(',');
    if (key === prefetchedIdsRef.current) return;
    prefetchedIdsRef.current = key;
    prefetchChatMessagesCache(db, chats.map((c) => c.id));
  }, [online, chats]);

  const getChatDetails = (chat: Chat) => {
    if (!currentUser) return null;

    if (chat.type === 'private') {
      const peerId = chat.members.find(id => id !== currentUser.uid);
      const peerInfoFromChat = peerId ? chat.memberInfo[peerId] : null;
      const peerFullProfile = peerId ? userMap[peerId] : null;

      let fullName = 'Private Chat';
      if (peerFullProfile && peerFullProfile.firstName) {
        fullName = `${peerFullProfile.firstName} ${peerFullProfile.lastName || ''}`.trim();
      } else if (peerInfoFromChat) {
        fullName = getMemberFullName(peerInfoFromChat) || 'Private Chat';
      } else if (!peerId && chat.members.length === 1) {
        fullName = "Archived Conversation";
      }

      return {
        name: fullName,
        avatarData: peerFullProfile?.avatar || peerInfoFromChat?.avatar,
      };
    }

    if (chat.type === 'group') {
      return {
        name: chat.name || 'Unnamed Circle',
        avatarData: null,
      };
    }

    return null;
  };

  const filteredChats = chats.filter(chat => {
    const details = getChatDetails(chat);
    if (!details) return false;

    const matchesTab = activeTab === "all" || chat.type === activeTab;
    const matchesSearch = details.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setIsPageLoading(true);
    }
  };

  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <PageHeader
        title="Messages"
        subtitle="Private & Group Archive"
        icon={MessageCircle}
        accentColor="text-primary"
        action={
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-xl h-9 px-4 font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Button>
        }
      />

      {!online && chats.length > 0 && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400/90 px-1">{t.chatOfflineBanner}</p>
      )}

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-11 pr-4 rounded-xl bg-card/30 backdrop-blur-xl border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium text-sm placeholder:text-muted-foreground/30 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/30 w-fit h-10">
          {(["all", "private", "group"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-4 py-1.5 rounded-lg text-xs font-semibold transition-all min-w-[80px]",
                activeTab === tab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabChat"
                  className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 capitalize">{tab === "group" ? "Groups" : tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="relative">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border border-border/30 bg-card/30">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 rounded-lg" />
                    <Skeleton className="h-3 w-16 rounded-lg" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={searchQuery ? "No matches found" : t.silenceInTheAir}
            description={searchQuery ? `We couldn't find any conversations matching "${searchQuery}"` : "Start a new conversation to get connected."}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {isAdmin && (activeTab === 'all' || activeTab === 'group') && (
                <motion.div
                    key="system-assistant"
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className="w-full"
                >
                    <Link
                      href={`/chat/system`}
                      onClick={() => handleLinkClick(`/chat/system`)}
                      className={cn(
                        "group relative flex items-center gap-4 p-5 rounded-2xl border transition-all w-full overflow-hidden",
                        pathname === '/chat/system'
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 border-primary"
                          : "bg-card/50 border-border/40 backdrop-blur-sm hover:bg-card hover:border-border/60 hover:shadow-md"
                      )}
                    >
                      <div className="relative h-12 w-12 shrink-0">
                        <div className={cn(
                          "h-full w-full rounded-xl flex items-center justify-center border transition-all duration-300",
                          pathname === '/chat/system' ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border/40 bg-primary/5"
                        )}>
                            <Sparkles className={cn("h-5 w-5", pathname === '/chat/system' ? "text-primary-foreground" : "text-primary/60")} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className={cn(
                            "font-bold truncate text-sm leading-none",
                            pathname === '/chat/system' ? "text-primary-foreground" : "text-foreground"
                          )}>
                            System Assistant
                          </p>
                          <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest opacity-40 italic px-2 py-0.5 rounded-full",
                              pathname === '/chat/system' ? "bg-primary-foreground/10 text-primary-foreground" : "bg-primary/10 text-primary"
                          )}>
                            Admin Tool
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs truncate leading-relaxed font-medium opacity-50",
                          pathname === '/chat/system' ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          Launch creation wizard
                        </p>
                      </div>

                      <ArrowRight className={cn("h-4 w-4 transition-all", pathname === '/chat/system' ? "text-primary-foreground/40" : "text-muted-foreground/20 group-hover:text-primary")} />
                    </Link>
                </motion.div>
              )}

              {filteredChats.map((chat, i) => {
                const details = getChatDetails(chat);
                if (!details) return null;

                const isActive = pathname === `/chat/${chat.id}`;
                const lastSeenMillis = chat.memberSeen?.[currentUser!.uid]?.toMillis?.() || 0;
                const lastSentMillis = chat.lastMessageSentAt?.toMillis?.() || 0;
                const isUnread = currentUser && !isActive && lastSentMillis > lastSeenMillis && chat.lastMessageSenderId !== currentUser.uid;
                const lastSenderProfile = userMap[chat.lastMessageSenderId || ''];
                const lastSenderName = lastSenderProfile?.firstName || 'Someone';

                return (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: i * 0.02 }}
                    className="w-full"
                  >
                    <Link
                      href={`/chat/${chat.id}`}
                      onClick={() => handleLinkClick(`/chat/${chat.id}`)}
                      className={cn(
                        "group relative flex items-center gap-4 p-5 rounded-2xl border transition-all w-full overflow-hidden",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 border-primary"
                          : "bg-card/50 border-border/40 backdrop-blur-sm hover:bg-card hover:border-border/60 hover:shadow-md"
                      )}
                    >
                      {/* Avatar Section */}
                      <div className="relative h-12 w-12 shrink-0">
                        <div className={cn(
                          "h-full w-full rounded-xl overflow-hidden border transition-all duration-300",
                          isActive ? "border-primary-foreground/30" : "border-border/40 bg-muted/20"
                        )}>
                          {details.avatarData ? (
                            <PixelAvatar avatar={details.avatarData} />
                          ) : (
                            <div className={cn(
                              "h-full w-full flex items-center justify-center",
                              isActive ? "bg-primary-foreground/10" : "bg-primary/5"
                            )}>
                              <Users className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-primary/60")} />
                            </div>
                          )}
                        </div>

                        <AnimatePresence>
                          {isUnread && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute -top-1 -right-1 flex h-4 w-4 z-20"
                            >
                              <span className={cn(
                                "relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2",
                                isActive ? "border-primary" : "border-background"
                              )}></span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className={cn(
                            "font-bold truncate text-sm leading-none",
                            isActive ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {details.name}
                          </p>
                          {chat.lastMessageSentAt && (
                            <span className={cn(
                              "text-[10px] whitespace-nowrap opacity-50 font-medium",
                              isActive ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(chat.lastMessageSentAt.toDate(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-xs truncate leading-relaxed",
                          isActive ? "text-primary-foreground/70" : "text-muted-foreground",
                          isUnread && !isActive ? "font-bold text-foreground opacity-100" : "font-medium opacity-50"
                        )}>
                          {chat.lastMessageText ? (
                            <>
                              <span className={cn("font-bold mr-1", isActive ? "opacity-100 text-primary-foreground" : "text-primary/80")}>
                                {lastSenderName}:
                              </span>
                              {chat.lastMessageText}
                            </>
                          ) : t.messenger}
                        </p>
                      </div>

                      <ArrowRight className={cn("h-4 w-4 transition-all", isActive ? "text-primary-foreground/40" : "text-muted-foreground/20 group-hover:text-primary")} />
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      <CreateChatDialog isOpen={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}



