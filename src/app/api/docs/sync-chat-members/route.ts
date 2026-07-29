import { NextResponse, type NextRequest } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import {
  requireChatMembership,
  syncDocsForChatMembers,
} from '@/lib/server-docs-chat-share';

async function requireUid(request: NextRequest): Promise<string> {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const adminAuth = getAdminAuth(getAdminApp());
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
}

/**
 * After chat membership changes, expand ACL for every doc previously shared
 * into this chat (tracked via sourceChatIds).
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUid(request);
    const body = await request.json();
    const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const adminDb = getAdminDb(getAdminApp());
    const chatMembers = await requireChatMembership(adminDb, chatId, uid);
    const result = await syncDocsForChatMembers(adminDb, chatId, chatMembers);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to sync chat document members';
    return NextResponse.json(
      { error: message },
      { status: status === 401 || status === 403 || status === 404 ? status : 500 },
    );
  }
}
