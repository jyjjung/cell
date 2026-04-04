
"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { Loader2, ArrowLeft, Info, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import Link from 'next/link';
import { getMemberFullName } from '@/lib/chat-utils';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ThreadWindow from './ThreadWindow';
import { PixelAvatar } from '../avatar/PixelAvatar';
import { Button } from '../ui/button';
import GroupSettingsDialog from './GroupSettingsDialog';
import type { Chat, ChatMemberInfo, WorshipSong } from '@/types';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { FullScreenViewer, ViewerSlide } from '../worship/FullScreenViewer';
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
  const { messages, chat, loading: loadingMessages, loadMoreMessages, hasMore, loadingMore, updateSeenTimestamp, toggleReaction, sendMessage } = useMessages(chatId);
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const online = useOnlineStatus();
  const listRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  // Worship Modal Viewer
  const [worshipViewer, setWorshipViewer] = useState<{ setlistId?: string; songId?: string } | null>(null);
  
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
        const user = allUsers.find(u => u.uid === uid);
        const name = user?.firstName || 'Someone';
        if (!map[lastReadMessage.id]) map[lastReadMessage.id] = [];
        if (!map[lastReadMessage.id].includes(name)) {
          map[lastReadMessage.id].push(name);
        }
      }
    });

    return map;
  }, [chat?.memberSeen, chat?.members, messages, allUsers, currentUser]);

  const chatDetails = useMemo(() => {
    if (!chat || !currentUser || !allUsers) return { name: 'Chat', avatar: null };
    if (chat.type === 'private') {
      const peerId = chat.members.find(id => id !== currentUser.uid);
      if (!peerId) return { name: 'Private Chat', avatar: null };

      const peerProfile = allUsers.find(u => u.uid === peerId);
      const peerInfoFromChat = chat.memberInfo[peerId];

      let name = 'Private Chat';
      if (peerProfile && peerProfile.firstName) {
        name = `${peerProfile.firstName} ${peerProfile.lastName || ''}`.trim();
      } else {
        name = getMemberFullName(peerInfoFromChat) || 'Private Chat';
      }

      return {
        name: name,
        avatar: peerProfile?.avatar || peerInfoFromChat?.avatar,
      };
    }
    return { name: chat.name, avatar: null };
  }, [chat, currentUser, allUsers]);

  const renderContent = useCallback(() => {
    const content = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const olderMsg = messages[i + 1];

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
          lastSeenNames={lastSeenNamesPerMessage[msg.id] || []}
          onReply={() => setActiveThreadId(msg.id)}
          onOpenWorshipViewer={(setlistId, songId) => setWorshipViewer({ setlistId, songId })}
          parentMessage={msg.replyToId ? messages.find(m => m.id === msg.replyToId) : undefined}
          parentSenderName={msg.replyToId ? (getMemberFullName(allUsers.find(u => u.uid === messages.find(m => m.id === msg.replyToId)?.senderId) as any) || undefined) : undefined}
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
  }, [messages, chat, allUsers, toggleReaction, lastSeenNamesPerMessage]);

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

      <header className="flex-shrink-0 flex items-center justify-between py-4 px-6 border-b border-white/5 bg-background/50 backdrop-blur-xl z-20">
        <Link href="/chat" className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/20 hover:bg-muted/40 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-white/10 shadow-sm">
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
          </div>
          {hasMore && (
            <div className="text-center py-6">
              <Button onClick={loadMoreMessages} variant="ghost" size="sm" disabled={loadingMore} className="rounded-full px-8 font-black text-[10px] tracking-tight opacity-40 hover:opacity-100 uppercase">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load more
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Worship Viewer Modal logic constructed from state */}
      {(() => {
        if (!worshipViewer) return null;
        const slides: ViewerSlide[] = [];
        
        if (worshipViewer.setlistId) {
          const setlist = setlists.find(s => s.id === worshipViewer.setlistId);
          if (!setlist) return null;

          const orderedSongs = [...setlist.songs].sort((a, b) => a.order - b.order);
          for (const ps of orderedSongs) {
            const libSong = songs.find(s => s.id === ps.songId);
            if (!libSong) continue;
            const forKey = libSong.chordSheets.filter(s => s.key === ps.key);
            forKey.forEach((sheet, i) => {
              slides.push({
                imageUrl: sheet.imageUrl,
                songTitle: ps.title,
                key: ps.key,
                page: i + 1,
                totalPages: forKey.length,
              });
            });
          }
        } else if (worshipViewer.songId) {
          const libSong = songs.find(s => s.id === worshipViewer.songId);
          if (!libSong) return null;
          
          libSong.chordSheets.forEach((sheet) => {
            // Group by key to get proper paging if multiple sheets for one key
            const forKey = libSong.chordSheets.filter(s => s.key === sheet.key);
            const page = forKey.findIndex(s => s.id === sheet.id) + 1;
            
            slides.push({
              imageUrl: sheet.imageUrl,
              songTitle: libSong.title,
              key: sheet.key,
              page,
              totalPages: forKey.length,
            });
          });
        }

        if (slides.length === 0) return null;

        let startIndex = 0;
        if (worshipViewer.setlistId && worshipViewer.songId) {
          const setlist = setlists.find(s => s.id === worshipViewer.setlistId);
          const ps = setlist?.songs.find((s: any) => s.songId === worshipViewer.songId);
          if (ps) {
            const foundIdx = slides.findIndex(sl => sl.songTitle === ps.title && sl.key === ps.key);
            if (foundIdx !== -1) startIndex = foundIdx;
          }
        }

        return (
          <FullScreenViewer 
            slides={slides} 
            startIndex={startIndex} 
            onClose={() => setWorshipViewer(null)} 
          />
        );
      })()}

      <div className="p-4 bg-gradient-to-t from-background via-background/80 to-transparent shrink-0">
        <MessageInput
          chatId={chatId}
          disabled={!online}
          replyToMessage={replyToId ? messages.find(m => m.id === replyToId) : undefined}
          onCancelReply={() => setReplyToId(null)}
          onOpenWorshipCreate={(type: 'song' | 'setlist' | 'roster' | 'chords', songId?: string) => {
            if (type === 'song') setShowNewSong(true);
            if (type === 'setlist') setShowNewSetlist(true);
            if (type === 'roster') setShowNewRoster(true);
            if (type === 'chords' && songId) {
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
        />
      )}
    </div>
  );
}
