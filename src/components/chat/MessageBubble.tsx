
"use client";

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { ChatMessage, Chat, ChatMemberInfo, UserProfileData } from '@/types';
import { RemoteImage } from '@/components/ui/remote-image';
import { cn, isPdfUrl } from '@/lib/utils';
import { SmilePlus, Music, Maximize, FileText, Trash2, MessagesSquare, Lock, LockOpen } from 'lucide-react';
import { getMemberDisplayName, resolveChatUserName } from '@/lib/chat-utils';
import { resolveDeletedMessageLabel } from '@/lib/deleted-content';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { translations } from '@/lib/translations';
import PollSummary from './summaries/PollSummary';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toDateSafe } from '@/lib/firestore-timestamp';
import EventSummary from './summaries/EventSummary';
import SetlistSummary from './summaries/SetlistSummary';
import RosterSummary from './summaries/RosterSummary';
import QTSummary from './summaries/QTSummary';
import CleaningSummary from './summaries/CleaningSummary';
import SongSummary from './summaries/SongSummary';
import DocSummary from './summaries/DocSummary';
import { PixelAvatar } from '../avatar/PixelAvatar';


const standardReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: ChatMessage;
  chat: Chat;
  sender: ChatMemberInfo | null;
  usersById: Map<string, UserProfileData>;
  toggleReaction: (messageId: string, emoji: string) => void;
  votePoll?: (messageId: string, optionIndex: number) => void;
  setPollResultsLocked?: (messageId: string, locked: boolean) => void;
  lastSeenNames?: string[];
  onOpenThread?: (messageId: string) => void;
  onOpenImage?: (imageUrl: string) => void;
  onOpenWorshipViewer?: (setlistId?: string, songId?: string, imageUrl?: string) => void;
  parentMessage?: ChatMessage;
  parentSenderName?: string;
  threadParentMessage?: ChatMessage;
  onDelete?: (messageId: string) => void;
  showAvatar?: boolean;
  showName?: boolean;
}

function messageBubblePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  return (
    prev.message === next.message &&
    prev.chat === next.chat &&
    prev.sender === next.sender &&
    prev.usersById === next.usersById &&
    prev.toggleReaction === next.toggleReaction &&
    prev.votePoll === next.votePoll &&
    prev.setPollResultsLocked === next.setPollResultsLocked &&
    prev.lastSeenNames === next.lastSeenNames &&
    prev.onOpenThread === next.onOpenThread &&
    prev.onOpenImage === next.onOpenImage &&
    prev.onOpenWorshipViewer === next.onOpenWorshipViewer &&
    prev.parentMessage === next.parentMessage &&
    prev.parentSenderName === next.parentSenderName &&
    prev.threadParentMessage === next.threadParentMessage &&
    prev.onDelete === next.onDelete &&
    prev.showAvatar === next.showAvatar &&
    prev.showName === next.showName
  );
}

