import type { AvatarData, AppUser, UserProfileData } from '@/types';
import { BACKGROUNDS } from '@/lib/avatar-backgrounds';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import {
  resolveInitialsDisplaySeed,
  type AvatarNameHint,
} from '@/lib/avatar-utils';

export type AvatarAppId = 'cell' | 'ndcpc';

export type UserAvatars = {
  cell?: AvatarData;
  ndcpc?: AvatarData;
};

export type NdcpcAvatarHint = AvatarNameHint & {
  uid?: string | null;
  displayName?: string | null;
};

/** Theme-aware muted grey default for NDC Preschool initials (CSS, not DiceBear). */
export const NDCPC_DEFAULT_BACKGROUND = 'ndcpc-muted';

export function isNdcpcDefaultAvatarBackground(backgroundColor?: string | null): boolean {
  return !backgroundColor || backgroundColor === NDCPC_DEFAULT_BACKGROUND;
}

function deriveNdcpcInitials(hint?: NdcpcAvatarHint, existing?: string | null): string {
  const fromField = existing?.trim().charAt(0).toUpperCase();
  if (fromField) return fromField;

  const first = hint?.firstName?.trim().charAt(0) ?? '';
  if (first) return first.toUpperCase();

  const display = hint?.displayName?.trim();
  if (display) return display.charAt(0).toUpperCase();

  const last = hint?.lastName?.trim().charAt(0) ?? '';
  if (last) return last.toUpperCase();

  return 'U';
}

function stableNdcpcKey(hint?: NdcpcAvatarHint, initials?: string): string {
  return hint?.uid?.trim()
    || hint?.displayName?.trim()
    || [hint?.firstName, hint?.lastName].filter(Boolean).join(' ').trim()
    || initials
    || 'user';
}

/** Default NDC Preschool avatar: single letter on theme grey. */
export function createDefaultNdcpcAvatar(hint?: NdcpcAvatarHint): AvatarData {
  const initials = deriveNdcpcInitials(hint);
  return {
    mode: 'initials',
    initials,
    seed: stableNdcpcKey(hint, initials),
    backgroundColor: NDCPC_DEFAULT_BACKGROUND,
    cosmeticTier: 'none',
  };
}

export function stripHaloFromAvatar(avatar: AvatarData): AvatarData {
  return { ...avatar, cosmeticTier: 'none' };
}

/** NDC Preschool avatars: uploaded photo or theme-grey single-letter default. */
export function sanitizeNdcpcAvatar(
  avatar: AvatarData,
  hint?: NdcpcAvatarHint,
): AvatarData {
  if (avatar.mode === 'image' && avatar.imageUrl?.trim()) {
    return { mode: 'image', imageUrl: avatar.imageUrl.trim(), cosmeticTier: 'none' };
  }

  const keepInitials = avatar.mode === 'initials';
  const initials = deriveNdcpcInitials(hint, keepInitials ? avatar.initials : undefined);
  const stableKey =
    (keepInitials && avatar.seed?.trim()) || stableNdcpcKey(hint, initials);

  return {
    mode: 'initials',
    initials,
    seed: stableKey,
    backgroundColor: NDCPC_DEFAULT_BACKGROUND,
    cosmeticTier: 'none',
  };
}

function profileHint(
  profile:
    | Pick<UserProfileData, 'uid' | 'firstName' | 'lastName'>
    | Pick<AppUser, 'uid' | 'firstName' | 'lastName'>
    | null
    | undefined,
): NdcpcAvatarHint | undefined {
  if (!profile) return undefined;
  return {
    uid: profile.uid,
    firstName: profile.firstName,
    lastName: profile.lastName,
  };
}

