import { FieldValue } from 'firebase-admin/firestore';
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import { verifyAuthToken, isAuthError } from '@/lib/api-auth';
import {
  GROUP_PHOTO_CHANGED_PREVIEW,
  GROUP_PHOTO_REMOVED_PREVIEW,
} from '@/lib/chat-utils';
import type { Chat } from '@/types';

function isGroupMember(chat: Chat, uid: string): boolean {
  const members = (chat.members || []).map((member) =>
    typeof member === 'string' ? member : (member as { uid?: string }).uid,
  );
  return members.includes(uid);
}

function storagePathFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const encoded = new URL(value).pathname.split('/o/')[1];
    return encoded ? decodeURIComponent(encoded.split('?')[0]) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (isAuthError(authResult)) return authResult;

  let body: { chatId?: string; photoURL?: string; remove?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { chatId, photoURL, remove } = body;
  if (!chatId || typeof chatId !== 'string') {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }
  if (!remove && (!photoURL || typeof photoURL !== 'string')) {
    return NextResponse.json({ error: 'photoURL is required' }, { status: 400 });
  }

  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const chatRef = adminDb.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chat = { id: chatSnap.id, ...chatSnap.data() } as Chat;
    if (chat.type !== 'group') {
      return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });
    }

    if (!isGroupMember(chat, authResult.uid)) {
      return NextResponse.json(
        { error: 'You must be a member of this group to change its photo.' },
        { status: 403 },
      );
    }

    const announcement = remove ? GROUP_PHOTO_REMOVED_PREVIEW : GROUP_PHOTO_CHANGED_PREVIEW;
    const systemEvent = remove ? 'groupPhotoRemoved' : 'groupPhotoChanged';
    const messageRef = chatRef.collection('messages').doc();
    const batch = adminDb.batch();

    batch.set(messageRef, {
      senderId: authResult.uid,
      systemEvent,
      createdAt: FieldValue.serverTimestamp(),
      seenBy: [authResult.uid],
    });

    const chatUpdate: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      lastMessageText: announcement,
      lastMessageSentAt: FieldValue.serverTimestamp(),
      lastMessageSenderId: authResult.uid,
    };

    if (remove) {
      chatUpdate.photoURL = FieldValue.delete();
    } else {
      chatUpdate.photoURL = photoURL;
    }

    batch.update(chatRef, chatUpdate);
    await batch.commit();
    const previousPath = storagePathFromUrl(chat.photoURL);
    if (previousPath?.startsWith(`chats/${chatId}/`) && previousPath !== storagePathFromUrl(photoURL)) {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cell-abca4.firebasestorage.app';
      if (bucketName) {
        await getAdminStorage(adminApp).bucket(bucketName).file(previousPath).delete({
          ignoreNotFound: true,
        }).catch((error) => console.warn('[group-photo] Previous image cleanup failed:', error));
      }
    }

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
      announcement,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[group-photo] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
