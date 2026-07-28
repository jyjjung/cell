import { NextResponse, type NextRequest } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import {
  requireChatMembership,
  shareDocsWithChatMembers,
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
 * Expand ACL for docs already posted in a chat so every chat member sees them
 * under Docs. Only updates docs the caller already belongs to.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUid(request);
    const body = await request.json();
    const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
    const docIds = Array.isArray(body.docIds) ? body.docIds.map(String).filter(Boolean) : [];

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }
    if (docIds.length === 0) {
      return NextResponse.json({ updated: [], skipped: [] });
    }

    const adminDb = getAdminDb(getAdminApp());
    const chatMembers = await requireChatMembership(adminDb, chatId, uid);
    const result = await shareDocsWithChatMembers(adminDb, {
      chatId,
      chatMemberIds: chatMembers,
      docIds: docIds.slice(0, 50),
      actorId: uid,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to sync document sharing';
    return NextResponse.json(
      { error: message },
      { status: status === 401 || status === 403 || status === 404 ? status : 500 },
    );
  }
}
