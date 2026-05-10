
"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { Loader2, ArrowLeft, Info, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { getChatDetails } from '@/lib/chat-utils';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import type { WorshipSong } from '@/types';
import { PixelAvatar } from '../avatar/PixelAvatar';
import GroupSettingsDialog from './GroupSettingsDialog';
import ThreadWindow from './ThreadWindow';
import { 
  NewSongDialog, 
  NewSetlistDialog, 
  NewRosterDialog,
  AddChordSheetDialog 
} from '../worship/WorshipDialogs';

function formatMessageDate(date: Date) {
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE HH:mm');
  return format(date, 'MMM d, HH:mm');
}

export default function ChatWindow({ chatId }: { chatId: string }) {
  const { messages, chat, loading: loadingMessages, loadMoreMessages, hasMore, loadingMore, updateSeenTimestamp, toggleReaction, sendMessage, deleteMessage } = useMessages(chatId);
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const online = useOnlineStatus();
  const listRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  // Worship Modal Viewer
  const [worshipViewer, setWorshipViewer] = useState<{ setlistId?: string; songId?: string; imageUrl?: string } | null>(null);
  
  // Worship Creation Dialogs
  const [showNewSong, setShowNewSong] = useState(false);
  const [showNewSetlist, setShowNewSetlist] = useState(false);
  const [showNewRoster, setShowNewRoster] = useState(false);
  const [addSheetSong, setAddSheetSong] = useState<WorshipSong | null>(null);
  
  const { setlists } = useWorshipSetlists();
  const { songs } = useWorshipSongs();

  const t = translations[currentUser?.preferredLanguage || 'en'];
  const showOfflineRibbon = !online;
  const blockingLoad = loadingMessages && messages.length === 0;

  useEffect(() => {
    if (chatId) {
      updateSeenTimestamp();
    }
  }, [chatId, messages, updateSeenTimestamp]);

  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      isInitialLoad.current = false;
    }
  }, [messages]);

  const userMap = useMemo(() => {
    const map: Record<string, any> = {};
    allUsers.forEach(u => {
      map[u.uid] = u;
    });
    return map;
  }, [allUsers]);

  const lastSeenNamesPerMessage = useMemo(() => {
    if (!chat?.memberSeen || !messages.length || !allUsers.length) return {};

    const map: Record<string, string[]> = {};
    const activeMemberIds = new Set(chat.members);

    Object.entries(chat.memberSeen).forEach(([uid, lastSeenTimestamp]) => {
      if (uid === currentUser?.uid) return;
      if (!activeMemberIds.has(uid)) return;
      if (!lastSeenTimestamp) return;

      const lastReadMessage = messages.find(m =>
        m.createdAt && m.createdAt.toMillis() <= lastSeenTimestamp.toMillis()
      );

      if (lastReadMessage) {
        const user = userMap[uid];
        if (user) {
          if (!map[lastReadMessage.id]) map[lastReadMessage.id] = [];
          map[lastReadMessage.id].push(user.firstName);
        }
      }
    });
    return map;
  }, [chat?.memberSeen, chat?.members, messages, allUsers, currentUser?.uid, userMap]);

  const chatDetails = useMemo(() => chat ? getChatDetails(chat) : { name: 'Chat', avatar: null }, [chat]);

  const renderContent = useCallback(() => {
    if (!chat) return null;
    const content = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const olderMsg = messages[i + 1];
      const sender = chat.memberInfo[msg.senderId] || null;
      
      const parentMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : undefined;
      let parentSenderName = '';
      if (parentMessage) {
          const pSender = userMap[parentMessage.senderId];
          parentSenderName = pSender?.firstName || 'Someone';
      }

      content.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          chat={chat}
          sender={sender}
          userMap={userMap}
          toggleReaction={toggleReaction}
          onReply={() => setReplyToId(msg.id)}
          onOpenThread={(msgId) => setActiveThreadId(msgId)}
          onOpenWorshipViewer={(setlistId, songId, imageUrl) => setWorshipViewer({ setlistId, songId, imageUrl })}
          parentMessage={parentMessage}
          parentSenderName={parentSenderName}
          onDelete={deleteMessage}
          lastSeenNames={lastSeenNamesPerMessage[msg.id] || []}
          showAvatar={olderMsg?.senderId !== msg.senderId}
          showName={olderMsg?.senderId !== msg.senderId}
        />
      );

      if (olderMsg && msg.createdAt && olderMsg.createdAt) {
        const diff = msg.createdAt.toMillis() - olderMsg.createdAt.toMillis();
        if (diff > 3600000) {
          content.push(
            <div key={`time-${msg.id}`} className="py-3 flex justify-center w-full">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                {formatMessageDate(msg.createdAt.toDate())}
              </span>
            </div>
          );
        }
      }
    }
    return content;
  }, [messages, chat, toggleReaction, lastSeenNamesPerMessage, userMap, deleteMessage]);

  if (blockingLoad) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" /></div>;
  }

  if (!chat) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-black tracking-tighter mb-4">{t.circleCommand}</h2>
        <Button asChild variant="outline" className="h-14 px-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">
          <Link href="/chat">{t.returnToList}</Link>
        </Button>
      </div>
    );
  }

  return (
      <div className="w-full h-full flex flex-col overflow-hidden">
      {showOfflineRibbon && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/25 text-[11px] font-semibold text-amber-200/90">
          <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span>{t.chatOfflineBanner}</span>
        </div>
      )}

      <header className="flex-shrink-0 flex items-center justify-between py-4 px-6 border-b border-border/50 bg-background/50 backdrop-blur-xl z-20">
        <Link href="/chat" className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/20 hover:bg-muted/40 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border shadow-sm">
            <PixelAvatar avatar={chatDetails.avatar} />
          </div>
          <h1 className="text-[11px] font-black text-foreground uppercase tracking-tight truncate">{chatDetails.name}</h1>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="h-10 w-10 rounded-full bg-muted/20 hover:bg-muted/40"
        >
          <Info className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 min-h-0 relative">
        <div
          ref={listRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-2 flex flex-col-reverse custom-scrollbar"
        >
          <div className="flex flex-col-reverse gap-0.5 max-w-3xl mx-auto w-full">
            {renderContent()}
            
            {hasMore && (
              <div className="text-center py-6">
                <Button onClick={loadMoreMessages} variant="ghost" size="sm" disabled={loadingMore} className="rounded-full px-8 font-black text-[10px] tracking-tight opacity-40 hover:opacity-100 uppercase">
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t.loadMore || 'Load older messages'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/50 relative z-10">
        <MessageInput 
          chatId={chatId} 
          replyToMessage={messages.find(m => m.id === replyToId)} 
          onCancelReply={() => setReplyToId(null)}
          onOpenWorshipCreate={(type, songId) => {
            if (type === 'song') setShowNewSong(true);
            else if (type === 'setlist') setShowNewSetlist(true);
            else if (type === 'roster') setShowNewRoster(true);
            else if (type === 'chords' && songId) {
              const song = songs.find(s => s.id === songId);
              if (song) setAddSheetSong(song);
            }
          }}
        />
      </div>

      <NewSongDialog 
        open={showNewSong} 
        onClose={() => setShowNewSong(false)} 
        onCreated={(id) => {
          // Could optionally send a message about the new song
        }} 
      />
      <NewSetlistDialog 
        open={showNewSetlist} 
        onClose={() => setShowNewSetlist(false)} 
        onCreated={(id) => {
          // Automatically share the new setlist in chat
          sendMessage(undefined, undefined, undefined, undefined, undefined, id);
        }} 
      />
      <NewRosterDialog 
        open={showNewRoster} 
        onClose={() => setShowNewRoster(false)} 
        onCreated={(id) => {
          // Automatically share the new roster in chat
          sendMessage(undefined, undefined, undefined, undefined, undefined, undefined, id);
        }} 
      />
      <AddChordSheetDialog 
        open={!!addSheetSong} 
        song={addSheetSong} 
        onClose={() => setAddSheetSong(null)} 
      />

      {chat && <GroupSettingsDialog isOpen={isSettingsOpen} onOpenChange={setSettingsOpen} chat={chat} />}

      {activeThreadId && chat && (
        <ThreadWindow
          chatId={chatId}
          parentMessageId={activeThreadId}
          chat={chat}
          onClose={() => setActiveThreadId(null)}
          onDeleteParentMessage={deleteMessage}
        />
      )}
    </div>
  );
}
