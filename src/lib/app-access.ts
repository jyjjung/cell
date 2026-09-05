import type { RoleCapability } from '@/lib/role-capabilities';
import { hasCapability } from '@/lib/role-capabilities';
import { LAST_APP_COOKIE_NAME } from '@/lib/auth-session';

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

const VALID_APPS = new Set<CommunityAppId>(['cell', 'ndcpc', 'users', 'accounts', 'updates']);

export function parseCommunityAppId(raw: string | null | undefined): CommunityAppId | null {
  if (raw === 'cell' || raw === 'ndcpc' || raw === 'users' || raw === 'accounts' || raw === 'updates') {
    return raw;
  }
  return null;
}

function writeLastAppCookie(app: CommunityAppId): void {
  if (typeof document === 'undefined') return;
  const maxAgeSec = 60 * 60 * 24 * 400; // ~13 months
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LAST_APP_COOKIE_NAME}=${encodeURIComponent(app)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function isMembershipActive(
  profile: Pick<AccessProfile, 'isApproved' | 'capabilityKeys'> | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(profile.isApproved || hasCapability(profile.capabilityKeys, 'app.admin'));
}

export function getAccessFlags(profile: Pick<AccessProfile, 'access'> | null | undefined): AppAccessFlags {
  return profile?.access ?? {};
}

/**
 * Whether this profile should have em. (cell) access.
 * Missing/empty access is legacy em. Preschool-only is `ndcpc: true` without cell.
 * `{ cell: false, ndcpc: false }` is treated as em. — role sync used to write that
 * for members with no roleIds, which locked them out of chats and schedules.
 */
export function inferCellAccessFlag(
  access: AppAccessFlags | null | undefined,
  roleIds?: readonly string[] | null,
): boolean {
  if ((roleIds?.length ?? 0) > 0) return true;
  if (access?.cell === true) return true;
  if (access?.ndcpc === true) return false;
  return true;
}

/** Whether the user is assigned Cell app access (Users admin segmentation — not login routing). */
export function hasAssignedCellAccess(
  profile: Pick<AccessProfile, 'access' | 'roleIds'> | null | undefined,
): boolean {
  return inferCellAccessFlag(profile?.access, profile?.roleIds);
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
  if (hasCapability(profile?.capabilityKeys, 'app.admin')) return true;
  return inferCellAccessFlag(profile?.access, profile?.roleIds);
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
  return parseCommunityAppId(localStorage.getItem(LAST_APP_STORAGE_KEY));
}

/** Non-HttpOnly last-app cookie (same value as localStorage when persist ran). */
export function readLastAppCookie(): CommunityAppId | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LAST_APP_COOKIE_NAME}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  try {
    return parseCommunityAppId(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/** Prefer localStorage, then cookie — enough to resume without waiting on Firebase. */
export function readLastAppPreference(): CommunityAppId | null {
  return readLastAppLocal() ?? readLastAppCookie();
}

export function writeLastAppLocal(app: CommunityAppId): void {
  if (typeof window === 'undefined') return;
  if (!VALID_APPS.has(app)) return;
  localStorage.setItem(LAST_APP_STORAGE_KEY, app);
  writeLastAppCookie(app);
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

  // localStorage/cookie wins: the switcher updates it immediately; Firestore can lag
  // and was previously preferred, which stuck people on Users after visiting Cell.
  const preferred = readLastAppPreference() ?? profile?.preferences?.lastApp;
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

/** em. home — `/cell` today; `/` still used in some overlays and tests. */
export function isCellHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === '/cell';
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
  return true;
}

export function cellPath(path: string): string {
  if (path === '/') return '/cell';
  if (path.startsWith('/cell')) return path;
  return `/cell${path.startsWith('/') ? path : `/${path}`}`;
}
