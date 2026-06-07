
"use client";

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { ChatMessage, Chat, ChatMemberInfo, UserProfileData } from '@/types';
import { cn, isPdfUrl } from '@/lib/utils';
import { SmilePlus, Music, Maximize, FileText, Trash2, MessagesSquare } from 'lucide-react';
import { getMemberDisplayName, resolveChatUserName } from '@/lib/chat-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/lib/translations';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import EventSummary from './summaries/EventSummary';
import SetlistSummary from './summaries/SetlistSummary';
import RosterSummary from './summaries/RosterSummary';
import QTSummary from './summaries/QTSummary';
import CleaningSummary from './summaries/CleaningSummary';
import SongSummary from './summaries/SongSummary';
import { PixelAvatar } from '../avatar/PixelAvatar';


const standardReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: ChatMessage;
  chat: Chat;
  sender: ChatMemberInfo | null;
  usersById: Map<string, UserProfileData>;
  toggleReaction: (messageId: string, emoji: string) => void;
  lastSeenNames?: string[];
  onReply?: () => void;
  onOpenThread?: (parentMessageId: string) => void;
  onOpenImage?: (imageUrl: string) => void;
  onOpenWorshipViewer?: (setlistId?: string, songId?: string, imageUrl?: string) => void;
  parentMessage?: ChatMessage;
  parentSenderName?: string;
  threadParentMessage?: ChatMessage;
  onDelete?: (messageId: string) => void;
  showAvatar?: boolean;
  showName?: boolean;
}

