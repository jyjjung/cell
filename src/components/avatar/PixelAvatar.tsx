
"use client";

import type { CSSProperties, ReactNode } from 'react';
import type { AvatarData } from '@/types';
import { HAIR_STYLES, ACCESSORIES, OUTFITS, MOUTHS, FACIAL_HAIR_STYLES, BACKGROUNDS, DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { cn } from '@/lib/utils';
import { getAvatarTierConfig } from '@/lib/avatar-cosmetics';

interface PixelAvatarProps {
  avatar?: AvatarData | null;
  className?: string;
}

export function PixelAvatar({ avatar, className }: PixelAvatarProps) {
  const finalAvatar = { ...DEFAULT_AVATAR_DATA, ...(avatar || {}) };
  const tierConfig = getAvatarTierConfig(finalAvatar.cosmeticTier);

  const { 
    mode,
    seed,
    initials,
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
    backgroundColor
  } = finalAvatar;

  const bg = BACKGROUNDS[backgroundColor || 'blue-gradient'] || BACKGROUNDS['blue-gradient'];
  const stops = bg.stops.map(s => `${s.color} ${s.offset}`).join(', ');
  const bgStyle = { background: `linear-gradient(to bottom, ${stops})` };

  const renderHalo = () => {
    if (tierConfig.id === 'none') return null;

    switch (tierConfig.stylePreset) {
      case 'ember':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.55),transparent_58%),radial-gradient(circle_at_82%_82%,rgba(249,115,22,0.52),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.3),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_210deg,rgba(251,191,36,0.96),rgba(249,115,22,0.9),rgba(253,186,116,0.96),rgba(234,88,12,0.9),rgba(251,191,36,0.96))] opacity-90" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
          </>
        );
      case 'lunar':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_80%_20%,rgba(226,232,240,0.56),transparent_58%),radial-gradient(circle_at_20%_80%,rgba(148,163,184,0.5),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(226,232,240,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_205deg,rgba(226,232,240,0.95),rgba(148,163,184,0.88),rgba(248,250,252,0.95),rgba(203,213,225,0.88),rgba(226,232,240,0.95))]" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
            <span className="pointer-events-none absolute inset-[9%] rounded-[inherit] z-0 border border-white/40 dark:border-white/30" />
          </>
        );
      case 'aurora':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_22%_78%,rgba(99,102,241,0.5),transparent_58%),radial-gradient(circle_at_78%_24%,rgba(250,204,21,0.54),transparent_58%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(167,139,250,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_205deg,rgba(253,224,71,0.96),rgba(167,139,250,0.9),rgba(250,204,21,0.96),rgba(99,102,241,0.9),rgba(253,224,71,0.96))] opacity-90" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
            <span className="pointer-events-none absolute inset-[9%] rounded-[inherit] z-0 border border-yellow-200/30 dark:border-indigo-200/30" />
          </>
        );
      case 'cosmic':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.46),transparent_58%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.42),transparent_58%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_225deg,rgba(103,232,249,0.96),rgba(59,130,246,0.9),rgba(147,197,253,0.96),rgba(6,182,212,0.92),rgba(103,232,249,0.96))] animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.45)]" />
            <span className="pointer-events-none absolute inset-[12%] rounded-[inherit] z-0 bg-background/75" />
            <span className="pointer-events-none absolute inset-[8.8%] rounded-[inherit] z-0 border border-cyan-200/38 dark:border-cyan-100/33" />
          </>
        );
      case 'blossom':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_25%_20%,rgba(251,113,133,0.5),transparent_58%),radial-gradient(circle_at_78%_82%,rgba(244,63,94,0.46),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(253,164,175,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_200deg,rgba(251,113,133,0.95),rgba(244,63,94,0.9),rgba(253,186,186,0.95),rgba(225,29,72,0.9),rgba(251,113,133,0.95))] opacity-90" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
          </>
        );
      case 'verdant':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_22%_78%,rgba(52,211,153,0.48),transparent_58%),radial-gradient(circle_at_78%_22%,rgba(34,197,94,0.46),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(74,222,128,0.26),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_190deg,rgba(52,211,153,0.95),rgba(34,197,94,0.9),rgba(134,239,172,0.95),rgba(22,163,74,0.9),rgba(52,211,153,0.95))] opacity-90" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
            <span className="pointer-events-none absolute inset-[9%] rounded-[inherit] z-0 border border-emerald-200/35 dark:border-emerald-100/30" />
          </>
        );
      case 'crimson':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_30%_25%,rgba(239,68,68,0.5),transparent_58%),radial-gradient(circle_at_72%_75%,rgba(185,28,28,0.48),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(248,113,113,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_215deg,rgba(239,68,68,0.96),rgba(185,28,28,0.9),rgba(252,165,165,0.96),rgba(153,27,27,0.9),rgba(239,68,68,0.96))] opacity-92" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
          </>
        );
      case 'ocean':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_25%_30%,rgba(37,99,235,0.5),transparent_58%),radial-gradient(circle_at_75%_70%,rgba(29,78,216,0.48),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(96,165,250,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_220deg,rgba(59,130,246,0.96),rgba(29,78,216,0.9),rgba(147,197,253,0.96),rgba(30,64,175,0.9),rgba(59,130,246,0.96))] opacity-92" />
            <span className="pointer-events-none absolute inset-[12.5%] rounded-[inherit] z-0 bg-background/74" />
            <span className="pointer-events-none absolute inset-[9%] rounded-[inherit] z-0 border border-blue-200/35 dark:border-blue-100/30" />
          </>
        );
      case 'violet':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_28%_22%,rgba(167,139,250,0.5),transparent_58%),radial-gradient(circle_at_74%_78%,rgba(124,58,237,0.48),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(196,181,253,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_225deg,rgba(167,139,250,0.96),rgba(124,58,237,0.9),rgba(221,214,254,0.96),rgba(109,40,217,0.9),rgba(167,139,250,0.96))] animate-pulse shadow-[0_0_18px_rgba(167,139,250,0.45)]" />
            <span className="pointer-events-none absolute inset-[12%] rounded-[inherit] z-0 bg-background/75" />
          </>
        );
      case 'stellar':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(254,240,138,0.55),transparent_58%),radial-gradient(circle_at_70%_80%,rgba(250,250,250,0.42),transparent_56%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(253,224,71,0.3),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_200deg,rgba(254,240,138,0.98),rgba(250,204,21,0.92),rgba(255,255,255,0.95),rgba(234,179,8,0.9),rgba(254,240,138,0.98))] shadow-[0_0_22px_rgba(250,204,21,0.45)]" />
            <span className="pointer-events-none absolute inset-[12%] rounded-[inherit] z-0 bg-background/76" />
            <span className="pointer-events-none absolute inset-[8.8%] rounded-[inherit] z-0 border border-yellow-100/50 dark:border-yellow-50/35" />
          </>
        );
      case 'ethereal':
        return (
          <>
            <span className="pointer-events-none absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle_at_25%_25%,rgba(244,114,182,0.44),transparent_58%),radial-gradient(circle_at_75%_78%,rgba(147,51,234,0.46),transparent_58%)] blur-[2px]" />
            <span className="pointer-events-none absolute -inset-[7%] rounded-full z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(217,70,239,0.28),transparent_66%)]" />
            <span className="pointer-events-none absolute -inset-[2.5%] rounded-full z-0 bg-[conic-gradient(from_230deg,rgba(244,114,182,0.96),rgba(139,92,246,0.9),rgba(217,70,239,0.96),rgba(236,72,153,0.9),rgba(244,114,182,0.96))] animate-pulse shadow-[0_0_24px_rgba(217,70,239,0.5)]" />
            <span className="pointer-events-none absolute inset-[12%] rounded-[inherit] z-0 bg-background/77" />
            <span className="pointer-events-none absolute inset-[8.8%] rounded-[inherit] z-0 border border-fuchsia-200/38 dark:border-fuchsia-100/34" />
          </>
        );
      default:
        return null;
    }
  };

  const withHalo = (content: ReactNode, extraClassName?: string, style?: CSSProperties) => (
    <div className={cn("relative flex items-center justify-center aspect-square", extraClassName, className)}>
      {tierConfig.id !== 'none' ? (
        renderHalo()
      ) : null}
      <div
        className={cn(
          "relative z-10 overflow-hidden rounded-full",
            tierConfig.id === 'none' ? "h-full w-full" : "h-[84%] w-[84%]"
        )}
        style={style}
      >
        {content}
      </div>
    </div>
  );

  // Handle custom uploaded image
  if (mode === 'image') {
    return withHalo(
      finalAvatar.imageUrl ? (
        <img
          src={finalAvatar.imageUrl}
          alt="Custom Profile"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
          <span className="text-[10px] uppercase font-black tracking-widest">No Image</span>
        </div>
      ),
      undefined,
      bgStyle
    );
  }

  // Handle generative modes via DiceBear
  if (mode && mode !== 'custom') {
    let style = 'pixel-art';
    switch (mode) {
        case 'initials': style = 'initials'; break;
        case 'animal': style = 'croodles'; break;
        case 'landscape': style = 'shapes'; break;
        case 'robot': style = 'bottts'; break;
        case 'pixel-art': style = 'pixel-art'; break;
    }

    // Force transparency from API side so our CSS background takes precedence
    const seedToUse = mode === 'initials' ? (initials || seed || '??') : (seed || 'spark');
    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}&backgroundColor=transparent`;
    
    return withHalo(
      <img
        key={url}
        src={url}
        alt="Avatar"
        className="w-full h-full object-contain"
      />,
      undefined,
      bgStyle
    );
  }

  // Custom Builder Path Logic
  const hair = HAIR_STYLES[hairStyle || 'short'] || HAIR_STYLES['none'];
  const accessoryPaths = ACCESSORIES[accessory || 'none'] || ACCESSORIES['none'];
  const outfitPaths = OUTFITS[outfit || 'tshirt'] || OUTFITS['tshirt'];
  const mouthPaths = MOUTHS[mouth || 'smile'] || MOUTHS['none'];
  const facialHairPaths = FACIAL_HAIR_STYLES[facialHair || 'none'] || FACIAL_HAIR_STYLES['none'];

  const backgroundId = `background-${backgroundColor}`;

  return (
    <div className={cn("aspect-square relative", className)}>
        {tierConfig.id !== 'none' ? (
          renderHalo()
        ) : null}
        <div
          className={cn(
            "relative z-10 overflow-hidden rounded-full",
            tierConfig.id === 'none' ? "h-full w-full" : "h-[84%] w-[84%] mx-auto my-[8%]"
          )}
        >
        <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        className="w-full h-full"
        >
        <defs>
            <linearGradient id={backgroundId} x1="0" y1="0" x2="0" y2="1">
                {bg.stops.map((stop, i) => (
                    <stop key={i} offset={stop.offset} stopColor={stop.color} />
                ))}
            </linearGradient>
        </defs>

        {/* Background */}
        <rect width="24" height="24" fill={`url(#${backgroundId})`} />
        
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
        </svg>
        </div>
    </div>
  );
}
