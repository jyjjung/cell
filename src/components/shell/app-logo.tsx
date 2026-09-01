'use client';

import Image from 'next/image';
import { getAppLogo } from '@/lib/app-branding';
import type { CommunityAppId } from '@/lib/app-access';
import { cn } from '@/lib/utils';

export function AppLogo({
  app,
  size = 20,
  className,
  fit = 'cover',
}: {
  app: CommunityAppId;
  size?: number;
  className?: string;
  /** contain shows the full logo without cropping (header switcher). */
  fit?: 'cover' | 'contain';
}) {
  const { src, alt } = getAppLogo(app);

  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-lg', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className={fit === 'contain' ? 'object-contain' : 'object-cover'}
        unoptimized={src.endsWith('.svg')}
      />
    </div>
  );
}
