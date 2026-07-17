"use client";

import { useMemo, useCallback, useState } from 'react';
import { useChatScrollLoadOlder } from '@/hooks/use-chat-scroll-load-older';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/hooks/use-all-users';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { translations } from '@/lib/translations';
import MessageBubble from './MessageBubble';
import ChatConversationPanel from './ChatConversationPanel';
import MessageInput from './MessageInput';
import { ChatImageGallery } from './ImageLightbox';
import { downloadChatImage } from '@/lib/chat-image-download';
import { Button } from '@/components/ui/button';
import { Chat, ChatMemberInfo } from '@/types';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

function formatMessageDate(date: Date) {
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE HH:mm');
  return format(date, 'MMM d, HH:mm');
}

export default function ThreadWindow({ 
  chatId, 
  parentMessageId,
  chat,
  onClose,
  onDeleteParentMessage
}: { 
  chatId: string; 
  parentMessageId: string;
  chat: Chat;
  onClose: () => void;
  onDeleteParentMessage?: (id: string) => void;
}) {
  const { messages, parentMessage, loading, loadingOlder, hasMoreOlder, loadOlderMessages, toggleReaction, deleteMessage, sendMessage, sendImageMessage } = useThreadMessages(chatId, parentMessageId);
  const { currentUser } = useAuth();
  const usersById = useUsersById();
  const scrollRef = useChatScrollLoadOlder({ onLoadOlder: loadOlderMessages, hasMoreOlder, loadingOlder });
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const threadImages = useMemo(() => {
    const items = [...messages]
      .filter((m) => m.imageUrl && !m.songId && !m.isDeleted)
      .reverse()
      .map((m) => m.imageUrl!);
    if (parentMessage?.imageUrl && !parentMessage.songId && !parentMessage.isDeleted) {
      if (!items.includes(parentMessage.imageUrl)) {
        items.unshift(parentMessage.imageUrl);
      }
    }
    return items;
  }, [messages, parentMessage]);

  const openImageIndex = openImageUrl ? threadImages.indexOf(openImageUrl) : 0;

  const renderContent = useCallback(() => {
    const content = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const olderMsg = messages[i + 1] || parentMessage;

      const senderProfile = usersById.get(msg.senderId);
      const senderInfoFromChat = chat?.memberInfo[msg.senderId] ?? null;
      const senderForBubble: ChatMemberInfo | null = senderProfile 
          ? { firstName: senderProfile.firstName, lastName: senderProfile.lastName, avatar: senderProfile.avatar as any }
          : senderInfoFromChat;

      content.push(
        <MessageBubble 
          key={msg.id} 
          message={msg} 
          chat={chat as Chat} 
          sender={senderForBubble}
          usersById={usersById}
          toggleReaction={toggleReaction} 
          onDelete={deleteMessage}
          onOpenImage={setOpenImageUrl}
        />
      );

      if (olderMsg && msg.createdAt && olderMsg.createdAt) {
        const diff = msg.createdAt.toMillis() - olderMsg.createdAt.toMillis();
        if (diff > 3600000) {
          content.push(
            <div key={`time-${msg.id}`} className="py-6 flex justify-center w-full">
              <span className="text-micro-label text-muted-foreground/40">
                {formatMessageDate(msg.createdAt.toDate())}
              </span>
            </div>
          );
        }
      }
    }
    return content;
  }, [messages, chat, usersById, toggleReaction, parentMessage, deleteMessage]);

  const parentSenderProfile = parentMessage ? usersById.get(parentMessage.senderId) : undefined;
  const parentSenderInfo = parentMessage && chat ? chat.memberInfo[parentMessage.senderId] : null;
  const parentSenderForBubble = parentSenderProfile
      ? { firstName: parentSenderProfile.firstName, lastName: parentSenderProfile.lastName, avatar: parentSenderProfile.avatar as any }
      : parentSenderInfo;

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <header className="flex-shrink-0 flex items-center justify-between py-4 px-6 border-b border-border/50 bg-background/50 backdrop-blur-xl z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-muted/20 hover:bg-muted/40 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-micro-label font-semibold text-foreground">{t.thread}</h1>
        <div className="w-10" />
      </header>

      <ChatConversationPanel
        footer={
          <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
            <MessageInput
              chatId={chatId}
              parentMessageId={parentMessageId}
              messageActions={{ sendMessage, sendImageMessage }}
              attachmentsOnlyPhoto
            />
          </div>
        }
      >
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col-reverse custom-scrollbar touch-pan-y"
        >
          <div className="flex flex-col-reverse gap-1 max-w-4xl mx-auto w-full min-w-0">
            {loadingOlder && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
              </div>
            )}
            {renderContent()}

            {parentMessage && (
              <div className="w-full flex-col pt-4 pb-2 relative flex">
                <div className="mt-4 w-full">
                  <MessageBubble
                    message={parentMessage}
                    chat={chat}
                    sender={parentSenderForBubble!}
                    usersById={usersById}
                    toggleReaction={toggleReaction}
                    onOpenImage={setOpenImageUrl}
                    onDelete={(id) => {
                      onDeleteParentMessage?.(id);
                      onClose();
                    }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-6 mb-4">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-micro-label text-muted-foreground">{t.replyCount(messages.length)}</span>
                  <div className="h-px bg-border flex-1" />
                </div>
              </div>
            )}
          </div>

          {loading && messages.length === 0 && (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
            </div>
          )}
        </div>
      </ChatConversationPanel>

      {openImageUrl && threadImages.length > 0 && (
        <ChatImageGallery
          images={threadImages}
          initialIndex={Math.max(0, openImageIndex)}
          onClose={() => setOpenImageUrl(null)}
          onDownload={downloadChatImage}
        />
      )}
    </div>
  );
}
