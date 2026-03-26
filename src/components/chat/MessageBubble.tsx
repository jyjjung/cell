
"use client";

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import type { ChatMessage, Chat, ChatMemberInfo } from '@/types';
import { cn } from '@/lib/utils';
import { SmilePlus } from 'lucide-react';
import { getMemberFullName } from '@/lib/chat-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';
import { LinkifiedText } from '@/components/ui/linkified-text';

const standardReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: ChatMessage;
  chat: Chat;
  sender: ChatMemberInfo | null;
  toggleReaction: (messageId: string, emoji: string) => void;
  lastSeenNames?: string[];
}

const MessageBubble = React.memo(function MessageBubble({ message, chat, sender, toggleReaction, lastSeenNames = [] }: MessageBubbleProps) {
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
                      {!isSender && isGroup && senderName && (
                          <p className="text-[9px] font-bold text-[#007AFF] mb-0.5 opacity-90 truncate uppercase tracking-tight">{senderName}</p>
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

              <Popover>
                  <PopoverTrigger asChild>
                      <button className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:bg-muted/20 shrink-0">
                          <SmilePlus className="h-3 w-3"/>
                      </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1 rounded-2xl bg-[#3B3B3D]/95 backdrop-blur-2xl border-white/5 shadow-2xl">
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
          </div>
          
          {seenByNamesString && (
            <div className={cn(
                "mt-1 px-4 text-[8px] font-medium text-muted-foreground/60 transition-opacity",
                isSender ? "text-right" : "text-left"
            )}>
              {t.seenBy} {seenByNamesString}
            </div>
          )}
      </motion.div>
    </TooltipProvider>
  );
});

export default MessageBubble;
