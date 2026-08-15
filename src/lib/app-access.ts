import type { RoleCapability } from '@/lib/role-capabilities';
import { hasCapability } from '@/lib/role-capabilities';

export type CommunityAppId = 'cell' | 'ndcpc' | 'users' | 'accounts' | 'updates';

export interface AppAccessFlags {
  cell?: boolean;
  ndcpc?: boolean;
}

export type NdcpcRole = 'admin' | 'member';

export interface NotificationAppPrefs {
  chat?: boolean;
  announcements?: boolean;
  dutyReminders?: boolean;
  rosterReminders?: boolean;
}

export interface CommunityAppPrefs {
  /** Cell: show reading progress on community leaderboard */
  showInCommunityProgress?: boolean;
}

export interface CommunityPreferences {
  lastApp?: CommunityAppId;
  cell?: CommunityAppPrefs;
  ndcpc?: Record<string, never>;
  notifications?: {
    cell?: NotificationAppPrefs;
    ndcpc?: NotificationAppPrefs;
  };
}

/** Minimal profile shape for access helpers (avoids circular import with @/types). */
export type AccessProfile = {
  access?: AppAccessFlags;
  isApproved?: boolean;
  capabilityKeys?: RoleCapability[];
  roleIds?: string[];
  ndcpcRoleIds?: string[];
  preferences?: CommunityPreferences;
};

const LAST_APP_STORAGE_KEY = 'ndcCommunityLastApp';

function isMembershipActive(
  profile: Pick<AccessProfile, 'isApproved' | 'capabilityKeys'> | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(profile.isApproved || hasCapability(profile.capabilityKeys, 'app.admin'));
}

export function getAccessFlags(profile: Pick<AccessProfile, 'access'> | null | undefined): AppAccessFlags {
  return profile?.access ?? {};
}

/** Whether the user is assigned Cell app access (Users admin segmentation — not login routing). */
export function hasAssignedCellAccess(
  profile: Pick<AccessProfile, 'access' | 'roleIds'> | null | undefined,
): boolean {
  if ((profile?.roleIds?.length ?? 0) > 0) return true;
  if (profile?.access?.cell === true) return true;
  const access = profile?.access;
  if (!access || Object.keys(access).length === 0) return true;
  return false;
}

/** Whether the user is assigned NDCPC app access (Users admin segmentation). */
export function hasAssignedNdcpcAccess(
  profile: Pick<AccessProfile, 'access' | 'ndcpcRoleIds'> | null | undefined,
): boolean {
  if ((profile?.ndcpcRoleIds?.length ?? 0) > 0) return true;
  return profile?.access?.ndcpc === true;
}

export function hasCellAccess(
  profile: Pick<AccessProfile, 'access' | 'isApproved' | 'roleIds' | 'capabilityKeys'> | null | undefined,
): boolean {
  if (!isMembershipActive(profile)) return false;
  if ((profile?.roleIds?.length ?? 0) > 0) return true;
  if (hasCapability(profile?.capabilityKeys, 'app.admin')) return true;
  if (profile?.access?.cell === true) return true;
  // Legacy Cell users before per-app access flags existed
  const access = profile?.access;
  if (!access || Object.keys(access).length === 0) return true;
  return false;
}

export function hasNdcpcAccess(
  profile: Pick<AccessProfile, 'access' | 'isApproved' | 'ndcpcRoleIds' | 'capabilityKeys'> | null | undefined,
): boolean {
  if (!isMembershipActive(profile)) return false;
  if ((profile?.ndcpcRoleIds?.length ?? 0) > 0) return true;
  return profile?.access?.ndcpc === true;
}

export function hasUsersAppAccess(profile: Pick<AccessProfile, 'capabilityKeys'> | null | undefined): boolean {
  return hasCapability(profile?.capabilityKeys, 'app.admin');
}

export function hasAccountsAccess(
  profile: Pick<AccessProfile, 'isApproved' | 'capabilityKeys'> | null | undefined,
): boolean {
  return profile != null;
}

/** Updates & Feedback — available to every signed-in member (not gated by cell/ndcpc access). */
export function hasUpdatesAccess(
  profile: Pick<AccessProfile, 'isApproved' | 'capabilityKeys'> | null | undefined,
): boolean {
  return profile != null;
}

export function listAccessibleApps(profile: AccessProfile | null | undefined): CommunityAppId[] {
  const apps: CommunityAppId[] = [];
  if (hasAccountsAccess(profile)) apps.push('accounts');
  if (hasCellAccess(profile)) apps.push('cell');
  if (hasNdcpcAccess(profile)) apps.push('ndcpc');
  if (hasUsersAppAccess(profile)) apps.push('users');
  if (hasUpdatesAccess(profile)) apps.push('updates');
  return apps;
}

export function getAppHref(app: CommunityAppId): string {
  switch (app) {
    case 'cell':
      return '/cell';
    case 'ndcpc':
      return '/ndcpc';
    case 'users':
      return '/users';
    case 'accounts':
      return '/accounts';
    case 'updates':
      return '/feedback';
  }
}

