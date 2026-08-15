import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { resolveAvatarForApp, type AvatarAppId } from '@/lib/user-avatars';
import { hasNdcpcManageAccess } from '@/lib/ndcpc/team-chat';
import { normalizeRoleScope } from '@/lib/role-capabilities';
import type { AvatarData, ChatMemberInfo, UserProfileData } from '@/types';

const CHATS_COLLECTION = 'chats';
const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';
const BATCH_LIMIT = 400;

function avatarAppForChat(data: { appScope?: string } | undefined): AvatarAppId {
  return data?.appScope === 'ndcpc' ? 'ndcpc' : 'cell';
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSnap = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = userSnap.data() as UserProfileData;
    const ndcpcRoleIds = Array.isArray(profile.ndcpcRoleIds) ? profile.ndcpcRoleIds : [];
    const canManageNdcpc = hasNdcpcManageAccess({
      capabilityKeys: profile.capabilityKeys,
      ndcpcRole: profile.ndcpcRole,
    });

    const [chatsSnap, rolesSnap] = await Promise.all([
      adminDb.collection(CHATS_COLLECTION).where('members', 'array-contains', uid).get(),
      adminDb.collection(ROLES_COLLECTION).get(),
    ]);

    if (chatsSnap.empty) {
      return NextResponse.json({ success: true, updated: 0, pruned: 0 });
    }

    const roleChatIds = new Map<string, string>();
    for (const roleDoc of rolesSnap.docs) {
      const data = roleDoc.data();
      if (data.status === 'archived') continue;
      if (typeof data.chatId !== 'string') continue;
      if (normalizeRoleScope(data.appScope) !== 'ndcpc') continue;
      roleChatIds.set(data.chatId, roleDoc.id);
    }

    let updated = 0;
    let pruned = 0;
    let batch = adminDb.batch();
    let batchCount = 0;

    const commitIfNeeded = async (force = false) => {
      if (batchCount === 0) return;
      if (!force && batchCount < BATCH_LIMIT) return;
      await batch.commit();
      batch = adminDb.batch();
      batchCount = 0;
    };

    for (const chatDoc of chatsSnap.docs) {
      const data = chatDoc.data() as {
        appScope?: string;
        ndcpcKind?: string;
        memberInfo?: Record<string, unknown>;
      };

      if (data.appScope === 'ndcpc') {
        let allowed = true;
        if (data.ndcpcKind === 'team') {
          allowed = canManageNdcpc;
        } else {
          const roleId = roleChatIds.get(chatDoc.id);
          // Role circles: only assigned role holders. Unknown ndcpc chats stay until classified.
          if (roleId) {
            allowed = ndcpcRoleIds.includes(roleId);
          } else if (data.ndcpcKind === 'role') {
            allowed = false;
          }
        }

        if (!allowed) {
          batch.update(chatDoc.ref, {
            members: FieldValue.arrayRemove(uid),
            admins: FieldValue.arrayRemove(uid),
            [`memberInfo.${uid}`]: FieldValue.delete(),
          });
          batchCount++;
          pruned++;
          await commitIfNeeded();
          continue;
        }
      }

      const avatarApp = avatarAppForChat(data);
      const memberInfo: ChatMemberInfo = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: resolveAvatarForApp(profile, avatarApp) as AvatarData,
      };
      batch.update(chatDoc.ref, { [`memberInfo.${uid}`]: memberInfo });
      batchCount++;
      updated++;
      await commitIfNeeded();
    }

    await commitIfNeeded(true);

    return NextResponse.json({ success: true, updated, pruned });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[sync-profile-chats] Failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
