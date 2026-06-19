import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { AvatarData, ChatMemberInfo, UserProfileData } from '@/types';

const CHATS_COLLECTION = 'chats';
const USERS_COLLECTION = 'users';
const BATCH_LIMIT = 400;

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
    const memberInfo: ChatMemberInfo = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar as AvatarData,
    };

    const chatsSnap = await adminDb
      .collection(CHATS_COLLECTION)
      .where('members', 'array-contains', uid)
      .get();

    if (chatsSnap.empty) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    let updated = 0;
    let batch = adminDb.batch();
    let batchCount = 0;

    for (const chatDoc of chatsSnap.docs) {
      batch.update(chatDoc.ref, { [`memberInfo.${uid}`]: memberInfo });
      batchCount++;
      updated++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[sync-profile-chats] Failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
