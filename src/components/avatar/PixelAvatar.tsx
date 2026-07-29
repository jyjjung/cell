"use client";

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import type { AvatarData } from '@/types';
import { HAIR_STYLES, ACCESSORIES, OUTFITS, MOUTHS, FACIAL_HAIR_STYLES, BACKGROUNDS, DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { avatarWithoutBrokenImage, resolveInitialsDisplaySeed, type AvatarNameHint } from '@/lib/avatar-utils';
import { cn } from '@/lib/utils';
import { getAvatarTierConfig, HALO_AVATAR_SCALE } from '@/lib/avatar-cosmetics';
import { HaloRing } from '@/components/avatar/halo-ring';

interface PixelAvatarProps {
  avatar?: AvatarData | null;
  className?: string;
  nameHint?: AvatarNameHint;
}

function backgroundCss(backgroundColor?: string): CSSProperties {
  const bg = BACKGROUNDS[backgroundColor || 'blue-gradient'] || BACKGROUNDS['blue-gradient'];
  const stops = bg.stops.map((s) => `${s.color} ${s.offset}`).join(', ');
  return { background: `linear-gradient(to bottom, ${stops})` };
}

export function PixelAvatar({ avatar, className, nameHint }: PixelAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalized = avatarWithoutBrokenImage(avatar);
  // Uploaded photo or DiceBear SVG failed — fall back to the pixel builder.
  const finalAvatar = imageFailed && normalized.mode && normalized.mode !== 'custom'
    ? { ...normalized, mode: 'custom' as const }
    : normalized;
  const resolved = { ...DEFAULT_AVATAR_DATA, ...finalAvatar };
  const tierConfig = getAvatarTierConfig(resolved.cosmeticTier);
  const haloScale = HALO_AVATAR_SCALE[tierConfig.powerLevel];
  const hasHalo = tierConfig.powerLevel > 0;
  const avatarRenderKey = `${resolved.mode}-${resolved.imageUrl ?? ''}-${resolved.cosmeticTier ?? 'none'}-${imageFailed}`;

  useEffect(() => {
    setImageFailed(false);
  }, [avatar?.imageUrl, avatar?.mode]);

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
    return withHalo(
      resolved.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={resolved.imageUrl}
          src={resolved.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
          <span className="text-micro-label">No image</span>
        </div>
      ),
      undefined,
      bgStyle,
    );
  }

  // Handle generative modes via DiceBear (native img — Next optimizer breaks remote SVG).
  if (mode && mode !== 'custom') {
    let style = 'pixel-art';
    switch (mode) {
      case 'initials': style = 'initials'; break;
      case 'animal': style = 'croodles'; break;
      case 'landscape': style = 'shapes'; break;
      case 'robot': style = 'bottts'; break;
      case 'pixel-art': style = 'pixel-art'; break;
    }

    const seedToUse = mode === 'initials'
      ? resolveInitialsDisplaySeed(resolved, nameHint)
      : (seed || 'spark');
    // Initials style needs DiceBear's own background for readable contrast.
    const url = mode === 'initials'
      ? `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}`
      : `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}&backgroundColor=transparent`;

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
