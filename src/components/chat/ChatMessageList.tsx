"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { ArrowDown, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resolveChatUserName, isMutedChatEvent } from '@/lib/chat-utils';
import { useChatScrollLoadOlder } from '@/hooks/use-chat-scroll-load-older';
import { Button } from '@/components/ui/button';
import type { Chat, ChatMemberInfo, ChatMessage, UserProfileData } from '@/types';

const EMPTY_SEEN_NAMES: string[] = [];
const SHOW_BACK_TO_BOTTOM_PX = 180;

function formatMessageDate(date: Date) {
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE HH:mm');
  return format(date, 'MMM d, HH:mm');
}

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
  const [showBackToBottom, setShowBackToBottom] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      // flex-col-reverse: scrollTop ~ 0 at newest; grows as user scrolls toward older messages.
      setShowBackToBottom(Math.abs(el.scrollTop) > SHOW_BACK_TO_BOTTOM_PX);
    };

    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => el.removeEventListener('scroll', update);
  }, [scrollRef, messages.length]);

  const scrollToBottom = () => {
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
        <MessageBubble
          key={msg.id}
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
        />,
      );

      const olderMsg = messages[i + 1];
      if (olderMsg && msg.createdAt && olderMsg.createdAt) {
        const diff = msg.createdAt.toMillis() - olderMsg.createdAt.toMillis();
        if (diff > 3600000) {
          content.push(
            <div key={`time-${msg.id}`} className="chat-message-row py-3 flex justify-center w-full">
              <span className="text-micro-label text-muted-foreground/30">
                {formatMessageDate(msg.createdAt.toDate())}
              </span>
            </div>,
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
            {/* After messageList in flex-col-reverse → appears at the oldest (top) end */}
            {loadingOlder && (
              <div className="flex justify-center py-3" aria-live="polite" aria-busy="true">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      {showBackToBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={scrollToBottom}
            className="pointer-events-auto h-9 gap-1.5 rounded-full border border-border/70 bg-card px-3 shadow-md"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Latest
          </Button>
        </div>
      )}
    </div>
  );
}
