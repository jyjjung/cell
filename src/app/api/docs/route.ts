import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import {
  buildMemberIds,
  DOC_TITLE_MAX,
  normalizeSharedWith,
} from '@/lib/docs-utils';
import { sanitizeRichHtml } from '@/lib/sanitize-html';
import { applyChatMembersToDocAcl, mergeSourceChatIds } from '@/lib/docs-chat-share';
import { requireChatMembership } from '@/lib/server-docs-chat-share';
import type { DocVisibility } from '@/types';

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

export async function GET(request: NextRequest) {
  try {
    const uid = await requireUid(request);
    const adminDb = getAdminDb(getAdminApp());
    const snap = await adminDb
      .collection('docs')
      .where('memberIds', 'array-contains', uid)
      .get();

    const docs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aMs = (a as { updatedAt?: { toMillis?: () => number; _seconds?: number } }).updatedAt;
        const bMs = (b as { updatedAt?: { toMillis?: () => number; _seconds?: number } }).updatedAt;
        const aVal = aMs?.toMillis?.() ?? (aMs?._seconds ? aMs._seconds * 1000 : 0);
        const bVal = bMs?.toMillis?.() ?? (bMs?._seconds ? bMs._seconds * 1000 : 0);
        return bVal - aVal;
      });
    return NextResponse.json({ docs });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await requireUid(request);
    const body = await request.json();
    const title = String(body.title ?? '').trim().slice(0, DOC_TITLE_MAX);
    const content = sanitizeRichHtml(
      typeof body.content === 'string' ? body.content : '<p></p>',
    );
    const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';

    let visibility = (body.visibility === 'shared' ? 'shared' : 'private') as DocVisibility;
    let sharedInput = Array.isArray(body.sharedWith) ? body.sharedWith.map(String) : [];
    let sourceChatIds: string[] = [];

    const adminDb = getAdminDb(getAdminApp());

    // Prefer server-resolved chat membership over client-supplied member lists.
    if (chatId) {
      const chatMembers = await requireChatMembership(adminDb, chatId, uid);
      const acl = applyChatMembersToDocAcl(
        {
          ownerId: uid,
          sharedWith: [],
          memberIds: [uid],
          visibility: 'private',
        },
        chatMembers,
        chatId,
      );
      visibility = acl.visibility;
      sharedInput = acl.sharedWith;
      sourceChatIds = acl.sourceChatIds || [chatId];
    }

    const sharedWith = normalizeSharedWith(visibility, sharedInput, uid);

    if (visibility === 'shared' && sharedWith.length === 0) {
      return NextResponse.json({ error: 'Pick at least one person to share with' }, { status: 400 });
    }

    const memberIds = buildMemberIds(uid, sharedWith);
    const payload: Record<string, unknown> = {
      title,
      content,
      visibility,
      ownerId: uid,
      authorIds: [uid],
      sharedWith,
      memberIds,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    };
    if (sourceChatIds.length > 0) {
      payload.sourceChatIds = mergeSourceChatIds(sourceChatIds, chatId);
    }

    const ref = await adminDb.collection('docs').add(payload);

    return NextResponse.json({ id: ref.id });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to create document';
    const safeStatus = status === 401 || status === 403 || status === 404 ? status : 500;
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : safeStatus });
  }
}
