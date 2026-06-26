import { EventCategory, type AppEvent, type UserProfileData } from '@/types';

/** Whether a member should see an event in the app or receive a day-of reminder for it. */
export function userCanSeeEvent(
  user: Pick<UserProfileData, 'roleIds'>,
  event: AppEvent,
): boolean {
  if (event.category === EventCategory.Birthday) return true;
  if (!event.allowedRoleIds?.length) return true;
  const userRoles = user.roleIds ?? [];
  return event.allowedRoleIds.some((roleId) => userRoles.includes(roleId));
}