const MessageBubble = React.memo(function MessageBubble({ 
  message, chat, sender, usersById, toggleReaction, lastSeenNames = [], 
  onReply, onOpenThread, onOpenImage, onOpenWorshipViewer, parentMessage, parentSenderName,
  threadParentMessage, onDelete,
  showAvatar = true, showName = true
}: MessageBubbleProps) {
  const { currentUser, isAdmin } = useAuth();
  const isSender = message.senderId === currentUser?.uid;
  const isGroup = chat?.type === 'group';
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const isSpecialContent = !!(message.imageUrl || message.eventId || message.setlistId || message.rosterId || message.songId);
  const senderName = getMemberDisplayName(sender);
  const reactions = message.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);
  const seenByNamesString = lastSeenNames.length > 0 ? lastSeenNames.join(', ') : "";

  const youtubeId = useMemo(() => {
    if (!message.text) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;
    const match = message.text.match(regExp);
    return match ? match[1] : null;
  }, [message.text]);

  // --- DELETED MESSAGE PLACEHOLDER (must be after all hooks) ---
  if (message.isDeleted) {
    const deleterName = resolveChatUserName(message.deletedBy || message.senderId, chat, usersById, senderName || 'Someone');
    return (
      <div className="flex w-full py-1 justify-center">
        <p className="text-[11px] italic text-muted-foreground/40 px-3 py-0.5">
          {deleterName} deleted a message
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn('flex w-full relative py-[1px] flex-col group', isSender ? 'items-end' : 'items-start')}
      >
          <div className={cn("flex items-end gap-2 w-full", isSender ? 'flex-row-reverse' : 'flex-row')}>
              {!isSender && isGroup && (
                  <div className="w-7 h-7 flex-shrink-0 mb-0.5">
                      {showAvatar ? (
                           <div className="w-7 h-7 rounded-full bg-muted border border-border/50 shadow-sm ring-1 ring-border/10">
                               <PixelAvatar avatar={sender?.avatar} className="w-full h-full" />
                           </div>
                      ) : (
                          <div className="w-7" />
                      )}
                  </div>
              )}
              <div className={cn(
                  "flex flex-col min-w-0 transition-all duration-300", 
                  isSpecialContent ? "max-w-[90%] md:max-w-[85%]" : "max-w-[62%] md:max-w-[75%]",
                  isSender ? "items-end" : "items-start"
              )}>
                  {!isSender && isGroup && senderName && showName && (
                      <p className="text-[10px] font-bold text-primary mb-1 ml-3.5 opacity-90 truncate uppercase tracking-tight">{senderName}</p>
                  )}
                  <div
                      className={cn(
                      'relative rounded-[1.25rem] transition-all w-fit min-w-[40px]',
                      youtubeId && "w-full sm:min-w-[300px] max-w-full",
                      !isSpecialContent && (
                          isSender
                          ? cn('bg-primary text-primary-foreground ml-auto shadow-sm px-2.5 py-1', showAvatar ? 'rounded-br-[0.25rem]' : 'rounded-br-[1.25rem]')
                          : cn('bg-card/80 text-foreground backdrop-blur-md mr-auto border border-border px-2.5 py-1', showAvatar ? 'rounded-bl-[0.25rem]' : 'rounded-bl-[1.25rem]')
                      ),
                      isSpecialContent && (isSender ? "ml-auto" : "mr-auto")
                      )}
                  >
                        {/* Parent message quote block */}
                        {parentMessage && (
                            <div className={cn("mb-2 p-2 rounded-xl text-xs border border-border/20 flex flex-col gap-1", isSender ? "bg-black/20 text-white/80" : "bg-foreground/5 text-foreground/80")}>
                                <span className="font-bold opacity-70 text-[10px] uppercase tracking-wider">{parentSenderName || 'Someone'}</span>
                                <span className="truncate italic opacity-90">{parentMessage.text || '📸 Image'}</span>
                            </div>
                        )}

                        {message.threadParentId && threadParentMessage && onOpenThread && (
                          <button
                            type="button"
                            onClick={() => onOpenThread(message.threadParentId!)}
                            className={cn(
                              "mb-2 w-full text-left p-2 rounded-xl text-xs border flex flex-col gap-1 transition-colors",
                              isSender
                                ? "border-white/20 bg-black/20 text-white/90 hover:bg-black/30"
                                : "border-primary/20 bg-primary/5 text-foreground/90 hover:bg-primary/10",
                            )}
                          >
                            <span className="flex items-center gap-1 font-bold opacity-80 text-[10px] uppercase tracking-wider">
                              <MessagesSquare className="h-3 w-3" />
                              Reply in thread
                            </span>
                            <span className="truncate opacity-70 text-[10px]">
                              {getMemberDisplayName(chat.memberInfo[threadParentMessage.senderId])}: {threadParentMessage.text || (threadParentMessage.imageUrl ? '📸 Image' : 'Message')}
                            </span>
                          </button>
                        )}

  
                        {message.imageUrl && !message.songId && (
                              <motion.div 
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => onOpenImage?.(message.imageUrl!)}
                                  className={cn(
                                    "relative rounded-xl overflow-hidden border border-border/20 shadow-lg bg-foreground/5 mb-1.5 cursor-zoom-in transition-all",
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
                        )}

                        {message.songId && message.imageUrl && (
                          <div 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (onOpenWorshipViewer) {
                                  onOpenWorshipViewer(message.setlistId, message.songId, message.imageUrl);
                                }
                            }}
                            className="flex flex-col gap-0 mb-2 group/sheet cursor-pointer active:scale-[0.98] transition-transform"
                          >
                             <div className="flex items-center gap-3 p-3 bg-foreground/5 border border-border/10 border-b-0 rounded-t-[1.25rem] backdrop-blur-xl group-hover/sheet:bg-foreground/10 transition-colors">
                                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                    <Music className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[13px] font-black text-white truncate leading-tight">
                                        {message.songTitle || 'Shared Chord Sheet'}
                                    </h4>
                                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest truncate">
                                        {message.sheetKey ? `${message.sheetKey} Chart • ` : ''}Click to Expand
                                    </p>
                                </div>
                             </div>
                             <div className="relative border border-border/10 border-t-0 rounded-b-[1.25rem] overflow-hidden bg-foreground/5 h-[220px] group-hover/sheet:border-primary/30 transition-colors">
                                {isPdfUrl(message.imageUrl) ? (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted/40 p-6">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted">
                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold tracking-tight text-foreground">PDF Chord Sheet</p>
                                            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Click to view in high quality</p>
                                        </div>
                                    </div>
                                ) : (
                                    <img 
                                        src={message.imageUrl} 
                                        alt="Chord Sheet" 
                                        className="w-full h-auto object-cover max-h-[350px]"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/sheet:opacity-40 transition-opacity" />
                                <div className="absolute bottom-3 right-3 flex translate-y-1 items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground opacity-0 transition-all group-hover/sheet:translate-y-0 group-hover/sheet:opacity-100">
                                   <Maximize className="w-3 h-3" />
                                   Full View
                                </div>
                             </div>
                          </div>
                        )}

                        {message.text && (
                          <div className={cn(isSpecialContent && "px-3 py-2 bg-card/80 rounded-2xl mb-2")}>
                              <LinkifiedText 
                                text={message.text} 
                                isSender={isSender} 
                                className="text-[15px] font-normal" 
                              />
                          </div>
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
                          {reactionEntries.map(([emoji, uids]) => {
                              const reactionNames = uids.map(uid =>
                                resolveChatUserName(uid, chat, usersById),
                              ).join(', ');

                              return (
                                  <Popover key={emoji}>
                                      <PopoverTrigger asChild>
                                          <button
                                              className={cn(
                                                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                                                  uids.includes(currentUser?.uid || '')
                                                      ? "bg-primary/20 border border-primary/30 text-primary"
                                                      : "bg-foreground/5 border border-border/10 text-foreground/60 hover:bg-foreground/10"
                                              )}
                                          >
                                              <span>{emoji}</span>
                                              <span className="font-bold text-[10px]">{uids.length}</span>
                                          </button>
                                      </PopoverTrigger>
                                      <PopoverContent 
                                          side="top" 
                                          className="text-[11px] font-medium bg-foreground/90 backdrop-blur-xl text-background border-none rounded-xl px-2.5 py-2 shadow-xl w-auto max-w-[200px]"
                                      >
                                          <div className="flex flex-col gap-2">
                                              <div className="break-words">
                                                  <span className="opacity-70 mr-1">Reacted:</span>
                                                  {reactionNames}
                                              </div>
                                              <button 
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleReaction(message.id, emoji);
                                                  }}
                                                  className="text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity bg-background/20 py-1 rounded-md w-full"
                                              >
                                                  {uids.includes(currentUser?.uid || '') ? "Remove Reaction" : "Add Reaction"}
                                              </button>
                                          </div>
                                      </PopoverContent>
                                  </Popover>
                              );
                          })}
                      </div>
                  )}
              </div>

                  <div className={cn(
                      "flex flex-row gap-2 mt-1.5 transition-all duration-200 z-10",
                      isSender ? "justify-end mr-1" : "justify-start ml-1"
                  )}>
                  <Popover>
                      <PopoverTrigger asChild>
                          <button className="p-1 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors">
                              <SmilePlus className="h-3 w-3 text-foreground/40" />
                          </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit p-1 bg-popover/95 backdrop-blur-2xl border border-border/20 rounded-full flex gap-0.5 shadow-2xl">
                          {standardReactions.map(emoji => (
                              <button
                                  key={emoji}
                                  onClick={() => toggleReaction(message.id, emoji)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-transform hover:scale-125"
                              >
                                  <span className="text-lg">{emoji}</span>
                              </button>
                          ))}
                      </PopoverContent>
                  </Popover>

                  <button 
                      onClick={onReply}
                      className="p-1 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
                  >
                      <CornerUpLeft className="h-3 w-3 text-foreground/40" />
                  </button>

                  {(isSender || isAdmin) && onDelete && (
                      <Popover>
                          <PopoverTrigger asChild>
                              <button className="p-1 rounded-full bg-foreground/5 hover:bg-rose-500/20 group/del transition-colors">
                                  <Trash2 className="h-3 w-3 text-foreground/40 group-hover/del:text-rose-500" />
                              </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-3 bg-popover border border-border/20 rounded-2xl shadow-2xl">
                              <p className="text-[11px] font-bold text-foreground mb-3 uppercase tracking-wider">Delete Message?</p>
                              <div className="flex gap-2">
                                  <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                      onClick={() => onDelete(message.id)}
                                  >
                                      Delete
                                  </Button>
                              </div>
                          </PopoverContent>
                      </Popover>
                  )}
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
              <ThreadReplyBadge
                  message={message}
                  chat={chat}
                  usersById={usersById}
                  onOpenThread={onReply}
              />
          ) : null}
      </motion.div>
    </TooltipProvider>
  );
});

function ThreadReplyBadge({
  message,
  chat,
  usersById,
  onOpenThread,
}: {
  message: ChatMessage;
  chat: Chat;
  usersById: Map<string, UserProfileData>;
  onOpenThread?: () => void;
}) {
  const preview = message.latestReplyText
    || (message.latestReplyImageUrl ? '📸 Image' : 'Reply');
  const replierName = message.latestReplySenderId
    ? resolveChatUserName(message.latestReplySenderId, chat, usersById)
    : 'Someone';
  const count = message.replyCount ?? 0;

  return (
    <button
      type="button"
      onClick={onOpenThread}
      className="mt-1 mb-2 px-3 py-1.5 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors text-left max-w-[85%]"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
        {count} {count === 1 ? 'reply' : 'replies'}
      </p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
        <span className="font-bold text-foreground/80">{replierName}:</span> {preview}
      </p>
    </button>
  );
}

export default MessageBubble;
