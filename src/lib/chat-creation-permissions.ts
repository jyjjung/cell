import type {
  ChatCreationPermissions,
  ChatTypeCreationPermission,
} from '@/types';

export const CHAT_CREATION_CONFIG_DOC = 'chatCreation';
export const CONFIG_COLLECTION = 'config';

export const DEFAULT_CHAT_CREATION_PERMISSIONS: ChatCreationPermissions = {
  privateChat: { mode: 'everyone', allowedRoleIds: [] },
  groupChat: { mode: 'everyone', allowedRoleIds: [] },
};

function normalizeTypePermission(
  raw: Partial<ChatTypeCreationPermission> | undefined,
): ChatTypeCreationPermission {
  const mode = raw?.mode === 'roles' ? 'roles' : 'everyone';
  const allowedRoleIds = Array.isArray(raw?.allowedRoleIds)
    ? raw!.allowedRoleIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  return { mode, allowedRoleIds };
}

/** Normalize Firestore / API payload into a full permissions object. */
export function normalizeChatCreationPermissions(
  raw: Partial<ChatCreationPermissions> | null | undefined,
): ChatCreationPermissions {
  return {
    privateChat: normalizeTypePermission(raw?.privateChat),
    groupChat: normalizeTypePermission(raw?.groupChat),
  };
}

export function canUserCreateChatType(
  user: { roleIds?: string[]; isAdmin?: boolean } | null | undefined,
  permission: ChatTypeCreationPermission,
): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (permission.mode === 'everyone') return true;
  const roleIds = user.roleIds ?? [];
  if (!permission.allowedRoleIds.length) return false;
  return permission.allowedRoleIds.some((id) => roleIds.includes(id));
}

export function canUserCreatePrivateChat(
  user: { roleIds?: string[]; isAdmin?: boolean } | null | undefined,
  permissions: ChatCreationPermissions,
): boolean {
  return canUserCreateChatType(user, permissions.privateChat);
}

export function canUserCreateGroupChat(
  user: { roleIds?: string[]; isAdmin?: boolean } | null | undefined,
  permissions: ChatCreationPermissions,
): boolean {
  return canUserCreateChatType(user, permissions.groupChat);
}
