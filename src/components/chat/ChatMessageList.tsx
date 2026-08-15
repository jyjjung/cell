"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { ChatTimeSeparator, formatChatMessageDate } from './ChatTimeSeparator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resolveChatUserName, isMutedChatEvent } from '@/lib/chat-utils';
import { useChatScrollLoadOlder } from '@/hooks/use-chat-scroll-load-older';
import { cn } from '@/lib/utils';
import type { Chat, ChatMemberInfo, ChatMessage, UserProfileData } from '@/types';

const EMPTY_SEEN_NAMES: string[] = [];
const NEAR_BOTTOM_PX = 80;

interface ChatMessageListProps {
  messages: ChatMessage[];
  chat: Chat;
  usersById: Map<string, UserProfileData>;
  sendersByUserId: Map<string, ChatMemberInfo | null>;
  messagesById: Map<string, ChatMessage>;
  lastSeenNamesPerMessage: Record<string, string[]>;
  toggleReaction: (messageId: string, emoji: string) => void;
  votePoll?: (messageId: string, optionIndex: number) => void;
  setPollResultsLocked?: (messageId: string, locked: boolean) => void;
  deleteMessage: (messageId: string) => void;
  onOpenThread: (messageId: string) => void;
  onOpenImage: (imageUrl: string) => void;
  onOpenWorshipViewer: (setlistId?: string, songId?: string, imageUrl?: string) => void;
  onLoadOlder?: () => void;
  loadingOlder?: boolean;
  hasMoreOlder?: boolean;
}

function findVisibleNeighbor(messages: ChatMessage[], startIndex: number, direction: 1 | -1): ChatMessage | undefined {
  for (let j = startIndex + direction; j >= 0 && j < messages.length; j += direction) {
    if (!isMutedChatEvent(messages[j])) return messages[j];
  }
  return undefined;
}

export default function ChatMessageList({
  messages,
  chat,
  usersById,
  sendersByUserId,
  messagesById,
  lastSeenNamesPerMessage,
  toggleReaction,
  votePoll,
  setPollResultsLocked,
  deleteMessage,
  onOpenThread,
  onOpenImage,
  onOpenWorshipViewer,
  onLoadOlder,
  loadingOlder = false,
  hasMoreOlder = false,
}: ChatMessageListProps) {
  const scrollRef = useChatScrollLoadOlder({ onLoadOlder, hasMoreOlder, loadingOlder });
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const pinnedChatIdRef = useRef<string | null>(null);

  const scrollToNewest = () => {
    const el = scrollRef.current;
    if (!el) return;
    // flex-col-reverse: newest messages live at scrollTop ≈ 0
    el.scrollTop = 0;
  };

  // Opening a chat (or first messages paint) should land on the latest messages.
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const isNewChat = pinnedChatIdRef.current !== chat.id;
    if (isNewChat) {
      pinnedChatIdRef.current = chat.id;
      scrollToNewest();
      requestAnimationFrame(scrollToNewest);
      return;
    }
    // Stay pinned while layout settles (tall cards / content-visibility).
    const el = scrollRef.current;
    if (el && Math.abs(el.scrollTop) <= NEAR_BOTTOM_PX) {
      scrollToNewest();
    }
  }, [chat.id, messages.length, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setShowJumpToLatest(Math.abs(el.scrollTop) > NEAR_BOTTOM_PX);
    };

    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => el.removeEventListener('scroll', update);
  }, [scrollRef, messages.length]);

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const messageList = useMemo(() => {
    const content: ReactNode[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const olderVisible = findVisibleNeighbor(messages, i, 1);
      const newerVisible = findVisibleNeighbor(messages, i, -1);

      const isPoll = !!msg.poll;
      const showName =
        isMutedChatEvent(msg) ||
        !olderVisible ||
        olderVisible.senderId !== msg.senderId ||
        (msg.createdAt &&
          olderVisible.createdAt &&
          msg.createdAt.toMillis() - olderVisible.createdAt.toMillis() > 3600000);

      const showAvatar =
        !isPoll &&
        (isMutedChatEvent(msg) ||
        !newerVisible ||
        newerVisible.senderId !== msg.senderId ||
        (newerVisible.createdAt &&
          msg.createdAt &&
          newerVisible.createdAt.toMillis() - msg.createdAt.toMillis() > 3600000));

      content.push(
        <div
          key={msg.id}
          className="[content-visibility:auto] [contain-intrinsic-size:auto_72px]"
        >
          <MessageBubble
            message={msg}
            chat={chat}
            sender={sendersByUserId.get(msg.senderId) ?? null}
            usersById={usersById}
            toggleReaction={toggleReaction}
            votePoll={votePoll}
            setPollResultsLocked={setPollResultsLocked}
            lastSeenNames={lastSeenNamesPerMessage[msg.id] ?? EMPTY_SEEN_NAMES}
            onOpenThread={onOpenThread}
            onOpenImage={onOpenImage}
            onOpenWorshipViewer={onOpenWorshipViewer}
            onDelete={deleteMessage}
            parentMessage={msg.replyToId ? messagesById.get(msg.replyToId) : undefined}
            parentSenderName={
              msg.replyToId
                ? resolveChatUserName(messagesById.get(msg.replyToId)?.senderId || '', chat, usersById)
                : undefined
            }
            threadParentMessage={msg.threadParentId ? messagesById.get(msg.threadParentId) : undefined}
            showAvatar={showAvatar}
            showName={showName}
            showHalo={chat.appScope !== 'ndcpc'}
          />
        </div>,
      );

      const olderMsg = messages[i + 1];
      if (olderMsg && msg.createdAt && olderMsg.createdAt) {
        const diff = msg.createdAt.toMillis() - olderMsg.createdAt.toMillis();
        if (diff > 3600000) {
          content.push(
            <ChatTimeSeparator
              key={`time-${msg.id}`}
              label={formatChatMessageDate(msg.createdAt.toDate())}
            />,
          );
        }
      }
    }

    return content;
  }, [
    messages,
    messagesById,
    chat,
    usersById,
    toggleReaction,
    votePoll,
    setPollResultsLocked,
    deleteMessage,
    lastSeenNamesPerMessage,
    onOpenThread,
    onOpenImage,
    onOpenWorshipViewer,
    sendersByUserId,
  ]);

  return (
    <div className="absolute inset-0">
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-2 flex flex-col-reverse custom-scrollbar touch-pan-y"
      >
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col-reverse gap-1 max-w-3xl mx-auto w-full min-w-0">
            {messageList}
            {/* In flex-col-reverse, last DOM child appears at the top (near oldest). */}
            {(loadingOlder || hasMoreOlder) && (
              <div className="flex justify-center py-3" aria-live="polite">
                {loadingOlder ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                ) : (
                  <span className="h-5 w-5" />
                )}
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      <button
        type="button"
        onClick={jumpToLatest}
        aria-label="Jump to latest messages"
        className={cn(
          'absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all',
          showJumpToLatest
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none',
        )}
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
