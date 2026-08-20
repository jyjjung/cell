import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import {
  deriveRoleState,
  normalizeRoleCapabilities,
  normalizeRoleScope,
  type DerivedRoleState,
  type RoleAppScope,
  type RoleCapability,
} from '@/lib/role-capabilities';
import { syncDocsForChatMembers } from '@/lib/server-docs-chat-share';
import { resolveAvatarForApp } from '@/lib/user-avatars';
import {
  hasNdcpcManageAccess,
  NDCPC_TEAM_CHAT_ID,
  NDCPC_TEAM_CHAT_NAME,
} from '@/lib/ndcpc/team-chat';
import { inferCellAccessFlag } from '@/lib/app-access';
import type { UserProfileData } from '@/types';

const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';
const CHATS_COLLECTION = 'chats';

type ServerRole = {
  id: string;
  name: string;
  appScope: RoleAppScope;
  capabilities: RoleCapability[];
  status: 'active' | 'archived';
  chatId?: string | null;
};

async function loadRoles(adminDb: Firestore): Promise<ServerRole[]> {
  const snapshot = await adminDb.collection(ROLES_COLLECTION).get();
  return snapshot.docs.map((roleDoc) => {
    const data = roleDoc.data();
    return {
      id: roleDoc.id,
      name: typeof data.name === 'string' ? data.name : 'Unnamed role',
      appScope: normalizeRoleScope(data.appScope),
      capabilities: normalizeRoleCapabilities(data.capabilities),
      status: data.status === 'archived' ? 'archived' : 'active',
      chatId: typeof data.chatId === 'string' ? data.chatId : null,
    };
  });
}

function rolesForScope(roles: ServerRole[], scope: RoleAppScope): ServerRole[] {
  return roles.filter((role) => role.appScope === scope);
}

function mergeCapabilityKeys(cell: DerivedRoleState, ndcpc: DerivedRoleState): RoleCapability[] {
  return [...new Set([...cell.capabilityKeys, ...ndcpc.capabilityKeys])].sort();
}

function userHasRole(
  userData: { roleIds?: unknown; ndcpcRoleIds?: unknown },
  role: ServerRole,
): boolean {
  const field = role.appScope === 'ndcpc' ? 'ndcpcRoleIds' : 'roleIds';
  const ids = userData[field];
  return Array.isArray(ids) && ids.includes(role.id);
}

/** Drop a user from preschool role/team chats they are no longer entitled to. */
async function pruneUnauthorizedNdcpcChats(
  adminDb: Firestore,
  userId: string,
  profile: {
    ndcpcRoleIds: string[];
    capabilityKeys?: unknown;
    ndcpcRole?: unknown;
  },
  roles: ServerRole[],
): Promise<number> {
  const chatsSnap = await adminDb
    .collection(CHATS_COLLECTION)
    .where('members', 'array-contains', userId)
    .get();

  const roleByChatId = new Map<string, ServerRole>();
  for (const role of rolesForScope(roles, 'ndcpc')) {
    if (role.chatId) roleByChatId.set(role.chatId, role);
  }

  const canManage = hasNdcpcManageAccess({
    capabilityKeys: profile.capabilityKeys as UserProfileData['capabilityKeys'],
    ndcpcRole: profile.ndcpcRole as UserProfileData['ndcpcRole'],
  });

  let pruned = 0;
  for (const chatDoc of chatsSnap.docs) {
    const data = chatDoc.data();
    if (data.appScope !== 'ndcpc') continue;

    let allowed = true;
    if (data.ndcpcKind === 'team' || chatDoc.id === NDCPC_TEAM_CHAT_ID) {
      allowed = canManage;
    } else {
      const role = roleByChatId.get(chatDoc.id);
      if (role) {
        allowed = profile.ndcpcRoleIds.includes(role.id);
      } else if (data.ndcpcKind === 'role') {
        allowed = false;
      }
    }

    if (allowed) continue;

    await chatDoc.ref.update({
      members: FieldValue.arrayRemove(userId),
      admins: FieldValue.arrayRemove(userId),
      [`memberInfo.${userId}`]: FieldValue.delete(),
    });
    pruned++;
  }

  return pruned;
}

