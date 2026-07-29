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
  /** Force Next optimizer on/off. Default: auto (safe hosts only). */
  optimize?: boolean;
};

/** Prefer unoptimized for signed Storage URLs and remote SVGs (DiceBear). */
function shouldOptimizeRemoteUrl(src: string): boolean {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (src.startsWith('/')) return true;
  try {
    const { hostname, pathname } = new URL(src);
    // DiceBear serves SVG — Next's optimizer often fails on remote SVG and shows a broken icon.
    if (hostname === 'api.dicebear.com') return false;
    if (pathname.toLowerCase().endsWith('.svg')) return false;
    if (hostname === 'img.youtube.com' || hostname === 'i.ytimg.com') return true;
    if (hostname === 'www.google.com' || hostname.endsWith('.google.com')) return true;
    if (hostname === 'picsum.photos') return true;
    return false;
  } catch {
    return false;
  }
}

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
  optimize,
}: RemoteImageProps) {
  const unoptimized = !(optimize ?? shouldOptimizeRemoteUrl(src));

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized={unoptimized}
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
      unoptimized={unoptimized}
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
