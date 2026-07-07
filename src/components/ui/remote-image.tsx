'use client';

import Image from 'next/image';
import type { CSSProperties, SyntheticEvent } from 'react';
import { cn } from '@/lib/utils';

type RemoteImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
  draggable?: boolean;
  onError?: () => void;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

export function RemoteImage({
  src,
  alt,
  className,
  width,
  height,
  fill = false,
  sizes,
  priority,
  style,
  draggable,
  onError,
  onLoad,
}: RemoteImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes ?? '100vw'}
        className={className}
        style={style}
        priority={priority}
        draggable={draggable}
        onError={onError}
        onLoad={onLoad}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 48}
      height={height ?? 48}
      unoptimized
      sizes={sizes}
      className={cn(className)}
      style={style}
      priority={priority}
      draggable={draggable}
      onError={onError}
      onLoad={onLoad}
    />
  );
}
