
"use client";

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import type { ChatMessage, Chat, ChatMemberInfo } from '@/types';
import { cn } from '@/lib/utils';
import { SmilePlus, Download, Music, Maximize } from 'lucide-react';
import { getMemberFullName } from '@/lib/chat-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageLightbox } from './ImageLightbox';
import { translations } from '@/lib/translations';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import InvitationSummary from './summaries/InvitationSummary';
import EventSummary from './summaries/EventSummary';
import SetlistSummary from './summaries/SetlistSummary';
import RosterSummary from './summaries/RosterSummary';
import QTSummary from './summaries/QTSummary';
import CleaningSummary from './summaries/CleaningSummary';
import SongSummary from './summaries/SongSummary';

const standardReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: ChatMessage;
  chat: Chat;
  sender: ChatMemberInfo | null;
  toggleReaction: (messageId: string, emoji: string) => void;
  lastSeenNames?: string[];
  onReply?: () => void;
  onOpenWorshipViewer?: (setlistId?: string, songId?: string) => void;
  parentMessage?: ChatMessage;
  parentSenderName?: string;
}

const MessageBubble = React.memo(function MessageBubble({ 
  message, chat, sender, toggleReaction, lastSeenNames = [], 
  onReply, onOpenWorshipViewer, parentMessage, parentSenderName 
}: MessageBubbleProps) {
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const isSender = message.senderId === currentUser?.uid;
  const isGroup = chat?.type === 'group';
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const isSpecialContent = !!(message.imageUrl || message.invitationId || message.eventId || message.setlistId || message.rosterId || message.songId);
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
          className={cn('flex w-full relative py-[1px] flex-col group', isSender ? 'items-end' : 'items-start')}
      >
          <div className={cn("flex items-end gap-2 w-full", isSender ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn(
                  "flex flex-col min-w-0 transition-all duration-300", 
                  isSpecialContent ? "max-w-[90%] md:max-w-[85%]" : "max-w-[62%] md:max-w-[75%]",
                  isSender ? "items-end" : "items-start"
              )}>
                  <div
                      className={cn(
                      'relative rounded-[1.25rem] transition-all w-fit min-w-[40px]',
                      youtubeId && "w-full sm:min-w-[300px] max-w-full",
                      !isSpecialContent && (
                          isSender
                          ? 'bg-[#007AFF] text-white rounded-br-[0.25rem] ml-auto shadow-sm px-2.5 py-1'
                          : 'bg-[#3B3B3D]/90 text-white backdrop-blur-md rounded-bl-[0.25rem] mr-auto border border-white/5 px-2.5 py-1'
                      ),
                      isSpecialContent && (isSender ? "ml-auto" : "mr-auto")
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
  
                        {message.imageUrl && !message.songId && (
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
                                  className="max-w-full h-auto object-cover max-h-[400px] w-full"
                                  style={{ minWidth: '150px' }}
                                  loading="lazy"
                                />
                              </motion.div>
                            }
                          />
                        )}

                        {message.songId && message.imageUrl && (
                          <div 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (onOpenWorshipViewer) {
                                  onOpenWorshipViewer(message.setlistId, message.songId);
                                }
                            }}
                            className="flex flex-col gap-0 mb-2 group/sheet cursor-pointer active:scale-[0.98] transition-transform"
                          >
                             <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 border-b-0 rounded-t-[1.25rem] backdrop-blur-xl group-hover/sheet:bg-white/10 transition-colors">
                                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                    <Music className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[13px] font-black text-white truncate leading-tight">
                                        {message.songTitle || 'Shared Chord Sheet'}
                                    </h4>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
                                        {message.sheetKey ? `${message.sheetKey} Chart • ` : ''}Click to Expand
                                    </p>
                                </div>
                             </div>
                             <div className="relative border border-white/5 border-t-0 rounded-b-[1.25rem] overflow-hidden bg-black/40 h-[220px] group-hover/sheet:border-primary/30 transition-colors">
                                {message.imageUrl.toLowerCase().includes('.pdf') ? (
                                    <div className="w-full h-full pointer-events-none origin-top overflow-hidden">
                                        <iframe 
                                            src={`${message.imageUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                                            className="w-full h-[300%] border-none opacity-80"
                                            title="PDF Preview"
                                        />
                                    </div>
                                ) : (
                                    <img 
                                        src={message.imageUrl} 
                                        alt="Chord Sheet" 
                                        className="w-full h-auto object-cover max-h-[350px]"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/sheet:opacity-40 transition-opacity" />
                                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 translate-y-1 opacity-0 group-hover/sheet:translate-y-0 group-hover/sheet:opacity-100 transition-all">
                                   <Maximize className="w-3 h-3" />
                                   Full View
                                </div>
                             </div>
                          </div>
                        )}

                        {message.text && (
                          <div className={cn(isSpecialContent && "px-3 py-2 bg-[#3B3B3D]/90 rounded-2xl mb-2")}>
                              <LinkifiedText 
                                text={message.text} 
                                isSender={isSender} 
                                className="text-[15px] font-normal" 
                              />
                          </div>
                        )}

                        {message.invitationId && (
                          <InvitationSummary invitationId={message.invitationId} isSender={isSender} />
                        )}

                        {message.eventId && (
                          <EventSummary eventId={message.eventId} isSender={isSender} />
                        )}

                        {message.setlistId && (
                          <SetlistSummary 
                            setlistId={message.setlistId} 
                            isSender={isSender} 
                            onOpenViewer={(songId) => onOpenWorshipViewer?.(message.setlistId!, songId)}
                          />
                        )}

                        {message.rosterId && (
                          <RosterSummary rosterId={message.rosterId} isSender={isSender} />
                        )}
                        
                        {message.qtDate && (
                          <QTSummary date={message.qtDate} isSender={isSender} />
                        )}
                        
                        {message.cleaningDate && (
                          <CleaningSummary date={message.cleaningDate} isSender={isSender} />
                        )}
                        
                        {message.songId && !message.imageUrl && (
                          <SongSummary 
                            songId={message.songId} 
                            isSender={isSender} 
                            onOpenViewer={(songId) => onOpenWorshipViewer?.(undefined, songId)}
                          />
                        )}
                  </div>

                  {youtubeId && (
                    <div className="mt-2 aspect-video w-full rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {/* Reactions */}
                  {reactionEntries.length > 0 && (
                      <div className={cn("flex flex-wrap gap-1 mt-1.5", isSender ? "justify-end" : "justify-start")}>
                          {reactionEntries.map(([emoji, uids]) => (
                              <button
                                  key={emoji}
                                  onClick={() => toggleReaction(message.id, emoji)}
                                  className={cn(
                                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                                      uids.includes(currentUser?.uid || '')
                                          ? "bg-[#007AFF]/20 border border-[#007AFF]/30 text-[#007AFF]"
                                          : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                                  )}
                              >
                                  <span>{emoji}</span>
                                  <span className="font-bold text-[10px]">{uids.length}</span>
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              <div className={cn(
                  "absolute flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10",
                  isSender ? "right-[calc(100%)] bottom-0" : "left-[calc(100%)] bottom-0"
              )}>
                  <Popover>
                      <PopoverTrigger asChild>
                          <button className="p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                              <SmilePlus className="h-3 w-3 text-white/40" />
                          </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit p-1 bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/10 rounded-full flex gap-0.5 shadow-2xl">
                          {standardReactions.map(emoji => (
                              <button
                                  key={emoji}
                                  onClick={() => toggleReaction(message.id, emoji)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-transform hover:scale-125"
                              >
                                  <span className="text-lg">{emoji}</span>
                              </button>
                          ))}
                      </PopoverContent>
                  </Popover>

                  <button 
                      onClick={onReply}
                      className="p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                      <CornerUpLeft className="h-3 w-3 text-white/40" />
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
