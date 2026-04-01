
"use client";

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import type { ChatMessage, Chat, ChatMemberInfo } from '@/types';
import { cn } from '@/lib/utils';
import { SmilePlus, Download } from 'lucide-react';
import { getMemberFullName } from '@/lib/chat-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageLightbox } from './ImageLightbox';
import { translations } from '@/lib/translations';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';

const standardReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: ChatMessage;
  chat: Chat;
  sender: ChatMemberInfo | null;
  toggleReaction: (messageId: string, emoji: string) => void;
  lastSeenNames?: string[];
  onReply?: () => void;
  parentMessage?: ChatMessage;
  parentSenderName?: string;
}

const MessageBubble = React.memo(function MessageBubble({ message, chat, sender, toggleReaction, lastSeenNames = [], onReply, parentMessage, parentSenderName }: MessageBubbleProps) {
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const isSender = message.senderId === currentUser?.uid;
  const isGroup = chat?.type === 'group';
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const senderName = getMemberFullName(sender);

  const reactions = message.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  const seenByNamesString = lastSeenNames.length > 0 ? lastSeenNames.join(', ') : "";

  const youtubeId = useMemo(() => {
    if (!message.text) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;
    const match = message.text.match(regExp);
    return match ? match[1] : null;
  }, [message.text]);

  const handleDownload = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `msg-img-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn('flex w-full relative py-0.5 flex-col group', isSender ? 'items-end' : 'items-start')}
      >
          <div className={cn("flex items-end gap-2 w-full", isSender ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn("flex flex-col min-w-0 max-w-[85%] md:max-w-[70%]", isSender ? "items-end" : "items-start")}>
                  <div
                      className={cn(
                      'relative rounded-[1.25rem] px-3 py-1.5 transition-all w-fit min-w-[40px]',
                      youtubeId && "w-full sm:min-w-[300px] max-w-full",
                      isSender
                          ? 'bg-[#007AFF] text-white rounded-br-[0.25rem] ml-auto shadow-sm'
                          : 'bg-[#3B3B3D]/90 text-white backdrop-blur-md rounded-bl-[0.25rem] mr-auto border border-white/5'
                      )}
                  >
                      {/* Parent message quote block */}
                      {parentMessage && (
                          <div className={cn("mb-2 p-2 rounded-xl text-xs border border-white/10 flex flex-col gap-1", isSender ? "bg-black/20 text-white/80" : "bg-black/30 text-white/80")}>
                             <span className="font-bold opacity-70 text-[10px] uppercase tracking-wider">{parentSenderName || 'Someone'}</span>
                             <span className="truncate italic opacity-90">{parentMessage.text || '📸 Image'}</span>
                          </div>
                      )}

                      {!isSender && isGroup && senderName && (
                          <p className="text-[9px] font-bold text-[#007AFF] mb-0.5 opacity-90 truncate uppercase tracking-tight">{senderName}</p>
                      )}
 
                      {message.imageUrl && (
                        <ImageLightbox
                          imageUrl={message.imageUrl}
                          altText={t.image || "Image"}
                          onDownload={handleDownload}
                          trigger={
                            <motion.div 
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  "relative rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/20 mb-1.5 cursor-zoom-in transition-all",
                                  !message.text && "mb-0"
                                )}
                            >
                              <img 
                                src={message.imageUrl} 
                                alt={t.image || "Image"} 
                                className="max-w-full h-auto object-cover max-h-[300px] w-full"
                                style={{ minWidth: '150px' }}
                                loading="lazy"
                              />
                            </motion.div>
                          }
                        />
                      )}

                      {message.text && (
                        <LinkifiedText 
                          text={message.text} 
                          isSender={isSender} 
                          className="text-[15px] font-normal" 
                        />
                      )}

                      {youtubeId && (
                        <div className="mt-2 aspect-video w-full rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      )}
                  </div>
                  
                  {reactionEntries.length > 0 && (
                      <div className={cn("flex flex-wrap gap-1 mt-1 px-1", isSender ? "justify-end" : "justify-start")}>
                          {reactionEntries.map(([emoji, uids]) => {
                              const userHasReacted = uids.includes(currentUser!.uid);
                              const reactorNames = uids
                                .map(uid => {
                                  const user = allUsers.find(u => u.uid === uid);
                                  return user ? user.firstName : 'Someone';
                                })
                                .filter(Boolean)
                                .join(', ');

                              return (
                                  <Tooltip key={emoji}>
                                    <TooltipTrigger asChild>
                                      <motion.button 
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => toggleReaction(message.id, emoji)}
                                          className={cn(
                                              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all border shadow-sm",
                                              userHasReacted 
                                                  ? "bg-[#007AFF] text-white border-white/20" 
                                                  : "bg-[#3B3B3D] text-white border-white/5"
                                          )}
                                      >
                                          <span>{emoji}</span>
                                          <span className="opacity-60">{uids.length}</span>
                                      </motion.button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="rounded-xl border-white/5 bg-card/90 backdrop-blur-2xl shadow-xl p-2 border">
                                      <p className="text-[9px] font-bold tracking-tight text-foreground">
                                          {reactorNames}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                              )
                          })}
                      </div>
                  )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Popover>
                      <PopoverTrigger asChild>
                          <button className="p-1 rounded-full text-muted-foreground hover:bg-muted/30 shrink-0">
                              <SmilePlus className="h-4 w-4"/>
                          </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1 rounded-2xl bg-[#3B3B3D]/95 backdrop-blur-2xl border-white/5 shadow-2xl flex flex-col gap-1">
                          <div className="flex gap-1">
                              {standardReactions.map(emoji => (
                                  <button
                                      key={emoji}
                                      onClick={() => toggleReaction(message.id, emoji)}
                                      className="p-2 rounded-xl hover:bg-white/10 text-lg transition-all active:scale-90"
                                  >
                                      {emoji}
                                  </button>
                              ))}
                          </div>
                      </PopoverContent>
                  </Popover>

                  <button 
                      onClick={onReply}
                      className="p-1 rounded-full text-muted-foreground hover:bg-muted/30 shrink-0"
                      title="Reply in thread"
                  >
                      <CornerUpLeft className="h-4 w-4"/>
                  </button>
              </div>
          </div>
          
          {seenByNamesString && (
            <div className={cn(
                "mt-1 px-4 text-[8px] font-medium text-muted-foreground/60 transition-opacity",
                isSender ? "text-right" : "text-left"
            )}>
              {t.seenBy} {seenByNamesString}
            </div>
          )}

          {message.replyCount ? (
              <InlineThreadPreview 
                  chatId={chat.id} 
                  parentMessageId={message.id} 
                  isSender={isSender} 
                  onReply={onReply} 
              />
          ) : null}
      </motion.div>
    </TooltipProvider>
  );
});

function InlineThreadPreview({ chatId, parentMessageId, isSender, onReply }: { chatId: string, parentMessageId: string, isSender: boolean, onReply?: () => void }) {
    const { messages } = useThreadMessages(chatId, parentMessageId);
    const { allUsers } = useAllUsers();

    if (!messages || messages.length === 0) return null;

    const reversedMessages = [...messages].reverse();

    return (
        <div className={cn("flex flex-col gap-0.5 w-full mt-1 mb-2", isSender ? "items-end" : "items-start")}>
            <div className={cn("flex flex-col gap-0.5 max-w-[85%] md:max-w-[70%]", isSender ? "items-end" : "items-start")}>
                {reversedMessages.map(reply => {
                    const sender = allUsers.find(u => u.uid === reply.senderId);
                    const senderName = sender?.firstName || 'Someone';
                    return (
                        <div key={reply.id} className={cn("px-2 py-0.5 hover:bg-white/5 rounded transition-colors text-white", isSender ? "text-right" : "text-left")}>
                            <span className="font-bold opacity-50 uppercase tracking-tight text-[8px] mr-1.5">{senderName}</span>
                            <span className="opacity-80 text-[11px] break-words line-clamp-2">{reply.text || (reply.imageUrl ? '📸 Image' : '')}</span>
                        </div>
                    );
                })}
            </div>
            
            <button 
                onClick={onReply}
                className={cn("text-[9px] font-bold text-[#007AFF] hover:underline px-2 py-0.5 uppercase tracking-wider", isSender ? "mr-1" : "ml-1")}
            >
                Open thread
            </button>
        </div>
    );
}

export default MessageBubble;
