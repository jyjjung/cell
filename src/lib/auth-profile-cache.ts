import type { UserProfileData } from '@/types';
import {
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

const PROFILE_CACHE_PREFIX = 'auth_profile_v1_';

/** Slim profile fields needed to paint chrome before the live snapshot arrives. */
export type CachedAuthProfile = Pick<
  UserProfileData,
  | 'uid'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'roleIds'
  | 'ndcpcRoleIds'
  | 'capabilityKeys'
  | 'showInCommunityProgress'
  | 'preferredLanguage'
  | 'appTheme'
  | 'bibleTextVersion'
  | 'dashboard'
  | 'isApproved'
  | 'access'
  | 'preferences'
  | 'avatar'
  | 'avatars'
  | 'avatarChangesEnabled'
  | 'fcmTokens'
>;

function authProfileCacheKey(uid: string): string {
  return `${PROFILE_CACHE_PREFIX}${uid}`;
}

export function readCachedAuthProfile(uid: string): CachedAuthProfile | null {
  return readLocalCollectionCacheStale<CachedAuthProfile>(authProfileCacheKey(uid));
}

export function writeCachedAuthProfile(profile: UserProfileData): void {
  if (!profile.uid) return;
  const cached: CachedAuthProfile = {
    uid: profile.uid,
    email: profile.email ?? null,
    firstName: profile.firstName,
    lastName: profile.lastName,
    roleIds: profile.roleIds,
    ndcpcRoleIds: profile.ndcpcRoleIds,
    capabilityKeys: profile.capabilityKeys,
    showInCommunityProgress: profile.showInCommunityProgress,
    preferredLanguage: profile.preferredLanguage,
    appTheme: profile.appTheme,
    bibleTextVersion: profile.bibleTextVersion,
    dashboard: profile.dashboard,
    isApproved: profile.isApproved,
    access: profile.access,
    preferences: profile.preferences,
    avatar: profile.avatar,
    avatars: profile.avatars,
    avatarChangesEnabled: profile.avatarChangesEnabled,
    fcmTokens: profile.fcmTokens,
  };
  writeLocalCollectionCache(authProfileCacheKey(profile.uid), cached);
}

export function clearCachedAuthProfile(uid?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      localStorage.removeItem(authProfileCacheKey(uid));
      return;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(PROFILE_CACHE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    /* private mode */
  }
}
