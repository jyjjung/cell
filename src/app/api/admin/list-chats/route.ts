import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import type { AdminChatSummary, ChatMemberInfo } from '@/types';

function timestampToMs(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const maybe = value as { toMillis?: () => number; _seconds?: number; seconds?: number };
  if (typeof maybe.toMillis === 'function') {
    try {
      return maybe.toMillis();
    } catch {
      return null;
    }
  }
  const seconds = maybe._seconds ?? maybe.seconds;
  return typeof seconds === 'number' ? seconds * 1000 : null;
}

export async function GET(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const callerIsAdmin = await userHasAdminAccess(adminDb, uid);
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Caller is not an admin.' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('chats').get();
    const chats: AdminChatSummary[] = snapshot.docs.map((chatDoc) => {
      const data = chatDoc.data();
      const memberInfo = (data.memberInfo ?? {}) as { [uid: string]: ChatMemberInfo };
      return {
        id: chatDoc.id,
        type: data.type === 'group' ? 'group' : 'private',
        name: typeof data.name === 'string' ? data.name : undefined,
        members: Array.isArray(data.members) ? data.members.filter((m): m is string => typeof m === 'string') : [],
        memberInfo,
        lastMessageText: typeof data.lastMessageText === 'string' ? data.lastMessageText : undefined,
        lastMessageSentAtMs: timestampToMs(data.lastMessageSentAt),
        createdAtMs: timestampToMs(data.createdAt),
      };
    });

    chats.sort((a, b) => (b.lastMessageSentAtMs ?? 0) - (a.lastMessageSentAtMs ?? 0));

    return NextResponse.json({ chats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred on the server.';
    console.error('[admin/list-chats] Failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
