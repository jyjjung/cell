"use client";

import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/page-layout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ImageIcon } from 'lucide-react';
import type { ChatMessage } from '@/types';
import type { UserProfileData } from '@/types';
import { extractChatPhotos } from '@/lib/chat-media-extract';
import { RemoteImage } from '@/components/ui/remote-image';
import { primeChatPreviewMedia } from '@/lib/media-cache';

export { extractChatPhotos } from '@/lib/chat-media-extract';

export default function ChatPhotosAlbum({
  messages,
  allUsers,
  onOpenImage,
  loadingMore = false,
}: {
  messages: ChatMessage[];
  allUsers: UserProfileData[];
  onOpenImage: (imageUrl: string) => void;
  loadingMore?: boolean;
}) {
  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.uid, u])),
    [allUsers],
  );

  const photos = useMemo(
    () => extractChatPhotos(messages, usersById),
    [messages, usersById],
  );

  useEffect(() => {
    // Prefetch thumbs for the grid; full images load when tapped.
    primeChatPreviewMedia(photos.map((p) => ({ imageUrl: p.imageUrl, imageThumbUrl: p.thumbUrl })));
  }, [photos]);

  if (photos.length === 0 && !loadingMore) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No photos yet"
        description="Photos shared in this chat will appear here."
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-w-3xl mx-auto">
        {photos.map((photo) => (
          <Button
            key={photo.id}
            type="button"
            variant="ghost"
            onClick={() => onOpenImage(photo.imageUrl)}
            className="relative aspect-square h-auto w-full overflow-hidden rounded-xl bg-muted/30 border border-border/30 group [content-visibility:auto] [contain-intrinsic-size:120px]"
          >
            <RemoteImage
              src={photo.thumbUrl || photo.imageUrl}
              alt={`Photo by ${photo.senderLabel}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="200px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[9px] font-bold text-white truncate">{photo.senderLabel}</p>
            </div>
          </Button>
        ))}
      </div>
      {loadingMore && (
        <div className="flex justify-center py-4" aria-live="polite">
          <LoadingSpinner size="sm" className="text-muted-foreground/60" />
        </div>
      )}
    </div>
  );
}
