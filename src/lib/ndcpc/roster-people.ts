import { hasAssignedNdcpcAccess } from '@/lib/app-access';
import { ndcpcAccountDisplayName } from '@/lib/ndcpc/account-name';
import { normalizeName } from '@/lib/ndcpc/name-similarity';
import type { UserProfileData } from '@/types';

export type NdcpcRosterDirectoryEntry = {
  uid: string;
  name: string;
};

/** People who can be picked on preschool rosters: NDCPC access + a first name. */
export function ndcpcRosterDirectoryEntries(
  users: Array<Pick<UserProfileData, 'uid' | 'firstName' | 'lastName' | 'email' | 'access' | 'ndcpcRoleIds'>>,
): NdcpcRosterDirectoryEntry[] {
  return users
    .filter((user) => Boolean(user.firstName?.trim()) && hasAssignedNdcpcAccess(user))
    .map((user) => ({
      uid: user.uid,
      name: ndcpcAccountDisplayName(user) || `${user.firstName} ${user.lastName ?? ''}`.trim(),
    }))
    .filter((entry) => entry.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function ndcpcRosterMemberUidForName(
  entries: readonly NdcpcRosterDirectoryEntry[],
  assignedName: string | null | undefined,
): string | undefined {
  const normalized = assignedName ? normalizeName(assignedName) : '';
  if (!normalized) return undefined;
  return entries.find((entry) => normalizeName(entry.name) === normalized)?.uid;
}
