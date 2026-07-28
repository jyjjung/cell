"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImageIcon, Loader2 } from 'lucide-react';
import { useChats } from '@/hooks/useChats';
import { useAllUsers, useUsersById } from '@/hooks/use-all-users';
import { useAllChatMessages } from '@/hooks/use-all-chat-messages';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { getChatDisplayDetails } from '@/lib/chat-utils';
import { extractChatPhotos, type ChatPhoto } from '@/lib/chat-media-extract';
import { NavPageHeader } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { ChatImageGallery } from '@/components/chat/ImageLightbox';
import { RemoteImage } from '@/components/ui/remote-image';
import { downloadChatImage } from '@/lib/chat-image-download';
import { primeMediaUrls } from '@/lib/media-cache';

type GlobalPhoto = ChatPhoto & {
  chatId: string;
  chatName: string;
};

const INITIAL_VISIBLE = 60;

export default function AllChatPhotosPage() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { chats, loading: loadingChats } = useChats();
  const { allUsers } = useAllUsers();
  const usersById = useUsersById();
  const chatIds = useMemo(() => chats.map((c) => c.id), [chats]);
  const { messagesByChatId, loading: loadingMessages } = useAllChatMessages(chatIds);
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

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

  useEffect(() => {
    const urls = photos.slice(0, INITIAL_VISIBLE).map((p) => p.imageUrl);
    if (urls.length) primeMediaUrls(urls);
  }, [photos]);

  const visiblePhotos = photos.slice(0, visibleCount);
  const imageUrls = useMemo(() => photos.map((p) => p.imageUrl), [photos]);
  const openImageIndex = openImageUrl ? imageUrls.indexOf(openImageUrl) : 0;
  const loading = loadingChats || (chatIds.length > 0 && loadingMessages && photos.length === 0);

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
        <div className="empty-inline py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="empty-inline">
          <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">{t.noPhotosYet}</p>
          <p className="text-micro-label mt-1">{t.photosSharedHint}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {visiblePhotos.map((photo) => (
              <button
                key={`${photo.chatId}-${photo.id}`}
                type="button"
                onClick={() => setOpenImageUrl(photo.imageUrl)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border/30 bg-muted/30"
              >
                <RemoteImage
                  src={photo.imageUrl}
                  alt={`Photo from ${photo.chatName}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="200px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[9px] font-bold text-white">{photo.chatName}</p>
                  <p className="truncate text-[8px] text-white/70">{photo.senderLabel}</p>
                </div>
              </button>
            ))}
          </div>
          {visibleCount < photos.length && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={() => {
                  const next = Math.min(visibleCount + INITIAL_VISIBLE, photos.length);
                  primeMediaUrls(photos.slice(visibleCount, next).map((p) => p.imageUrl));
                  setVisibleCount(next);
                }}
              >
                Show more
              </Button>
            </div>
          )}
        </>
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