export async function reconcileUserRoleState(
  adminDb: Firestore,
  userId: string,
  requestedRoleIds?: readonly string[],
  requestedNdcpcRoleIds?: readonly string[],
): Promise<DerivedRoleState & { ndcpcRoleIds: string[] }> {
  const [userSnap, roles] = await Promise.all([
    adminDb.collection(USERS_COLLECTION).doc(userId).get(),
    loadRoles(adminDb),
  ]);
  if (!userSnap.exists) throw new Error('User not found.');

  const profile = userSnap.data()!;
  const cellState = deriveRoleState(
    requestedRoleIds ?? profile.roleIds,
    rolesForScope(roles, 'cell'),
  );
  const ndcpcState = deriveRoleState(
    requestedNdcpcRoleIds ?? profile.ndcpcRoleIds,
    rolesForScope(roles, 'ndcpc'),
  );
  const capabilityKeys = mergeCapabilityKeys(cellState, ndcpcState);

  const currentAccess = profile.access ?? {};
  const nextAccess = {
    cell: inferCellAccessFlag(currentAccess, cellState.roleIds),
    ndcpc: ndcpcState.roleIds.length > 0 ? true : currentAccess.ndcpc === true,
  };

  const userRef = userSnap.ref;
  await userRef.update({
    roleIds: cellState.roleIds,
    ndcpcRoleIds: ndcpcState.roleIds,
    capabilityKeys,
    access: nextAccess,
    roleSyncVersion: 1,
    roleSyncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const previousRoleIds = Array.isArray(profile.roleIds) ? profile.roleIds : [];
  const previousNdcpcRoleIds = Array.isArray(profile.ndcpcRoleIds) ? profile.ndcpcRoleIds : [];
  const affectedCell = new Set([...previousRoleIds, ...cellState.roleIds]);
  const affectedNdcpc = new Set([...previousNdcpcRoleIds, ...ndcpcState.roleIds]);

  for (const role of rolesForScope(roles, 'cell')) {
    if (role.chatId && affectedCell.has(role.id)) {
      await reconcileRoleMembers(adminDb, role.id);
    }
  }
  for (const role of rolesForScope(roles, 'ndcpc')) {
    if (role.chatId && affectedNdcpc.has(role.id)) {
      await reconcileRoleMembers(adminDb, role.id);
    }
  }

  await pruneUnauthorizedNdcpcChats(adminDb, userId, {
    ndcpcRoleIds: ndcpcState.roleIds,
    capabilityKeys,
    ndcpcRole: profile.ndcpcRole,
  }, roles);

  await reconcileNdcpcTeamChat(adminDb);

  return {
    ...cellState,
    capabilityKeys,
    ndcpcRoleIds: ndcpcState.roleIds,
  };
}

export async function reconcileRoleMembers(adminDb: Firestore, roleId: string): Promise<number> {
  const [roleSnap, usersSnap] = await Promise.all([
    adminDb.collection(ROLES_COLLECTION).doc(roleId).get(),
    adminDb.collection(USERS_COLLECTION).get(),
  ]);
  if (!roleSnap.exists) throw new Error('Role not found.');

  const roleData = roleSnap.data()!;
  if (roleData.status === 'archived' || typeof roleData.chatId !== 'string') return 0;

  const role: ServerRole = {
    id: roleSnap.id,
    name: typeof roleData.name === 'string' ? roleData.name : 'Unnamed role',
    appScope: normalizeRoleScope(roleData.appScope),
    capabilities: normalizeRoleCapabilities(roleData.capabilities),
    status: 'active',
    chatId: roleData.chatId,
  };

  const assignedUsers = usersSnap.docs.filter((userDoc) => userHasRole(userDoc.data(), role));
  const memberIds = assignedUsers.map((userDoc) => userDoc.id);
  const avatarApp = role.appScope === 'ndcpc' ? 'ndcpc' : 'cell';
  const memberInfo = Object.fromEntries(assignedUsers.map((userDoc) => {
    const user = userDoc.data();
    const profile = {
      uid: userDoc.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      avatars: user.avatars,
    };
    return [userDoc.id, {
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: resolveAvatarForApp(profile, avatarApp) || DEFAULT_AVATAR_DATA,
    }];
  }));

  const chatRef = adminDb.collection(CHATS_COLLECTION).doc(roleData.chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    await chatRef.set({
      type: 'group',
      name: roleData.name,
      appScope: role.appScope,
      ...(role.appScope === 'ndcpc' ? { ndcpcKind: 'role' } : {}),
      members: memberIds,
      memberInfo,
      admins: [],
      createdAt: FieldValue.serverTimestamp(),
      lastMessageText: 'Role circle restored.',
      lastMessageSentAt: FieldValue.serverTimestamp(),
      memberSeen: {},
    });
    await syncDocsForChatMembers(adminDb, roleData.chatId, memberIds).catch((err) => {
      console.error('[reconcileRoleMembers] Doc ACL sync failed:', err);
    });
    return memberIds.length;
  }

  const existingAdmins = Array.isArray(chatSnap.data()?.admins)
    ? chatSnap.data()!.admins.filter((id: string) => memberIds.includes(id))
    : [];
  await chatRef.update({
    name: roleData.name,
    appScope: role.appScope,
    ...(role.appScope === 'ndcpc' ? { ndcpcKind: 'role' } : {}),
    members: memberIds,
    memberInfo,
    admins: existingAdmins,
  });

  await syncDocsForChatMembers(adminDb, roleData.chatId, memberIds).catch((err) => {
    console.error('[reconcileRoleMembers] Doc ACL sync failed:', err);
  });

  return memberIds.length;
}

/** Managers-only preschool team room — membership from ndcpc.manage / ndcpc.admin. */
export async function reconcileNdcpcTeamChat(adminDb: Firestore): Promise<number> {
  const usersSnap = await adminDb.collection(USERS_COLLECTION).get();
  const managers = usersSnap.docs.filter((userDoc) => {
    const data = userDoc.data();
    return hasNdcpcManageAccess({
      capabilityKeys: data.capabilityKeys,
      ndcpcRole: data.ndcpcRole,
    });
  });

  const memberIds = managers.map((docSnap) => docSnap.id);
  const memberInfo = Object.fromEntries(managers.map((userDoc) => {
    const user = userDoc.data();
    const profile = {
      uid: userDoc.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      avatars: user.avatars,
    };
    return [userDoc.id, {
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: resolveAvatarForApp(profile, 'ndcpc') || DEFAULT_AVATAR_DATA,
    }];
  }));

  const chatRef = adminDb.collection(CHATS_COLLECTION).doc(NDCPC_TEAM_CHAT_ID);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    await chatRef.set({
      type: 'group',
      name: NDCPC_TEAM_CHAT_NAME,
      appScope: 'ndcpc',
      ndcpcKind: 'team',
      members: memberIds,
      memberInfo,
      admins: [],
      createdAt: FieldValue.serverTimestamp(),
      lastMessageText: 'Team chat ready.',
      lastMessageSentAt: FieldValue.serverTimestamp(),
      memberSeen: {},
    });
    return memberIds.length;
  }

  await chatRef.update({
    name: NDCPC_TEAM_CHAT_NAME,
    appScope: 'ndcpc',
    ndcpcKind: 'team',
    members: memberIds,
    memberInfo,
  });

  return memberIds.length;
}

export async function reconcileAllRoleState(adminDb: Firestore): Promise<{
  users: number;
  roleChats: number;
}> {
  const usersSnap = await adminDb.collection(USERS_COLLECTION).get();
  for (const userDoc of usersSnap.docs) {
    await reconcileUserRoleState(adminDb, userDoc.id);
  }

  const roles = await loadRoles(adminDb);
  let roleChats = 0;
  for (const role of roles) {
    if (!role.chatId || role.status === 'archived') continue;
    await reconcileRoleMembers(adminDb, role.id);
    roleChats++;
  }
  await reconcileNdcpcTeamChat(adminDb);
  return { users: usersSnap.size, roleChats };
}