const MessageBubble = React.memo(function MessageBubble({
  message, chat, sender, usersById, toggleReaction, votePoll, setPollResultsLocked, lastSeenNames = [], 
  onOpenThread, onOpenImage, onOpenWorshipViewer, parentMessage, parentSenderName,
  threadParentMessage, onDelete,
  showAvatar = true, showName = true
}: MessageBubbleProps) {
  const { currentUser, isAdmin } = useAuth();
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const isSender = message.senderId === currentUser?.uid;
  const isGroup = chat?.type === 'group';
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const isSpecialContent = !!(message.imageUrl || message.eventId || message.setlistId || message.rosterId || message.songId || message.docId);
  const isStandaloneImage = !!(
    message.imageUrl &&
    !message.songId &&
    !message.text &&
    !message.eventId &&
    !message.setlistId &&
    !message.rosterId &&
    !message.qtDate &&
    !message.cleaningDate &&
    !message.poll &&
    !message.docId &&
    !parentMessage &&
    !message.threadParentId
  );
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

  if (message.isDeleted) {
    return (
      <div className="chat-message-row py-2 flex justify-center w-full">
        <p className="text-[11px] italic text-muted-foreground/60">
          {resolveDeletedMessageLabel(message, t)}
        </p>
      </div>
    );
  }

  if (message.systemEvent) {
    const actorName = resolveChatUserName(message.senderId, chat, usersById);
    const eventLabel =
      message.systemEvent === 'groupPhotoChanged'
        ? t.changedGroupPhoto
        : t.removedGroupPhoto;
    return (
      <div className="chat-message-row py-2 flex justify-center w-full">
        <p className="text-[11px] italic text-muted-foreground/60">
          {actorName} {eventLabel}
        </p>
      </div>
    );
  }

  const isCenteredPoll =
    !!message.poll &&
    votePoll &&
    !message.imageUrl &&
    !message.eventId &&
    !message.setlistId &&
    !message.rosterId &&
    !message.songId &&
    !message.docId &&
    !message.qtDate &&
    !message.cleaningDate;

  if (isCenteredPoll) {
    const pollAuthor = resolveChatUserName(message.senderId, chat, usersById);
    const activityTime = message.pollUpdatedAt ?? message.createdAt;
    const activityDate = toDateSafe(activityTime);

    return (
      <div className="chat-message-row group isolate relative z-[1] flex w-full flex-col items-center py-2">
        {showName && (
          <p className="mb-1.5 text-center text-micro-label text-muted-foreground">{pollAuthor}</p>
        )}
        <div className="w-full max-w-[min(100%,340px)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {message.text && (
            <div className="border-b border-border/50 px-3 pt-2.5 pb-2 text-[15px] leading-snug text-foreground">
              <LinkifiedText text={message.text} isSender={false} className="font-normal" />
            </div>
          )}
          <PollSummary
            message={message}
            chat={chat}
            usersById={usersById}
            isSender={false}
            currentUserId={currentUser?.uid}
            onVote={(optionIndex) => votePoll(message.id, optionIndex)}
          />
          {activityDate && (
            <p className="px-3 pb-2 text-center text-[11px] tabular-nums text-muted-foreground">
              {format(activityDate, "HH:mm")}
            </p>
          )}
        </div>

        {(isSender || isAdmin) && (onDelete || (isSender && setPollResultsLocked)) && (
          <div className="mt-1.5 flex justify-center gap-1.5">
            {isSender && setPollResultsLocked && (
              <button
                type="button"
                onClick={() =>
                  setPollResultsLocked(message.id, !(message.poll?.resultsLocked ?? false))
                }
                className="group/lock rounded-full bg-foreground/5 p-1 transition-colors hover:bg-foreground/10"
                aria-label={message.poll?.resultsLocked ? "Unlock voting" : "Lock voting"}
                title={message.poll?.resultsLocked ? "Unlock voting" : "Lock voting"}
              >
                {message.poll?.resultsLocked ? (
                  <LockOpen className="h-3 w-3 text-foreground/40 group-hover/lock:text-foreground/70" />
                ) : (
                  <Lock className="h-3 w-3 text-foreground/40 group-hover/lock:text-foreground/70" />
                )}
              </button>
            )}
            {(isSender || isAdmin) && onDelete && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="group/del rounded-full bg-foreground/5 p-1 transition-colors hover:bg-rose-500/20">
                    <Trash2 className="h-3 w-3 text-foreground/40 group-hover/del:text-rose-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 rounded-2xl border border-border/20 bg-popover p-3 shadow-2xl">
                  <p className="mb-3 text-sm font-semibold text-foreground">{t.deleteMessageConfirm}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-full rounded-xl text-micro-label font-semibold"
                    onClick={() => onDelete(message.id)}
                  >
                    {t.deleteAction}
                  </Button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {seenByNamesString && (
          <p className="mt-1 text-center text-[8px] font-medium text-muted-foreground/60">
            {t.seenBy} {seenByNamesString}
          </p>
        )}
      </div>
    );
  }

  return (
      <div className={cn('chat-message-row isolate relative z-[1] flex w-full min-w-0 py-[1px] flex-col group', isSender ? 'items-end' : 'items-start')}>
          <div className={cn("flex items-end gap-2 w-full min-w-0", isSender ? 'flex-row-reverse' : 'flex-row')}>
              {!isSender && isGroup && (
                  <div className="w-7 h-7 flex-shrink-0 mb-0.5">
                      {showAvatar ? (
                           <div className="w-7 h-7 rounded-full bg-muted border border-border/50 shadow-sm ring-1 ring-border/10">
                               <PixelAvatar
                                 avatar={sender?.avatar}
                                 className="w-full h-full"
                                 nameHint={{ firstName: sender?.firstName, lastName: sender?.lastName }}
                               />
                           </div>
                      ) : (
                          <div className="w-7" />
                      )}
                  </div>
              )}
              <div className={cn(
                  "flex flex-col min-w-0",
                  isStandaloneImage ? "max-w-[min(85%,320px)] shrink-0" : "flex-1",
                  !isStandaloneImage && isSpecialContent ? "max-w-full sm:max-w-[92%] md:max-w-[85%]" : !isStandaloneImage && "max-w-[85%] sm:max-w-[75%]",
                  isSender ? "items-end" : "items-start"
              )}>
                  {!isSender && isGroup && senderName && showName && (
                      <p className="text-micro-label text-primary mb-1 ml-3.5 opacity-90 truncate">{senderName}</p>
                  )}
                  <div
                      className={cn(
                      'relative rounded-[1.25rem] min-w-0 max-w-full',
                      isStandaloneImage ? 'w-fit' : isSpecialContent ? 'w-full' : 'w-fit min-w-[40px]',
                      youtubeId && !isSpecialContent && "w-full sm:min-w-[300px] max-w-full",
                      !isSpecialContent && (
                          isSender
                          ? cn('bg-primary text-primary-foreground ml-auto shadow-sm px-2.5 py-1', showAvatar ? 'rounded-br-[0.25rem]' : 'rounded-br-[1.25rem]')
                          : cn('bg-card text-foreground mr-auto border border-border px-2.5 py-1', showAvatar ? 'rounded-bl-[0.25rem]' : 'rounded-bl-[1.25rem]')
                      ),
                      isSpecialContent && (isSender ? "ml-auto" : "mr-auto")
                      )}
                  >
                        {/* Parent message quote block */}
                        {parentMessage && (
                            <div className={cn("mb-2 p-2 rounded-xl text-xs border border-border/20 flex flex-col gap-1", isSender ? "bg-black/20 text-white/80" : "bg-foreground/5 text-foreground/80")}>
                                <span className="font-semibold opacity-70 text-micro-label">{parentSenderName || t.someone}</span>
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
                            <span className="flex items-center gap-1 font-semibold opacity-80 text-micro-label">
                              <MessagesSquare className="h-3 w-3" />
                              {t.replyInThread}
                            </span>
                            <span className="truncate opacity-70 text-[10px]">
                              {getMemberDisplayName(chat.memberInfo[threadParentMessage.senderId])}: {threadParentMessage.text || (threadParentMessage.imageUrl ? '📸 Image' : 'Message')}
                            </span>
                          </button>
                        )}

  
                        {message.imageUrl && !message.songId && (
                              <div 
                                  onClick={() => onOpenImage?.(message.imageUrl!)}
                                  className={cn(
                                    "relative inline-block max-w-full rounded-xl overflow-hidden border border-border/20 shadow-lg cursor-zoom-in",
                                    !message.text && "mb-0"
                                  )}
                              >
                                <RemoteImage 
                                  src={message.imageUrl} 
                                  alt={t.image || "Image"} 
                                  width={280}
                                  height={280}
                                  className="block max-h-[280px] max-w-[min(280px,100%)] w-auto h-auto object-contain align-bottom"
                                  sizes="280px"
                                />
                              </div>
                        )}

                        {message.songId && message.imageUrl && (
                          <div 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (onOpenWorshipViewer) {
                                  onOpenWorshipViewer(message.setlistId, message.songId, message.imageUrl);
                                }
                            }}
                            className="flex w-full min-w-0 max-w-full flex-col gap-0 mb-2 overflow-hidden group/sheet cursor-pointer active:scale-[0.98] transition-transform"
                          >
                             <div className="flex items-center gap-3 p-3 bg-foreground/5 border border-border/10 border-b-0 rounded-t-[1.25rem] backdrop-blur-xl group-hover/sheet:bg-foreground/10 transition-colors">
                                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                    <Music className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-white truncate leading-tight">
                                        {message.songTitle || t.chordSheet}
                                    </h4>
                                    <p className="text-micro-label truncate">
                                        {message.sheetKey ? `${message.sheetKey} · ` : ''}{t.tapToOpen}
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
                                            <p className="text-sm font-semibold tracking-tight text-foreground">{t.pdfChordSheet}</p>
                                            <p className="mt-0.5 text-micro-label">{t.tapToOpen}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <RemoteImage 
                                        src={message.imageUrl} 
                                        alt="Chord Sheet" 
                                        width={350}
                                        height={350}
                                        className="w-full h-auto object-cover max-h-[350px]"
                                        sizes="350px"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/sheet:opacity-40 transition-opacity" />
                                <div className="absolute bottom-3 right-3 flex translate-y-1 items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-micro-label text-foreground opacity-0 transition-all group-hover/sheet:translate-y-0 group-hover/sheet:opacity-100">
                                   <Maximize className="w-3 h-3" />
                                   {t.fullView}
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

                        {message.docId && (
                          <DocSummary docId={message.docId} isSender={isSender} />
                        )}
                  </div>

                  {youtubeId && (
                    <div className="mt-2 aspect-video w-full rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                      {youtubePlaying ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${youtubeId}`}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setYoutubePlaying(true)}
                          className="relative block h-full w-full"
                          aria-label="Play YouTube video"
                        >
                          <RemoteImage
                            src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="320px"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white text-lg shadow-lg">
                              ▶
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reactions */}
                  {reactionEntries.length > 0 && (
                      <div className={cn("flex flex-wrap gap-1 mt-1.5", isSender ? "justify-end" : "justify-start")}>
                          {reactionEntries.map(([emoji, uids]) => {
                              const reactionNames = uids.map(uid =>
                                resolveChatUserName(uid, chat, usersById),
                              ).join(', ');
                              const userReacted = uids.includes(currentUser?.uid || '');

                              return (
                                  <Popover key={emoji}>
                                      <PopoverTrigger asChild>
                                          <button
                                              className={cn(
                                                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border",
                                                  isSender
                                                    ? userReacted
                                                      ? "bg-white/25 border-white/40 text-primary-foreground"
                                                      : "bg-black/15 border-white/20 text-primary-foreground/90 hover:bg-black/25"
                                                    : userReacted
                                                      ? "bg-primary/15 border-primary/35 text-primary"
                                                      : "bg-muted/80 border-border text-foreground hover:bg-muted",
                                              )}
                                          >
                                              <span>{emoji}</span>
                                              <span className="font-bold text-[10px]">{uids.length}</span>
                                          </button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                          side="top"
                                          className="w-auto max-w-[220px] rounded-xl border border-border !bg-popover px-3 py-2.5 text-popover-foreground shadow-xl"
                                      >
                                          <div className="flex flex-col gap-2">
                                              <div className="break-words text-xs leading-snug">
                                                  <span className="mb-0.5 block text-micro-label">
                                                    {t.reactedBy}
                                                  </span>
                                                  <span className="font-medium text-foreground">{reactionNames}</span>
                                              </div>
                                              <button
                                                  type="button"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleReaction(message.id, emoji);
                                                  }}
                                                  className="w-full rounded-md bg-muted py-1.5 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted/80"
                                              >
                                                  {userReacted ? t.removeReaction : t.addReaction}
                                              </button>
                                          </div>
                                      </PopoverContent>
                                  </Popover>
                              );
                          })}
                      </div>
                  )}

                  <div className={cn(
                      "flex flex-row gap-2 mt-1.5 z-10",
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
                      onClick={() => onOpenThread?.(message.id)}
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
                              <p className="text-sm font-semibold text-foreground mb-3">{t.deleteMessageConfirm}</p>
                              <div className="flex gap-2">
                                  <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="flex-1 h-8 rounded-xl text-micro-label font-semibold"
                                      onClick={() => onDelete(message.id)}
                                  >
                                      {t.deleteAction}
                                  </Button>
                              </div>
                          </PopoverContent>
                      </Popover>
                  )}
                  </div>
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
                  onOpenThread={() => onOpenThread?.(message.id)}
              />
          ) : null}
      </div>
  );
}, messageBubblePropsEqual);

function ThreadReplyBadge({
  message,
  chat,
  usersById,
  onOpenThread,
  className,
}: {
  message: ChatMessage;
  chat: Chat;
  usersById: Map<string, UserProfileData>;
  onOpenThread?: () => void;
  className?: string;
}) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const preview = message.latestReplyText
    || (message.latestReplyImageUrl ? '📸 Image' : 'Reply');
  const replierName = message.latestReplySenderId
    ? resolveChatUserName(message.latestReplySenderId, chat, usersById)
    : t.someone;
  const count = message.replyCount ?? 0;

  return (
    <button
      type="button"
      onClick={onOpenThread}
      className={cn(
        "mt-1 mb-2 max-w-[85%] rounded-xl border border-border/30 bg-muted/20 px-3 py-1.5 text-left transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <p className="text-micro-label text-primary">
        {t.replyCount(count)}
      </p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
        <span className="font-bold text-foreground/80">{replierName}:</span> {preview}
      </p>
    </button>
  );
}

export default MessageBubble;