export function getAppLabel(app: CommunityAppId): string {
  switch (app) {
    case 'cell':
      return 'em.';
    case 'ndcpc':
      return 'NDC Preschool';
    case 'users':
      return 'Users';
    case 'accounts':
      return 'Account';
    case 'updates':
      return 'Updates';
  }
}

export function getAppDescription(app: CommunityAppId): string {
  switch (app) {
    case 'cell':
      return 'em. community — chat, Bible reading, events, and more.';
    case 'ndcpc':
      return 'Preschool volunteer hub — schedules, roster, and announcements.';
    case 'users':
      return 'Approve members and manage app access.';
    case 'accounts':
      return 'Profile, appearance, app preferences, and notifications.';
    case 'updates':
      return 'Changelog and feedback for the community apps.';
  }
}

export function readLastAppLocal(): CommunityAppId | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LAST_APP_STORAGE_KEY);
  if (raw === 'cell' || raw === 'ndcpc' || raw === 'users' || raw === 'accounts' || raw === 'updates') {
    return raw;
  }
  return null;
}

export function writeLastAppLocal(app: CommunityAppId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_APP_STORAGE_KEY, app);
}

/** First visit (no last-app): Account. After that, resume where they left off. */
const ENTRY_FALLBACK_ORDER: CommunityAppId[] = [
  'accounts',
  'cell',
  'ndcpc',
  'updates',
  'users',
];

export function resolveEntryApp(
  profile: AccessProfile | null | undefined,
): CommunityAppId | null {
  const accessible = listAccessibleApps(profile);
  if (accessible.length === 0) return null;
  if (accessible.length === 1) return accessible[0]!;

  // localStorage wins: the switcher updates it immediately; Firestore can lag
  // and was previously preferred, which stuck people on Users after visiting Cell.
  const preferred = readLastAppLocal() ?? profile?.preferences?.lastApp;
  if (preferred && accessible.includes(preferred)) return preferred;

  for (const app of ENTRY_FALLBACK_ORDER) {
    if (accessible.includes(app)) return app;
  }
  return accessible[0]!;
}

/** Which community app owns the current route (for chrome + switcher). */
export function resolveActiveApp(pathname: string): CommunityAppId | null {
  if (pathname === '/accounts' || pathname.startsWith('/accounts/')) return 'accounts';
  if (pathname === '/feedback' || pathname.startsWith('/feedback/')) return 'updates';
  if (pathname === '/cell' || pathname.startsWith('/cell/')) return 'cell';
  if (pathname === '/ndcpc' || pathname.startsWith('/ndcpc/')) return 'ndcpc';
  if (pathname === '/users' || pathname.startsWith('/users/')) return 'users';
  if (isCellAppPath(pathname)) return 'cell';
  return null;
}

export function isShellPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/apps' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/pending-approval' ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms')
  );
}

export function isCellPath(pathname: string): boolean {
  return pathname === '/cell' || pathname.startsWith('/cell/');
}

/** Cell app routes (prefixed or legacy internal paths) — excludes shell, ndcpc, auth, accounts. */
export function isCellAppPath(pathname: string): boolean {
  if (
    isShellPath(pathname) ||
    isNdcpcPath(pathname) ||
    isUsersAppPath(pathname) ||
    isAccountsAppPath(pathname) ||
    isUpdatesAppPath(pathname)
  ) {
    return false;
  }
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/pending-approval' ||
    pathname === '/forgot-password'
  ) {
    return false;
  }
  return isCellPath(pathname) || isLegacyCellPath(pathname);
}

export function isNdcpcPath(pathname: string): boolean {
  return pathname === '/ndcpc' || pathname.startsWith('/ndcpc/');
}

export function isAccountsAppPath(pathname: string): boolean {
  return pathname === '/accounts' || pathname.startsWith('/accounts/');
}

export function isUsersAppPath(pathname: string): boolean {
  return pathname === '/users' || pathname.startsWith('/users/');
}

export function isUpdatesAppPath(pathname: string): boolean {
  return pathname === '/feedback' || pathname.startsWith('/feedback/');
}

/** Legacy Cell routes still served at root — treat as cell app chrome. */
export function isLegacyCellPath(pathname: string): boolean {
  if (
    isShellPath(pathname) ||
    isCellPath(pathname) ||
    isNdcpcPath(pathname) ||
    isUsersAppPath(pathname) ||
    isAccountsAppPath(pathname) ||
    isUpdatesAppPath(pathname)
  ) {
    return false;
  }
  const publicPrefixes = ['/features'];
  return !publicPrefixes.some((p) => pathname.startsWith(p));
}

export function cellPath(path: string): string {
  if (path === '/') return '/cell';
  if (path.startsWith('/cell')) return path;
  return `/cell${path.startsWith('/') ? path : `/${path}`}`;
}
