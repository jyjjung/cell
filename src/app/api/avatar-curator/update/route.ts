import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { AVATAR_CURATOR_EMAIL } from '@/lib/avatar-curator';
import { buildAvatarsPatch, resolveAvatarForApp } from '@/lib/user-avatars';
import type { AvatarData, ChatMemberInfo, UserProfileData } from '@/types';

const USERS_COLLECTION = 'users';
const CHATS_COLLECTION = 'chats';
const BATCH_LIMIT = 400;

async function assertAvatarCurator(uid: string): Promise<UserProfileData | null> {
  const adminDb = getAdminDb(getAdminApp());
  const snap = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  const profile = snap.data() as UserProfileData;
  if (profile.email?.toLowerCase() !== AVATAR_CURATOR_EMAIL.toLowerCase()) return null;
  return profile;
}

async function syncMemberInfoToChats(userId: string, profile: UserProfileData) {
  const adminDb = getAdminDb(getAdminApp());
  const chatsSnap = await adminDb
    .collection(CHATS_COLLECTION)
    .where('members', 'array-contains', userId)
    .get();

  if (chatsSnap.empty) return 0;

  let updated = 0;
  let batch = adminDb.batch();
  let batchCount = 0;

  for (const chatDoc of chatsSnap.docs) {
    const avatarApp = chatDoc.data()?.appScope === 'ndcpc' ? 'ndcpc' : 'cell';
    const memberInfo: ChatMemberInfo = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: resolveAvatarForApp(profile, avatarApp),
    };
    batch.update(chatDoc.ref, { [`memberInfo.${userId}`]: memberInfo });
    batchCount++;
    updated++;
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = adminDb.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  return updated;
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

    let callerUid: string;
    try {
      callerUid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const curator = await assertAvatarCurator(callerUid);
    if (!curator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const targetUserId = body?.targetUserId as string | undefined;
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const hasAvatar = body.avatar !== undefined;
    const hasToggle = body.avatarChangesEnabled !== undefined;
    if (!hasAvatar && !hasToggle) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const targetRef = adminDb.collection(USERS_COLLECTION).doc(targetUserId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existing = targetSnap.data() as UserProfileData;
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (hasToggle) {
      updateData.avatarChangesEnabled = body.avatarChangesEnabled === true;
    }

    if (hasAvatar) {
      const patch = buildAvatarsPatch(existing, 'cell', body.avatar as AvatarData);
      updateData.avatars = patch.avatars;
      updateData.avatar = patch.avatar;
    }

    await targetRef.update(updateData);

    if (hasAvatar) {
      const merged = { ...existing, ...updateData } as UserProfileData;
      await syncMemberInfoToChats(targetUserId, merged);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[avatar-curator/update]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
