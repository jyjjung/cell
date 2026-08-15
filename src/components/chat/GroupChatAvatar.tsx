"use client";

import { useEffect } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { primeMediaUrl } from '@/lib/media-cache';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { RemoteImage } from '@/components/ui/remote-image';
import type { AvatarData } from '@/types';

type GroupChatAvatarProps = {
  photoURL?: string | null;
  avatar?: AvatarData | null;
  className?: string;
  iconClassName?: string;
  active?: boolean;
  showHalo?: boolean;
};

/** Group list/header avatar: custom photo, else default Users icon. Pass avatar for DMs. */
export function GroupChatAvatar({
  photoURL,
  avatar,
  className,
  iconClassName,
  active,
  showHalo = true,
}: GroupChatAvatarProps) {
  useEffect(() => {
    primeMediaUrl(photoURL);
  }, [photoURL]);

  if (avatar) {
    return <PixelAvatar avatar={avatar} className={className} showHalo={showHalo} />;
  }

  if (photoURL) {
    return (
      <div className={cn('relative h-full w-full', className)}>
        <RemoteImage
          src={photoURL}
          alt=""
          fill
          className="rounded-full object-cover"
          sizes="48px"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full',
        active ? 'bg-primary-foreground/10' : 'bg-primary/5',
        className,
      )}
    >
      <Users
        className={cn(
          'h-5 w-5',
          active ? 'text-primary-foreground' : 'text-primary/60',
          iconClassName,
        )}
      />
    </div>
  );
}
