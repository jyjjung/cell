"use client";

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { AvatarData } from '@/types';
import {
  buildDicebearInitialsUrl,
  isNdcpcDefaultAvatarBackground,
} from '@/lib/user-avatars';
import { HAIR_STYLES, ACCESSORIES, OUTFITS, MOUTHS, FACIAL_HAIR_STYLES, BACKGROUNDS, DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import {
  avatarWithoutBrokenImage,
  resolveInitialsDisplaySeed,
  type AvatarNameHint,
} from '@/lib/avatar-utils';
import { cn } from '@/lib/utils';
import { getAvatarTierConfig, HALO_AVATAR_SCALE } from '@/lib/avatar-cosmetics';
import { HaloRing } from '@/components/avatar/halo-ring';

interface PixelAvatarProps {
  avatar?: AvatarData | null;
  className?: string;
  nameHint?: AvatarNameHint;
  /** Halos are Cell-only; pass false for NDC Preschool and other surfaces. */
  showHalo?: boolean;
}

function backgroundCss(backgroundColor?: string): CSSProperties {
  const bg = BACKGROUNDS[backgroundColor || 'blue-gradient'] || BACKGROUNDS['blue-gradient'];
  const stops = bg.stops.map((s) => `${s.color} ${s.offset}`).join(', ');
  return { background: `linear-gradient(to bottom, ${stops})` };
}

function isRemoteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function PixelAvatar({ avatar, className, nameHint, showHalo = true }: PixelAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const retriedRef = useRef(false);
  const normalized = avatarWithoutBrokenImage(avatar);
  // DiceBear remote SVG failed — fall back to the pixel builder.
  // Uploaded photos must NOT look like "Remove Image" (default custom avatar).
  const finalAvatar =
    imageFailed &&
    normalized.mode &&
    normalized.mode !== 'custom' &&
    normalized.mode !== 'image'
      ? { ...normalized, mode: 'custom' as const }
      : normalized;
  const resolved = { ...DEFAULT_AVATAR_DATA, ...finalAvatar };
  const tierConfig = getAvatarTierConfig(resolved.cosmeticTier);
  const haloScale = HALO_AVATAR_SCALE[tierConfig.powerLevel];
  const hasHalo = showHalo && tierConfig.powerLevel > 0;
  const avatarRenderKey = `${resolved.mode}-${resolved.imageUrl ?? ''}-${resolved.cosmeticTier ?? 'none'}-${imageFailed}-${displayImageUrl ?? ''}`;

  useEffect(() => {
    setImageFailed(false);
    retriedRef.current = false;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setDisplayImageUrl(avatar?.mode === 'image' ? (avatar.imageUrl?.trim() || null) : null);
  }, [avatar?.imageUrl, avatar?.mode]);

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  const retryUploadedPhoto = async (url: string) => {
    if (retriedRef.current) {
      setImageFailed(true);
      return;
    }
    retriedRef.current = true;
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' });
      if (!res.ok) throw new Error(`photo ${res.status}`);
      const blob = await res.blob();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const objectUrl = URL.createObjectURL(blob);
      blobUrlRef.current = objectUrl;
      setDisplayImageUrl(objectUrl);
      setImageFailed(false);
    } catch {
      setImageFailed(true);
    }
  };

  const {
    mode,
    seed,
    skinTone,
    hairStyle,
    hairColor,
    outfit,
    accessory,
    outfitColor,
    accessoryColor,
    mouth,
    facialHair,
    facialHairColor,
    backgroundColor,
  } = resolved;

  // CSS gradient (not SVG url(#id)) — CSP blocks same-document SVG paint servers.
  const bgStyle = backgroundCss(backgroundColor);

  const withHalo = (content: ReactNode, extraClassName?: string, style?: CSSProperties) => (
    <div
      key={avatarRenderKey}
      className={cn('relative flex items-center justify-center aspect-square overflow-visible', extraClassName, className)}
    >
      {hasHalo ? (
        <HaloRing preset={tierConfig.stylePreset} powerLevel={tierConfig.powerLevel} />
      ) : null}
      <div
        className={cn(
          'relative z-10 overflow-hidden rounded-full mx-auto',
          !hasHalo && 'h-full w-full',
        )}
        style={{ ...style, width: haloScale, height: haloScale }}
      >
        {content}
      </div>
    </div>
  );

  // Handle custom uploaded image — native img avoids Next/Image domain quirks on Storage URLs.
  if (mode === 'image') {
    const src = displayImageUrl || resolved.imageUrl?.trim() || null;
    if (imageFailed || !src) {
      const letter = resolveInitialsDisplaySeed(resolved, nameHint).charAt(0) || 'U';
      return withHalo(
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-muted/40 text-muted-foreground"
          title="Photo unavailable — open Adjust photo to reload"
        >
          <span className="text-lg font-semibold leading-none">{letter}</span>
        </div>,
      );
    }

    return withHalo(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={() => {
          if (resolved.imageUrl && isRemoteHttpUrl(resolved.imageUrl)) {
            void retryUploadedPhoto(resolved.imageUrl);
            return;
          }
          setImageFailed(true);
        }}
      />,
      undefined,
      bgStyle,
    );
  }

  // Handle generative modes via DiceBear (native img — Next optimizer breaks remote SVG).
  if (mode && mode !== 'custom') {
    if (mode === 'initials') {
      // NDC Preschool default: same muted grey for everyone; letter flips with light/dark.
      if (isNdcpcDefaultAvatarBackground(backgroundColor)) {
        const letter = resolveInitialsDisplaySeed(resolved, nameHint).charAt(0) || 'U';
        return withHalo(
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
            <rect width="40" height="40" fill="hsl(var(--muted))" />
            <text
              x="20"
              y="21"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))"
              style={{ fontSize: 18, fontWeight: 600, fontFamily: 'inherit' }}
            >
              {letter}
            </text>
          </svg>,
        );
      }

      const url = buildDicebearInitialsUrl(resolved, nameHint);
      return withHalo(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
          onError={() => setImageFailed(true)}
        />,
        undefined,
        // DiceBear initials SVG already includes the background color.
        backgroundCss('none'),
      );
    }

    let style = 'pixel-art';
    switch (mode) {
      case 'animal': style = 'croodles'; break;
      case 'landscape': style = 'shapes'; break;
      case 'robot': style = 'bottts'; break;
      case 'pixel-art': style = 'pixel-art'; break;
    }

    const seedToUse = seed || 'spark';
    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}&backgroundColor=transparent`;

    return withHalo(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={url}
        src={url}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
        onError={() => setImageFailed(true)}
      />,
      undefined,
      bgStyle,
    );
  }

  // Custom pixel builder — face drawn in SVG; background is CSS (CSP-safe).
  const hair = HAIR_STYLES[hairStyle || 'short'] || HAIR_STYLES['none'];
  const accessoryPaths = ACCESSORIES[accessory || 'none'] || ACCESSORIES['none'];
  const outfitPaths = OUTFITS[outfit || 'tshirt'] || OUTFITS['tshirt'];
  const mouthPaths = MOUTHS[mouth || 'smile'] || MOUTHS['none'];
  const facialHairPaths = FACIAL_HAIR_STYLES[facialHair || 'none'] || FACIAL_HAIR_STYLES['none'];

  return withHalo(
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className="h-full w-full"
      aria-hidden
    >
      {/* Base Head */}
      <path d="M7 6H17V16H7V6Z" fill={skinTone} />

      {/* Mouth */}
      <g fill="#111111">
        {mouthPaths.paths.map((path, i) => <path key={`mouth-${i}`} d={path} />)}
      </g>

      {/* Facial Hair */}
      <g fill={facialHairColor}>
        {facialHairPaths.paths.map((path, i) => <path key={`facial-hair-${i}`} d={path} />)}
      </g>

      {/* Outfit */}
      <g fill={outfitColor || '#D95763'}>
        {outfitPaths.paths.map((path, i) => <path key={`outfit-${i}`} d={path} />)}
      </g>

      {/* Neck */}
      <path d="M10 16H14V17H10V16Z" fill={skinTone} />

      {/* Eyes */}
      <g fill="#111111">
        <path d="M9 10H11V11H9V10Z" />
        <path d="M13 10H15V11H13V10Z" />
      </g>

      {/* Hair */}
      <g fill={hairColor}>
        {hair.paths.map((path, i) => <path key={`hair-${i}`} d={path} />)}
      </g>

      {/* Accessory */}
      <g fill={accessoryColor || '#222222'}>
        {accessoryPaths.paths.map((path, i) => <path key={`accessory-${i}`} d={path} />)}
      </g>
    </svg>,
    undefined,
    bgStyle,
  );
}
