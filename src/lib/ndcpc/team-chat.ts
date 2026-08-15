import { hasCapability } from '@/lib/role-capabilities';
import type { AppUser, UserProfileData } from '@/types';

/** Stable chat id for the preschool managers team room (em. chat system). */
export const NDCPC_TEAM_CHAT_ID = 'ndcpc-team';

export const NDCPC_TEAM_CHAT_NAME = 'Team chat';

type ManageProfile = Pick<
  UserProfileData | AppUser,
  'capabilityKeys' | 'ndcpcRole'
>;

/** Users who can see the NDCPC team chat (manage/admin preschool). */
export function hasNdcpcManageAccess(
  profile: ManageProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (hasCapability(profile.capabilityKeys, 'ndcpc.manage')) return true;
  if (hasCapability(profile.capabilityKeys, 'ndcpc.admin')) return true;
  return profile.ndcpcRole === 'admin';
}
