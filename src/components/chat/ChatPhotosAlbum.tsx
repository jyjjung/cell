"use client";

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types';
import type { UserProfileData } from '@/types';
import { extractChatPhotos } from '@/lib/chat-media-extract';
import { RemoteImage } from '@/components/ui/remote-image';
import {
  chatMessagesCollection,
  readAllMessagesFromDeviceCache,
} from '@/lib/chat-messages-device-cache';
import { primeMediaUrls } from '@/lib/media-cache';

export { extractChatPhotos } from '@/lib/chat-media-extract';

export default function ChatPhotosAlbum({
  chatId,
  messages,
  allUsers,
  onOpenImage,
}: {
  chatId: string;
  messages: ChatMessage[];
  allUsers: UserProfileData[];
  onOpenImage: (imageUrl: string) => void;
}) {
  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.uid, u])),
    [allUsers],
  );

  const [cachedMessages, setCachedMessages] = useState<ChatMessage[]>([]);
  const [loadingCache, setLoadingCache] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingCache(true);
    void readAllMessagesFromDeviceCache(chatMessagesCollection(chatId)).then((cached) => {
      if (cancelled) return;
      setCachedMessages(cached);
      setLoadingCache(false);
      const urls = cached
        .filter((m) => m.imageUrl && !m.songId && !m.isDeleted)
        .map((m) => m.imageUrl!)
        .slice(0, 80);
      if (urls.length) primeMediaUrls(urls);
    }).catch(() => {
      if (!cancelled) setLoadingCache(false);
    });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const albumMessages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of cachedMessages) byId.set(m.id, m);
    for (const m of messages) byId.set(m.id, m);
    return Array.from(byId.values());
  }, [cachedMessages, messages]);

  const photos = useMemo(
    () => extractChatPhotos(albumMessages, usersById),
    [albumMessages, usersById],
  );

  if (loadingCache && photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[40vh] px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[40vh] px-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center mb-4">
          <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold text-foreground">No photos yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
          Photos shared in this chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-w-3xl mx-auto">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpenImage(photo.imageUrl)}
            className="relative aspect-square overflow-hidden rounded-xl bg-muted/30 border border-border/30 group"
          >
            <RemoteImage
              src={photo.imageUrl}
              alt={`Photo by ${photo.senderLabel}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="200px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[9px] font-bold text-white truncate">{photo.senderLabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
