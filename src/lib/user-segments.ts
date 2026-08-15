import { hasAssignedCellAccess, hasAssignedNdcpcAccess } from '@/lib/app-access';
import type { UserProfileData } from '@/types';

export type UsersSegmentTab = 'all' | 'cell' | 'ndcpc' | 'unassigned' | 'roles';

export function isUsersSegmentTab(value: string | null | undefined): value is UsersSegmentTab {
  return (
    value === 'all'
    || value === 'cell'
    || value === 'ndcpc'
    || value === 'unassigned'
    || value === 'roles'
  );
}

export function filterUsersBySegment(
  users: UserProfileData[],
  segment: Exclude<UsersSegmentTab, 'roles'>,
): UserProfileData[] {
  switch (segment) {
    case 'all':
      return users;
    case 'cell':
      return users.filter((user) => hasAssignedCellAccess(user));
    case 'ndcpc':
      return users.filter((user) => hasAssignedNdcpcAccess(user));
    case 'unassigned':
      return users.filter((user) => !hasAssignedCellAccess(user) && !hasAssignedNdcpcAccess(user));
  }
}
