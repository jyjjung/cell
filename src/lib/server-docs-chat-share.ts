import type { Firestore } from 'firebase-admin/firestore';
import {
  applyChatMembersToDocAcl,
  normalizeUidList,
  type DocShareAclFields,
} from '@/lib/docs-chat-share';
import type { DocVisibility } from '@/types';

export async function requireChatMembership(
  adminDb: Firestore,
  chatId: string,
  uid: string,
): Promise<string[]> {
  const chatSnap = await adminDb.collection('chats').doc(chatId).get();
  if (!chatSnap.exists) {
    throw Object.assign(new Error('Chat not found'), { status: 404 });
  }
  const members = normalizeUidList(chatSnap.data()?.members);
  if (!members.includes(uid)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return members;
}

export function docAclFromData(data: Record<string, unknown>): DocShareAclFields {
  return {
    ownerId: String(data.ownerId || ''),
    sharedWith: normalizeUidList(data.sharedWith),
    memberIds: normalizeUidList(data.memberIds),
    visibility: (data.visibility === 'shared' ? 'shared' : 'private') as DocVisibility,
    sourceChatIds: normalizeUidList(data.sourceChatIds),
  };
}

export async function shareDocsWithChatMembers(
  adminDb: Firestore,
  input: {
    chatId: string;
    chatMemberIds: string[];
    docIds: string[];
    /** Only expand docs the actor already belongs to (prevents self-grant). */
    actorId: string;
    /**
     * When true, skip the actor membership check. Use only after verifying the
     * doc is already linked to this chat via sourceChatIds (membership sync).
     */
    trustSourceChatLink?: boolean;
  },
): Promise<{ updated: string[]; skipped: string[] }> {
  const updated: string[] = [];
  const skipped: string[] = [];
  const uniqueDocIds = Array.from(new Set(input.docIds.filter(Boolean)));

  for (const docId of uniqueDocIds) {
    const ref = adminDb.collection('docs').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      skipped.push(docId);
      continue;
    }
    const data = snap.data()!;
    const acl = docAclFromData(data);
    const linkedToChat = normalizeUidList(acl.sourceChatIds).includes(input.chatId);
    const actorCanAccess =
      acl.memberIds.includes(input.actorId) || acl.ownerId === input.actorId;

    if (!actorCanAccess && !(input.trustSourceChatLink && linkedToChat)) {
      skipped.push(docId);
      continue;
    }

    const next = applyChatMembersToDocAcl(acl, input.chatMemberIds, input.chatId);
    if (!next.changed) {
      skipped.push(docId);
      continue;
    }

    await ref.update({
      visibility: next.visibility,
      sharedWith: next.sharedWith,
      memberIds: next.memberIds,
      sourceChatIds: next.sourceChatIds,
    });
    updated.push(docId);
  }

  return { updated, skipped };
}
