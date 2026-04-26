"use client";

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { translations } from '@/lib/translations';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
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
  const { messages, parentMessage, loading, loadMoreMessages, hasMore, loadingMore, toggleReaction, deleteMessage } = useThreadMessages(chatId, parentMessageId);
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const listRef = useRef<HTMLDivElement>(null);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const renderContent = useCallback(() => {
    const content = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const olderMsg = messages[i + 1] || parentMessage;

      const senderProfile = allUsers.find(u => u.uid === msg.senderId);
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
          toggleReaction={toggleReaction} 
          onDelete={deleteMessage}
        />
      );

      if (olderMsg && msg.createdAt && olderMsg.createdAt) {
        const diff = msg.createdAt.toMillis() - olderMsg.createdAt.toMillis();
        if (diff > 3600000) {
          content.push(
            <div key={`time-${msg.id}`} className="py-6 flex justify-center w-full">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                {formatMessageDate(msg.createdAt.toDate())}
              </span>
            </div>
          );
        }
      }
    }
    return content;
  }, [messages, chat, allUsers, toggleReaction, parentMessage]);

  const parentSenderProfile = parentMessage ? allUsers.find(u => u.uid === parentMessage.senderId) : null;
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
        <h1 className="text-[12px] font-black text-foreground uppercase tracking-widest">Thread</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 min-h-0 relative">
        <div 
            ref={listRef} 
            className="absolute inset-0 overflow-y-auto px-4 py-4 flex flex-col-reverse custom-scrollbar"
        >
            <div className="flex flex-col-reverse gap-1 max-w-4xl mx-auto w-full">
                {renderContent()}

                {/* Parent Message Separator */}
                {parentMessage && (
                  <div className="w-full flex-col pt-4 pb-2 relative flex">
                      <div className="mt-4 w-full">
                        <MessageBubble 
                          message={parentMessage}
                          chat={chat}
                          sender={parentSenderForBubble!}
                          toggleReaction={toggleReaction}
                          onDelete={(id) => {
                             onDeleteParentMessage?.(id);
                             onClose(); // Close thread if parent is deleted
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-6 mb-4">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{messages.length} Replies</span>
                        <div className="h-px bg-border flex-1" />
                      </div>
                  </div>
                )}
            </div>

            {hasMore && (
                <div className="text-center py-6">
                    <Button onClick={loadMoreMessages} variant="ghost" size="sm" disabled={loadingMore} className="rounded-full px-8 font-black text-[10px] tracking-tight opacity-40 hover:opacity-100 uppercase">
                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Load more
                    </Button>
                </div>
            )}

            {loading && messages.length === 0 && (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                </div>
            )}
        </div>
      </div>

      <div className="p-4 bg-gradient-to-t from-background via-background/80 to-transparent shrink-0">
          {/* We need to pass parentMessageId down to MessageInput so it uses useThreadMessages instead */}
          <MessageInput 
              chatId={chatId}
              parentMessageId={parentMessageId}
          />
      </div>
    </div>
  );
}
