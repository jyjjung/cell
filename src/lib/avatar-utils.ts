import type { AvatarData } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';

export type AvatarNameHint = {
  firstName?: string | null;
  lastName?: string | null;
};

/**
 * Merge avatar fields without letting a partial/stale snapshot wipe equipped halos or photos.
 * `incoming` is typically chat memberInfo; `existing` is the cached user profile.
 */
export function mergeAvatarData(existing?: AvatarData, incoming?: AvatarData): AvatarData {
  const base: AvatarData = { ...DEFAULT_AVATAR_DATA, ...(existing || {}) };
  if (!incoming) return base;

  const merged: AvatarData = { ...base, ...incoming };

  if (incoming.cosmeticTier !== undefined) {
    merged.cosmeticTier = incoming.cosmeticTier;
  }
  if (incoming.imageUrl) {
    merged.imageUrl = incoming.imageUrl;
    if (incoming.mode) merged.mode = incoming.mode;
  } else if (base.imageUrl) {
    merged.imageUrl = base.imageUrl;
    if (base.mode === 'image') merged.mode = base.mode;
  }

  return merged;
}

export function deriveInitialsFromName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
}

export function normalizeAvatarInitials(initials?: string | null): string {
  return initials?.trim().toUpperCase().slice(0, 2) ?? '';
}

/** Resolve the DiceBear seed for initials mode — never whitespace or placeholder. */
export function resolveInitialsDisplaySeed(
  avatar: AvatarData,
  nameHint?: AvatarNameHint,
): string {
  const fromField = normalizeAvatarInitials(avatar.initials);
  if (fromField) return fromField;

  const fromName = deriveInitialsFromName(nameHint?.firstName, nameHint?.lastName);
  if (fromName) return fromName;

  const seed = avatar.seed?.trim();
  if (seed) return seed;

  return 'U';
}

export function sanitizeAvatarData(
  avatar: AvatarData,
  nameHint?: AvatarNameHint,
): AvatarData {
  if (avatar.mode !== 'initials') return avatar;

  const initials = normalizeAvatarInitials(avatar.initials)
    || deriveInitialsFromName(nameHint?.firstName, nameHint?.lastName);

  if (!initials) return avatar;

  return { ...avatar, initials };
}
