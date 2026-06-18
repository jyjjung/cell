
"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers, useUsersById } from '@/hooks/use-all-users';
import { Loader2, ArrowLeft, Info, WifiOff, MessageSquare, Images, Link2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import Link from 'next/link';
import { getMemberDisplayName } from '@/lib/chat-utils';
import { formatUserDisplayName } from '@/lib/formatting';

import ChatMessageList from './ChatMessageList';
import MessageInput from './MessageInput';
import ThreadWindow from './ThreadWindow';
import { PixelAvatar } from '../avatar/PixelAvatar';
import { Button } from '../ui/button';
import GroupSettingsDialog from './GroupSettingsDialog';
import type { Chat, ChatMemberInfo, WorshipSong } from '@/types';
import { translations } from '@/lib/translations';
import { WorshipDataProvider, useWorshipData } from '@/contexts/worship-data-context';
import ChatPhotosAlbum, { extractChatPhotos } from './ChatPhotosAlbum';
import ChatLinksList, { extractChatLinks } from './ChatLinksList';
import ChatPhotoUploadButton from './ChatPhotoUploadButton';
import { FullScreenViewer, ViewerSlide } from '../worship/FullScreenViewer';
import { resolveChordSheetsForSetlistSong, getReferenceTracks } from '@/lib/worship-utils';
import { ChatImageGallery } from './ImageLightbox';
import { downloadChatImage } from '@/lib/chat-image-download';
import { 
  NewSongDialog, 
  NewSetlistDialog, 
  NewRosterDialog, 
  AddChordSheetDialog 
} from '../worship/WorshipDialogs';

export default function ChatWindow({ chatId }: { chatId: string }) {
  const messageState = useMessages(chatId);
  const { messages } = messageState;

  const [worshipViewer, setWorshipViewer] = useState<{ setlistId?: string; songId?: string; imageUrl?: string } | null>(null);
  const [showNewSong, setShowNewSong] = useState(false);
  const [showNewSetlist, setShowNewSetlist] = useState(false);
  const [showNewRoster, setShowNewRoster] = useState(false);
  const [addSheetSong, setAddSheetSong] = useState<WorshipSong | null>(null);

  const needsWorshipData = useMemo(
    () =>
      !!worshipViewer ||
      showNewSong ||
      showNewSetlist ||
      !!addSheetSong ||
      messages.some((m) => m.songId || m.setlistId),
    [worshipViewer, showNewSong, showNewSetlist, addSheetSong, messages],
  );

  return (
    <WorshipDataProvider enabled={needsWorshipData}>
      <ChatWindowBody
        chatId={chatId}
        messageState={messageState}
        worshipViewer={worshipViewer}
        setWorshipViewer={setWorshipViewer}
        showNewSong={showNewSong}
        setShowNewSong={setShowNewSong}
        showNewSetlist={showNewSetlist}
        setShowNewSetlist={setShowNewSetlist}
        showNewRoster={showNewRoster}
        setShowNewRoster={setShowNewRoster}
        addSheetSong={addSheetSong}
        setAddSheetSong={setAddSheetSong}
      />
    </WorshipDataProvider>
  );
}

function ChatWindowBody({
  chatId,
  messageState,
  worshipViewer,
  setWorshipViewer,
  showNewSong,
  setShowNewSong,
  showNewSetlist,
  setShowNewSetlist,
  showNewRoster,
  setShowNewRoster,
  addSheetSong,
  setAddSheetSong,
}: {
  chatId: string;
  messageState: ReturnType<typeof useMessages>;
  worshipViewer: { setlistId?: string; songId?: string; imageUrl?: string } | null;
  setWorshipViewer: (v: { setlistId?: string; songId?: string; imageUrl?: string } | null) => void;
  showNewSong: boolean;
  setShowNewSong: (v: boolean) => void;
  showNewSetlist: boolean;
  setShowNewSetlist: (v: boolean) => void;
  showNewRoster: boolean;
  setShowNewRoster: (v: boolean) => void;
  addSheetSong: WorshipSong | null;
  setAddSheetSong: (v: WorshipSong | null) => void;
}) {
  const {
    messages,
    chat,
    loading: loadingMessages,
    loadingOlder,
    hasMoreOlder,
    loadOlderMessages,
    updateSeenTimestamp,
    toggleReaction,
    sendMessage,
    sendImageMessage,
    deleteMessage,
  } = messageState;
  const worshipData = useWorshipData();
  const setlists = worshipData?.setlists ?? [];
  const songs = worshipData?.songs ?? [];
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const usersById = useUsersById();
  const online = useOnlineStatus();
  const isInitialLoad = useRef(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<'messages' | 'photos' | 'links'>('messages');
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

  const photoCount = useMemo(
    () => extractChatPhotos(messages, usersById).length,
    [messages, usersById],
  );

  const linkCount = useMemo(
    () => extractChatLinks(messages, usersById).length,
    [messages, usersById],
  );

  const t = translations[currentUser?.preferredLanguage || 'en'];
  const showOfflineRibbon = !online;
  const blockingLoad = loadingMessages && messages.length === 0;

  useEffect(() => {
    if (!chatId) return;

    const timeoutId = window.setTimeout(() => {
      updateSeenTimestamp();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [chatId, messages.length, updateSeenTimestamp]);

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
        const name = formatUserDisplayName(usersById.get(uid));
        if (!map[lastReadMessage.id]) map[lastReadMessage.id] = [];
        if (!map[lastReadMessage.id].includes(name)) {
          map[lastReadMessage.id].push(name);
        }
      }
    });

    return map;
  }, [chat?.memberSeen, chat?.members, messages, usersById, currentUser]);

  const chatDetails = useMemo(() => {
    if (!chat || !currentUser || !allUsers) return { name: 'Chat', avatar: null };
    if (chat.type === 'private') {
      const peerId = chat.members.find(id => id !== currentUser.uid);
      if (!peerId) return { name: 'Private Chat', avatar: null };

      const peerProfile = allUsers.find(u => u.uid === peerId);
      const peerInfoFromChat = chat.memberInfo[peerId];

      let name = 'Private Chat';
      if (peerProfile && peerProfile.firstName) {
        name = formatUserDisplayName(peerProfile);
      } else {
        name = getMemberDisplayName(peerInfoFromChat, 'Private Chat');
      }

      return {
        name: name,
        avatar: peerProfile?.avatar || peerInfoFromChat?.avatar,
      };
    }
    return { name: chat.name, avatar: null };
  }, [chat, currentUser, allUsers]);

  const chatImages = useMemo(
    () =>
      [...messages]
        .filter((m) => m.imageUrl && !m.songId && !m.isDeleted)
        .reverse()
        .map((m) => m.imageUrl!),
    [messages],
  );

  const openImageIndex = openImageUrl ? chatImages.indexOf(openImageUrl) : 0;

  const messagesById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  const handleOpenThread = useCallback((messageId: string) => {
    setActiveThreadId(messageId);
  }, []);

  const handleOpenImage = useCallback((imageUrl: string) => {
    setOpenImageUrl(imageUrl);
  }, []);

  const handleOpenWorshipViewer = useCallback((
    setlistId?: string,
    songId?: string,
    imageUrl?: string,
  ) => {
    setWorshipViewer({ setlistId, songId, imageUrl });
  }, []);

  const sendersByUserId = useMemo(() => {
    if (!chat) return new Map<string, ChatMemberInfo | null>();
    const map = new Map<string, ChatMemberInfo | null>();
    for (const msg of messages) {
      if (map.has(msg.senderId)) continue;
      const senderProfile = usersById.get(msg.senderId);
      const senderInfoFromChat = chat.memberInfo[msg.senderId] ?? null;
      map.set(
        msg.senderId,
        senderProfile
          ? { firstName: senderProfile.firstName, lastName: senderProfile.lastName, avatar: senderProfile.avatar as any }
          : senderInfoFromChat,
      );
    }
    return map;
  }, [messages, usersById, chat]);

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
          <div className="h-10 w-10 rounded-full bg-muted border border-border shadow-sm">
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

      <div className="flex-shrink-0 flex gap-1 px-4 py-2 border-b border-border/30 bg-background/30">
        <button
          type="button"
          onClick={() => setChatTab('messages')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            chatTab === 'messages'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Messages
        </button>
        <button
          type="button"
          onClick={() => setChatTab('photos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            chatTab === 'photos'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <Images className="h-3.5 w-3.5" />
          Photos{photoCount > 0 ? ` (${photoCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setChatTab('links')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            chatTab === 'links'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Links{linkCount > 0 ? ` (${linkCount})` : ''}
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {chatTab === 'messages' ? (
          <ChatMessageList
            messages={messages}
            chat={chat}
            usersById={usersById}
            sendersByUserId={sendersByUserId}
            messagesById={messagesById}
            lastSeenNamesPerMessage={lastSeenNamesPerMessage}
            toggleReaction={toggleReaction}
            deleteMessage={deleteMessage}
            onOpenThread={handleOpenThread}
            onOpenImage={handleOpenImage}
            onOpenWorshipViewer={handleOpenWorshipViewer}
            onLoadOlder={loadOlderMessages}
            loadingOlder={loadingOlder}
            hasMoreOlder={hasMoreOlder}
          />
        ) : chatTab === 'photos' ? (
          <ChatPhotosAlbum
            messages={messages}
            allUsers={allUsers}
            onOpenImage={setOpenImageUrl}
          />
        ) : (
          <ChatLinksList messages={messages} allUsers={allUsers} />
        )}
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
            const sheets = resolveChordSheetsForSetlistSong(libSong, ps);
            const tracks = getReferenceTracks(ps);
            if (sheets.length > 0 || tracks.length > 0) {
              slides.push({
                imageUrls: sheets.map(s => s.imageUrl),
                songTitle: ps.title,
                key: ps.key,
                referenceTracks: tracks.length > 0 ? tracks : undefined,
              });
            }
          }
        } else if (worshipViewer.songId) {
          const libSong = songs.find(s => s.id === worshipViewer.songId);
          if (!libSong) return null;
          
          const keyMap = new Map<string, string[]>();
          libSong.chordSheets.forEach((sheet) => {
            if (!keyMap.has(sheet.key)) keyMap.set(sheet.key, []);
            keyMap.get(sheet.key)!.push(sheet.imageUrl);
          });
          Array.from(keyMap.entries()).forEach(([key, urls]) => {
            slides.push({
              imageUrls: urls,
              songTitle: libSong.title,
              key: key as any,
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
        } else if (worshipViewer.imageUrl) {
          const foundIdx = slides.findIndex(sl => sl.imageUrls?.includes(worshipViewer.imageUrl!));
          if (foundIdx !== -1) startIndex = foundIdx;
        }

        return (
          <FullScreenViewer
            slides={slides}
            startIndex={startIndex}
            onClose={() => setWorshipViewer(null)}
          />
        );
      })()}

      {openImageUrl && chatImages.length > 0 && (
        <ChatImageGallery
          images={chatImages}
          initialIndex={Math.max(0, openImageIndex)}
          onClose={() => setOpenImageUrl(null)}
          onDownload={downloadChatImage}
        />
      )}

      {chatTab !== 'links' && (
      <div className="p-4 bg-gradient-to-t from-background via-background/80 to-transparent shrink-0">
        {chatTab === 'messages' ? (
        <MessageInput
          chatId={chatId}
          disabled={!online}
          replyToMessage={replyToId ? messages.find(m => m.id === replyToId) : undefined}
          onCancelReply={() => setReplyToId(null)}
          messageActions={{ sendMessage, sendImageMessage }}
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
        ) : (
          <ChatPhotoUploadButton
            chatId={chatId}
            disabled={!online}
            sendImageMessage={sendImageMessage}
          />
        )}
      </div>
      )}

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
