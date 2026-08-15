
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useAllUsers, useUsersById } from '@/hooks/use-all-users';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useMessages } from '@/hooks/useMessages';
import { useChatPhotoMessages } from '@/hooks/use-chat-photo-messages';
import { getLastSeenNamesPerMessage, getMemberDisplayName, resolveChatAvatar, chatBelongsToApp, chatHrefForApp } from '@/lib/chat-utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { ChevronLeft, Images, Info, Link2, Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useWorshipData, WorshipDataProvider } from '@/contexts/worship-data-context';
import { downloadChatImage } from '@/lib/chat-image-download';
import { translations } from '@/lib/translations';
import { primeChatPreviewMedia } from '@/lib/media-cache';
import { getReferenceTracks, resolveChordSheetsForSetlistSong } from '@/lib/worship-utils';
import type { ChatMemberInfo, WorshipSong } from '@/types';
import { Button } from '../ui/button';
import type { ViewerSlide } from '../worship/viewer-types';
import ChatLinksList, { extractChatLinks } from './ChatLinksList';
import ChatMessageList from './ChatMessageList';
import ChatPhotosAlbum, { extractChatPhotos } from './ChatPhotosAlbum';
import { GroupChatAvatar } from './GroupChatAvatar';
import GroupSettingsDialog from './GroupSettingsDialog';
import { ChatImageGallery } from './ImageLightbox';
import MessageInput from './MessageInput';
import ThreadWindow from './ThreadWindow';
import { syncChatDocMembers } from '@/hooks/use-docs';

