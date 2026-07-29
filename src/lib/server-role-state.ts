import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import {
  deriveRoleState,
  normalizeRoleCapabilities,
  type DerivedRoleState,
  type RoleCapability,
} from '@/lib/role-capabilities';
import { syncDocsForChatMembers } from '@/lib/server-docs-chat-share';

const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';
const CHATS_COLLECTION = 'chats';

type ServerRole = {
  id: string;
  name: string;
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
      capabilities: normalizeRoleCapabilities(data.capabilities),
      status: data.status === 'archived' ? 'archived' : 'active',
      chatId: typeof data.chatId === 'string' ? data.chatId : null,
    };
  });
}

export async function reconcileUserRoleState(
  adminDb: Firestore,
  userId: string,
  requestedRoleIds?: readonly string[],
): Promise<DerivedRoleState> {
  const [userSnap, roles] = await Promise.all([
    adminDb.collection(USERS_COLLECTION).doc(userId).get(),
    loadRoles(adminDb),
  ]);
  if (!userSnap.exists) throw new Error('User not found.');

  const profile = userSnap.data()!;
  const state = deriveRoleState(requestedRoleIds ?? profile.roleIds, roles);
  const userRef = userSnap.ref;
  await userRef.update({
      roleIds: state.roleIds,
      capabilityKeys: state.capabilityKeys,
      roleSyncVersion: 1,
      roleSyncedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
  });

  const previousRoleIds = Array.isArray(profile.roleIds) ? profile.roleIds : [];
  const affectedRoleIds = new Set([...previousRoleIds, ...state.roleIds]);
  for (const role of roles) {
    if (role.chatId && affectedRoleIds.has(role.id)) {
      await reconcileRoleMembers(adminDb, role.id);
    }
  }
  return state;
}

export async function reconcileRoleMembers(adminDb: Firestore, roleId: string): Promise<number> {
  const [roleSnap, usersSnap] = await Promise.all([
    adminDb.collection(ROLES_COLLECTION).doc(roleId).get(),
    adminDb.collection(USERS_COLLECTION).get(),
  ]);
  if (!roleSnap.exists) throw new Error('Role not found.');

  const roleData = roleSnap.data()!;
  if (roleData.status === 'archived' || typeof roleData.chatId !== 'string') return 0;

  const assignedUsers = usersSnap.docs.filter((userDoc) => {
    const ids = userDoc.data().roleIds;
    return Array.isArray(ids) && ids.includes(roleId);
  });
  const memberIds = assignedUsers.map((userDoc) => userDoc.id);
  const memberInfo = Object.fromEntries(assignedUsers.map((userDoc) => {
    const user = userDoc.data();
    return [userDoc.id, {
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar || DEFAULT_AVATAR_DATA,
    }];
  }));

  const chatRef = adminDb.collection(CHATS_COLLECTION).doc(roleData.chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    await chatRef.set({
      type: 'group',
      name: roleData.name,
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
    members: memberIds,
    memberInfo,
    admins: existingAdmins,
  });

  // Keep Docs ACL in sync when worship/role circle membership changes.
  // Bounded query (≤100 docs); no standing listeners or extra paid services.
  await syncDocsForChatMembers(adminDb, roleData.chatId, memberIds).catch((err) => {
    console.error('[reconcileRoleMembers] Doc ACL sync failed:', err);
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
  return { users: usersSnap.size, roleChats };
}
