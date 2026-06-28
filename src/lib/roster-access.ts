import type {
  RosterDefinition,
  RosterEditPermissions,
  RosterVisibility,
  UserProfileData,
  CustomRosterEntry,
  RosterFieldDefinition,
  RosterFieldValue,
} from '@/types';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';

function roleIds(user: Pick<UserProfileData, 'roleIds'>): string[] {
  return user.roleIds ?? [];
}

function matchesAccessList(
  user: Pick<UserProfileData, 'uid' | 'roleIds'>,
  allowedUserIds?: string[],
  allowedRoleIds?: string[],
): boolean {
  if (allowedUserIds?.includes(user.uid)) return true;
  if (allowedRoleIds?.length) {
    const userRoles = roleIds(user);
    return allowedRoleIds.some((roleId) => userRoles.includes(roleId));
  }
  return false;
}

export function userCanSeeRoster(
  user: Pick<UserProfileData, 'uid' | 'roleIds'>,
  def: Pick<RosterDefinition, 'visibility'>,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const visibility: RosterVisibility = def.visibility ?? { type: 'public' };
  if (visibility.type === 'public') return true;
  return matchesAccessList(user, visibility.allowedUserIds, visibility.allowedRoleIds);
}

export function userCanEditRoster(
  user: Pick<UserProfileData, 'uid' | 'roleIds'>,
  def: Pick<RosterDefinition, 'editPermissions'>,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const perms: RosterEditPermissions = def.editPermissions ?? {};
  return matchesAccessList(user, perms.allowedUserIds, perms.allowedRoleIds);
}

export function sortedRosterFields(fields?: RosterFieldDefinition[]): RosterFieldDefinition[] {
  if (!fields?.length) return [];
  return [...fields].sort((a, b) => a.order - b.order);
}

function displayFieldValue(
  value: RosterFieldValue | undefined,
  field: RosterFieldDefinition,
  usersMap?: Map<string, UserProfileData>,
): string {
  if (!value) return '';
  if (field.type === 'user' && value.userId) {
    const user = usersMap?.get(value.userId);
    if (user) return formatUserDisplayName(user);
  }
  return value.text ? formatNameString(value.text) : '';
}

export function getCustomRosterEntryTitle(
  entry: CustomRosterEntry,
  def: Pick<RosterDefinition, 'fields'>,
  usersMap?: Map<string, UserProfileData>,
): string {
  const fields = sortedRosterFields(def.fields);
  for (const field of fields) {
    const display = displayFieldValue(entry.fieldValues?.[field.id], field, usersMap);
    if (display) return display;
  }
  const first = (entry.assignments ?? []).find((a) => a.person?.trim());
  return first ? formatNameString(first.person) : '';
}

export function entryHasContent(
  entry: CustomRosterEntry,
  def: Pick<RosterDefinition, 'fields'>,
): boolean {
  const fields = sortedRosterFields(def.fields);
  if (fields.length > 0) {
    return fields.some((field) => {
      const v = entry.fieldValues?.[field.id];
      return (v?.text?.trim() ?? '') || v?.userId;
    });
  }
  return (entry.assignments ?? []).some((a) => a.person?.trim() || a.duty?.trim());
}

export function getUserCustomRosterLabels(
  entry: CustomRosterEntry,
  def: Pick<RosterDefinition, 'fields'>,
  userId: string,
): string[] {
  const fields = sortedRosterFields(def.fields);
  if (fields.length > 0) {
    return fields
      .filter((field) => field.type === 'user' && entry.fieldValues?.[field.id]?.userId === userId)
      .map((field) => field.label);
  }
  return (entry.assignments ?? [])
    .filter((a) => a.userId === userId)
    .map((a) => a.duty);
}

export function formatCustomRosterEntrySummary(
  entry: CustomRosterEntry,
  def: Pick<RosterDefinition, 'fields'>,
  usersMap?: Map<string, UserProfileData>,
): string {
  const fields = sortedRosterFields(def.fields);
  if (fields.length > 0) {
    return fields
      .map((field) => {
        const display = displayFieldValue(entry.fieldValues?.[field.id], field, usersMap);
        if (!display) return null;
        return `${field.label}: ${display}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  return (entry.assignments ?? [])
    .map((a) => `${a.duty}: ${formatNameString(a.person)}`)
    .join(', ');
}