const FullScreenViewer = dynamic(
  () => import('../worship/FullScreenViewer').then((m) => m.FullScreenViewer),
  { ssr: false },
);
const NewSongDialog = dynamic(
  () => import('../worship/WorshipDialogs').then((m) => m.NewSongDialog),
  { ssr: false },
);
const NewSetlistDialog = dynamic(
  () => import('../worship/WorshipDialogs').then((m) => m.NewSetlistDialog),
  { ssr: false },
);
const NewRosterDialog = dynamic(
  () => import('../worship/WorshipDialogs').then((m) => m.NewRosterDialog),
  { ssr: false },
);
const AddChordSheetDialog = dynamic(
  () => import('../worship/WorshipDialogs').then((m) => m.AddChordSheetDialog),
  { ssr: false },
);
export default function ChatWindow({
  chatId,
  backHref = '/cell/chat',
}: {
  chatId: string;
  backHref?: string;
}) {
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
        backHref={backHref}
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
  backHref,
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
  backHref: string;
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
    votePoll,
    setPollResultsLocked,
    sendMessage,
    sendImageMessage,
    deleteMessage,
  } = messageState;
  const worshipData = useWorshipData();
  const router = useRouter();
  const pathname = usePathname();
  const setlists = worshipData?.setlists ?? [];
  const songs = worshipData?.songs ?? [];
  const { currentUser } = useAuth();
  const { allUsers } = useAllUsers();
  const usersById = useUsersById();
  const online = useOnlineStatus();
  const isInitialLoad = useRef(true);
  const seenDebounceRef = useRef<number | null>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<'messages' | 'photos' | 'links'>('messages');
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

  const routeApp: 'cell' | 'ndcpc' = pathname.startsWith('/ndcpc/') ? 'ndcpc' : 'cell';

  // Keep em. and Preschool chats on their own URL trees.
  useEffect(() => {
    if (!chat) return;
    if (chatBelongsToApp(chat, routeApp)) return;
    const correctApp = chat.appScope === 'ndcpc' ? 'ndcpc' : 'cell';
    router.replace(chatHrefForApp(chatId, correctApp));
  }, [chat, chatId, routeApp, router]);

  const photosEnabled = chatTab === 'photos';
  const { photoMessages, loadingMore: loadingMorePhotos } = useChatPhotoMessages(
    chatId,
    photosEnabled,
    messages,
  );

  const photoCount = useMemo(
    () => extractChatPhotos(photoMessages.length > 0 ? photoMessages : messages, usersById).length,
    [photoMessages, messages, usersById],
  );

  const linkCount = useMemo(
    () => extractChatLinks(messages, usersById).length,
    [messages, usersById],
  );

  const t = translations[currentUser?.preferredLanguage || 'en'];
  const blockingLoad = loadingMessages && messages.length === 0;

  const newestMessageId = messages[0]?.id ?? null;

  useEffect(() => {
    if (!chatId || !newestMessageId) return;

    const markSeen = () => {
      lastSeenMessageIdRef.current = newestMessageId;
      updateSeenTimestamp();
    };

    const alreadyMarked = lastSeenMessageIdRef.current === newestMessageId;
    const delay = lastSeenMessageIdRef.current === null ? 500 : 8_000;

    if (!alreadyMarked) {
      if (seenDebounceRef.current) window.clearTimeout(seenDebounceRef.current);
      seenDebounceRef.current = window.setTimeout(markSeen, delay);
    }

    // Only re-write on tab return when there is a newer message than last marked.
    // Avoids a Firestore write on every focus flip while already caught up.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (lastSeenMessageIdRef.current === newestMessageId) return;
      markSeen();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (seenDebounceRef.current) window.clearTimeout(seenDebounceRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [chatId, newestMessageId, updateSeenTimestamp]);

  // Reset seen tracking when switching chats.
  useEffect(() => {
    lastSeenMessageIdRef.current = null;
  }, [chatId]);

  // Membership sync once per chat per browser session (role/circle member drift).
  // Doc ACL for newly posted docs is written on share/create (PATCH/POST) —
  // avoid /api/docs/ensure-chat-share on every open (Vercel Fluid CPU).
  useEffect(() => {
    if (!chatId || !currentUser || typeof window === 'undefined') return;
    const key = `docs-chat-sync:${chatId}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    const timer = window.setTimeout(() => {
      void syncChatDocMembers(chatId).catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [chatId, currentUser]);

  useEffect(() => {
    if (chatTab !== 'photos') return;
    // Warm SW cache for album thumbs only — full originals download when opened.
    primeChatPreviewMedia(photoMessages);
  }, [chatTab, photoMessages]);

  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      isInitialLoad.current = false;
    }
  }, [messages]);

  const lastSeenNamesPerMessage = useMemo(() => {
    if (!chat?.memberSeen || !messages.length || !allUsers.length || !currentUser) return {};

    return getLastSeenNamesPerMessage({
      messages,
      memberSeen: chat.memberSeen,
      members: chat.members,
      currentUserId: currentUser.uid,
      getDisplayName: (uid) => formatUserDisplayName(usersById.get(uid)),
    });
  }, [chat?.memberSeen, chat?.members, messages, usersById, currentUser, allUsers.length]);

  const chatDetails = useMemo(() => {
    if (!chat || !currentUser || !allUsers) return { name: 'Chat', avatar: null, photoURL: null as string | null };
    if (chat.type === 'private') {
      const peerId = chat.members.find(id => id !== currentUser.uid);
      if (!peerId) return { name: 'Private Chat', avatar: null, photoURL: null };

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
        avatar: resolveChatAvatar(peerProfile, peerInfoFromChat, chat.appScope),
        photoURL: null,
      };
    }
    return { name: chat.name || 'Unnamed Circle', avatar: null, photoURL: chat.photoURL || null };
  }, [chat, currentUser, allUsers]);

  const chatImages = useMemo(() => {
    const source = photoMessages.length > 0 ? photoMessages : messages;
    return [...source]
      .filter((m) => m.imageUrl && !m.songId && !m.isDeleted)
      .reverse()
      .map((m) => m.imageUrl!);
  }, [photoMessages, messages]);

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
  }, [setWorshipViewer]);

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
          ? {
              firstName: senderProfile.firstName,
              lastName: senderProfile.lastName,
              avatar: resolveChatAvatar(senderProfile, senderInfoFromChat, chat.appScope) as any,
            }
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
        <h2 className="text-section-title mb-4">{t.circleCommand}</h2>
        <Button asChild variant="outline" className="h-14 px-12 rounded-2xl font-semibold text-micro-label">
          <Link href={backHref}>{t.returnToList}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
      <header
        className="flex-shrink-0 grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 py-4 px-6 border-b border-border/50 bg-background z-20"
        style={{ touchAction: 'none' }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(backHref)}
          className="h-10 w-10 rounded-full bg-muted/20 hover:bg-muted/40"
          aria-label={t.back}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-muted border border-border shadow-sm overflow-hidden">
            <GroupChatAvatar
              avatar={chatDetails.avatar}
              photoURL={chatDetails.photoURL}
              showHalo={chat?.appScope !== 'ndcpc'}
            />
          </div>
          <h1 className="text-micro-label font-semibold text-foreground truncate">{chatDetails.name}</h1>
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

      <div
        data-chat-tabs=""
        className="flex-shrink-0 flex gap-1 px-4 py-2 border-b border-border/30 bg-background"
        style={{ touchAction: 'none' }}
      >
        <button
          type="button"
          onClick={() => setChatTab('messages')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-micro-label font-semibold transition-all ${
            chatTab === 'messages'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t.messagesTab}
        </button>
        <button
          type="button"
          onClick={() => setChatTab('photos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-micro-label font-semibold transition-all ${
            chatTab === 'photos'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <Images className="h-3.5 w-3.5" />
          {t.photosTab}{photoCount > 0 ? ` (${photoCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setChatTab('links')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-micro-label font-semibold transition-all ${
            chatTab === 'links'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          {t.linksTab}{linkCount > 0 ? ` (${linkCount})` : ''}
        </button>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {chatTab === 'messages' ? (
          <ChatMessageList
            messages={messages}
            chat={chat}
            usersById={usersById}
            sendersByUserId={sendersByUserId}
            messagesById={messagesById}
            lastSeenNamesPerMessage={lastSeenNamesPerMessage}
            toggleReaction={toggleReaction}
            votePoll={votePoll}
            setPollResultsLocked={setPollResultsLocked}
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
            messages={photoMessages.length > 0 ? photoMessages : messages}
            allUsers={allUsers}
            onOpenImage={setOpenImageUrl}
            loadingMore={loadingMorePhotos}
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

          if (slides.length === 0) return null;

          let startIndex = 0;
          if (worshipViewer.songId) {
            const ps = setlist.songs.find((s) => s.songId === worshipViewer.songId);
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
              mode="continuous"
              title={setlist.name}
            />
          );
        }
        
        if (worshipViewer.songId) {
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
        if (worshipViewer.imageUrl) {
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

      {chatTab === 'messages' && (
      <div className="mt-auto shrink-0 bg-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <MessageInput
          chatId={chatId}
          disabled={!online}
          replyToMessage={replyToId ? messages.find(m => m.id === replyToId) : undefined}
          onCancelReply={() => setReplyToId(null)}
          messageActions={{ sendMessage, sendImageMessage }}
        />
      </div>
      )}

      {showNewSong && (
        <NewSongDialog
          open={showNewSong}
          onClose={() => setShowNewSong(false)}
          onCreated={() => {
            // Could optionally send a message about the new song
          }}
        />
      )}
      {showNewSetlist && (
        <NewSetlistDialog
          open={showNewSetlist}
          onClose={() => setShowNewSetlist(false)}
          onCreated={(id) => {
            // Automatically share the new setlist in chat
            sendMessage(undefined, undefined, undefined, undefined, id);
          }}
        />
      )}
      {showNewRoster && (
        <NewRosterDialog
          open={showNewRoster}
          onClose={() => setShowNewRoster(false)}
          onCreated={(id) => {
            // Automatically share the new roster in chat
            sendMessage(undefined, undefined, undefined, undefined, undefined, id);
          }}
        />
      )}
      {addSheetSong && (
        <AddChordSheetDialog
          open={!!addSheetSong}
          song={addSheetSong}
          onClose={() => setAddSheetSong(null)}
        />
      )}

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
