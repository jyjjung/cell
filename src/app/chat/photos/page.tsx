"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { useChats } from '@/hooks/useChats';
import { useAllUsers, useUsersById } from '@/hooks/use-all-users';
import { useAllChatMessages } from '@/hooks/use-all-chat-messages';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { getChatDisplayDetails } from '@/lib/chat-utils';
import { extractChatPhotos, type ChatPhoto } from '@/lib/chat-media-extract';
import { EmptyState, NavPageHeader } from '@/components/ui/page-layout';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { ChatImageGallery } from '@/components/chat/ImageLightbox';
import { RemoteImage } from '@/components/ui/remote-image';
import { downloadChatImage } from '@/lib/chat-image-download';

type GlobalPhoto = ChatPhoto & {
  chatId: string;
  chatName: string;
};

export default function AllChatPhotosPage() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const usersById = useUsersById();
  const chatIds = useMemo(() => chats.map((c) => c.id), [chats]);
  const { messagesByChatId, loading: loadingMessages } = useAllChatMessages(chatIds);
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

  const photos = useMemo(() => {
    if (!currentUser) return [];

    const items: GlobalPhoto[] = [];

    for (const chat of chats) {
      const details = getChatDisplayDetails(chat, currentUser.uid, allUsers);
      if (!details) continue;

      const messages = messagesByChatId[chat.id] ?? [];
      const chatPhotos = extractChatPhotos(messages, usersById);

      for (const photo of chatPhotos) {
        items.push({
          ...photo,
          chatId: chat.id,
          chatName: details.name,
        });
      }
    }

    return items.sort(
      (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
    );
  }, [chats, messagesByChatId, usersById, allUsers, currentUser]);

  const imageUrls = useMemo(() => photos.map((p) => p.imageUrl), [photos]);
  const openImageIndex = openImageUrl ? imageUrls.indexOf(openImageUrl) : 0;
  const loading = loadingChats || (chatIds.length > 0 && loadingMessages);

  return (
    <div className="page-container">
      <NavPageHeader
        action={
          <Button asChild variant="outline" className="h-8 rounded-lg px-3 text-sm">
            <Link href="/chat">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <ListLoadingSkeleton />
      ) : photos.length === 0 ? (
        <EmptyState icon={ImageIcon} title={t.noPhotosYet} description={t.photosSharedHint} />
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {photos.map((photo) => (
            <Button
              key={`${photo.chatId}-${photo.id}`}
              type="button"
              variant="ghost"
              onClick={() => setOpenImageUrl(photo.imageUrl)}
              className="group relative aspect-square h-auto w-full overflow-hidden rounded-xl border border-border/30 bg-muted/30 p-0 [content-visibility:auto] [contain-intrinsic-size:120px]"
            >
              <RemoteImage
                src={photo.thumbUrl || photo.imageUrl}
                alt={`Photo from ${photo.chatName}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="200px"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-[9px] font-bold text-white">{photo.chatName}</p>
                <p className="truncate text-[8px] text-white/70">{photo.senderLabel}</p>
              </div>
            </Button>
          ))}
        </div>
      )}

      {openImageUrl && imageUrls.length > 0 && (
        <ChatImageGallery
          images={imageUrls}
          initialIndex={Math.max(0, openImageIndex)}
          onClose={() => setOpenImageUrl(null)}
          onDownload={downloadChatImage}
        />
      )}
    </div>
  );
}