/** Resolve stored avatars, migrating legacy top-level `avatar` to Cell only. */
export function normalizeUserAvatars(
  profile:
    | Pick<UserProfileData, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'>
    | Pick<AppUser, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'>
    | null
    | undefined,
): UserAvatars {
  const legacy = profile?.avatar;
  const stored = profile?.avatars ?? {};
  const hint = profileHint(profile);

  const cell = { ...DEFAULT_AVATAR_DATA, ...(stored.cell ?? legacy ?? DEFAULT_AVATAR_DATA) };
  // Do not fall back to cell/legacy avatar — apps keep separate profile pictures.
  const ndcpc = sanitizeNdcpcAvatar(stored.ndcpc ?? createDefaultNdcpcAvatar(hint), hint);

  return { cell, ndcpc };
}

export function resolveAvatarForApp(
  profile:
    | Pick<UserProfileData, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'>
    | Pick<AppUser, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'>
    | null
    | undefined,
  app: AvatarAppId,
): AvatarData {
  return normalizeUserAvatars(profile)[app] ?? (app === 'ndcpc' ? createDefaultNdcpcAvatar(profileHint(profile)) : DEFAULT_AVATAR_DATA);
}

export function resolveAppUserAvatar(
  user: Pick<AppUser, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'> | null | undefined,
  app: AvatarAppId,
): AvatarData {
  return resolveAvatarForApp(user, app);
}

export function buildAvatarsPatch(
  current:
    | Pick<UserProfileData, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'>
    | Pick<AppUser, 'avatar' | 'avatars' | 'uid' | 'firstName' | 'lastName'>
    | null
    | undefined,
  app: AvatarAppId,
  nextAvatar: AvatarData,
): { avatars: UserAvatars; avatar: AvatarData } {
  const normalized = normalizeUserAvatars(current);
  const sanitized = app === 'ndcpc' ? sanitizeNdcpcAvatar(nextAvatar, profileHint(current)) : nextAvatar;
  const avatars: UserAvatars = { ...normalized, [app]: sanitized };

  return {
    avatars,
    avatar: avatars.cell ?? DEFAULT_AVATAR_DATA,
  };
}

/** First stop hex without `#` for DiceBear `backgroundColor`. */
export function avatarBackgroundToDicebearColor(backgroundColor?: string): string {
  if (isNdcpcDefaultAvatarBackground(backgroundColor)) return '9CA3AF';
  const stops = BACKGROUNDS[backgroundColor || '']?.stops;
  const color = stops?.[0]?.color || '#3B82F6';
  return color.replace(/^#/, '');
}

export function buildDicebearInitialsUrl(
  avatar: AvatarData,
  nameHint?: AvatarNameHint,
): string {
  const seedToUse = resolveInitialsDisplaySeed(avatar, nameHint);
  const backgroundColor = avatarBackgroundToDicebearColor(avatar.backgroundColor);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedToUse)}&backgroundColor=${backgroundColor}`;
}

/** Remote image URL for chat denormalization (uploads + DiceBear). Custom pixel / theme initials return null. */
export function resolveAvatarPhotoURL(
  avatar: AvatarData | null | undefined,
  nameHint?: AvatarNameHint,
): string | undefined {
  const resolved = { ...DEFAULT_AVATAR_DATA, ...(avatar ?? {}) };

  if (resolved.mode === 'image' && resolved.imageUrl?.trim()) {
    return resolved.imageUrl.trim();
  }

  if (resolved.mode === 'initials') {
    // Theme-aware CSS letter — no remote URL.
    if (isNdcpcDefaultAvatarBackground(resolved.backgroundColor)) {
      return undefined;
    }
    return buildDicebearInitialsUrl(resolved, nameHint);
  }

  if (resolved.mode && resolved.mode !== 'custom') {
    let style = 'pixel-art';
    switch (resolved.mode) {
      case 'animal':
        style = 'croodles';
        break;
      case 'landscape':
        style = 'shapes';
        break;
      case 'robot':
        style = 'bottts';
        break;
      case 'pixel-art':
        style = 'pixel-art';
        break;
    }

    const seedToUse = resolved.seed || 'spark';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}&backgroundColor=transparent`;
  }

  return undefined;
}
