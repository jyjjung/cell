'use client';

import Image from 'next/image';
import { getAppLogo } from '@/lib/app-branding';
import type { CommunityAppId } from '@/lib/app-access';
import { cn } from '@/lib/utils';

export function AppLogo({
  app,
  size = 20,
  className,
}: {
  app: CommunityAppId;
  size?: number;
  className?: string;
}) {
  const { src, alt } = getAppLogo(app);

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-md object-cover', className)}
      unoptimized={src.endsWith('.svg')}
    />
  );
}
