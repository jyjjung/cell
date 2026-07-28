import { buildMemberIds, normalizeSharedWith } from '@/lib/docs-utils';
import type { DocVisibility } from '@/types';

/** Fields needed to recompute ACL when sharing a doc into a chat. */
export type DocShareAclFields = {
  ownerId: string;
  sharedWith: string[];
  memberIds: string[];
  visibility: DocVisibility;
  sourceChatIds?: string[];
};

export function normalizeUidList(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.map(String).filter(Boolean)));
}

export function mergeSourceChatIds(
  existing: string[] | undefined,
  chatId: string,
): string[] {
  const ids = new Set(normalizeUidList(existing));
  if (chatId) ids.add(chatId);
  return Array.from(ids);
}

/**
 * Expand a document ACL so every chat member can open it and see it in Docs.
 * Owner stays owner; other chat members land in sharedWith/memberIds.
 */
export function applyChatMembersToDocAcl(
  doc: DocShareAclFields,
  chatMemberIds: string[],
  chatId?: string,
): DocShareAclFields & { changed: boolean } {
  const chatMembers = normalizeUidList(chatMemberIds);
  const mergedShared = normalizeSharedWith(
    'shared',
    [...normalizeUidList(doc.sharedWith), ...chatMembers],
    doc.ownerId,
  );
  const nextVisibility: DocVisibility = mergedShared.length > 0 ? 'shared' : 'private';
  const nextMemberIds = buildMemberIds(doc.ownerId, mergedShared);
  const nextSourceChatIds = chatId
    ? mergeSourceChatIds(doc.sourceChatIds, chatId)
    : normalizeUidList(doc.sourceChatIds);

  const changed =
    nextVisibility !== doc.visibility ||
    !sameStringSet(nextMemberIds, normalizeUidList(doc.memberIds)) ||
    !sameStringSet(mergedShared, normalizeUidList(doc.sharedWith)) ||
    (chatId != null && !normalizeUidList(doc.sourceChatIds).includes(chatId));

  return {
    ownerId: doc.ownerId,
    visibility: nextVisibility,
    sharedWith: mergedShared,
    memberIds: nextMemberIds,
    sourceChatIds: nextSourceChatIds,
    changed,
  };
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}
