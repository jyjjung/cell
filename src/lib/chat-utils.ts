
import type { Chat, ChatMemberInfo, ChatMessage, UserProfileData, AvatarData } from '@/types';
import { formatUserDisplayName } from '@/lib/formatting';
import { mergeAvatarData } from '@/lib/avatar-utils';
import {
  createDefaultNdcpcAvatar,
  resolveAvatarForApp,
  sanitizeNdcpcAvatar,
  type AvatarAppId,
} from '@/lib/user-avatars';

import { getDeletedContentPreview } from '@/lib/deleted-content';
import type { DeletedMessageContentType } from '@/types';

export function chatAvatarApp(chat?: Pick<Chat, 'appScope'> | null): AvatarAppId {
  return chat?.appScope === 'ndcpc' ? 'ndcpc' : 'cell';
}

export const GROUP_PHOTO_CHANGED_PREVIEW = 'changed the group chat picture.';
export const GROUP_PHOTO_REMOVED_PREVIEW = 'removed the group chat picture.';

type MessagePreviewFields = Pick<
  ChatMessage,
  | 'text'
  | 'imageUrl'
  | 'eventId'
  | 'setlistId'
  | 'setlistName'
  | 'rosterId'
  | 'qtDate'
  | 'cleaningDate'
  | 'songId'
  | 'songTitle'
  | 'sheetKey'
  | 'poll'
  | 'docId'
  | 'isDeleted'
  | 'deletedContentType'
  | 'systemEvent'
>;

export function formatChatMessagePreview(message: MessagePreviewFields): string {
  if (message.isDeleted) {
    const type = (message.deletedContentType ?? 'message') as DeletedMessageContentType;
    return getDeletedContentPreview(type);
  }
  if (message.systemEvent === 'groupPhotoChanged') return GROUP_PHOTO_CHANGED_PREVIEW;
  if (message.systemEvent === 'groupPhotoRemoved') return GROUP_PHOTO_REMOVED_PREVIEW;

  let preview = message.text?.trim() || '📷 Image';
  if (message.eventId) preview = '📅 Event';
  if (message.setlistId) {
    preview = message.setlistName?.trim()
      ? `🎵 Setlist: ${message.setlistName.trim()}`
      : '🎵 Setlist';
  }
  if (message.rosterId) preview = '📋 Roster';
  if (message.qtDate) preview = '📖 QT Roster';
  if (message.cleaningDate) preview = '🧹 Cleaning Roster';
  if (message.songId) preview = `🎵 Chord Sheet: ${message.songTitle || 'Song'} (${message.sheetKey || ''})`;
  if (message.poll) preview = `📊 Poll: ${message.poll.question}`;
  if (message.docId) preview = '📄 Document';
  return preview;
}

export function isMutedChatEvent(message: Pick<ChatMessage, 'isDeleted' | 'systemEvent'>): boolean {
  return !!message.isDeleted || !!message.systemEvent;
}

/** Map message id → sorted display names for members whose read cursor ends on that message. */
export function getLastSeenNamesPerMessage(params: {
  messages: ChatMessage[];
  memberSeen?: Chat['memberSeen'];
  members: string[];
  currentUserId: string;
  getDisplayName: (uid: string) => string;
}): Record<string, string[]> {
  const { messages, memberSeen, members, currentUserId, getDisplayName } = params;
  const map: Record<string, string[]> = {};
  const activeMemberIds = new Set(members);

  const readable = messages
    .filter((m) => m.createdAt && !isMutedChatEvent(m))
    .sort((a, b) => {
      const diff = a.createdAt!.toMillis() - b.createdAt!.toMillis();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

  for (const [uid, lastSeenTimestamp] of Object.entries(memberSeen || {})) {
    if (uid === currentUserId) continue;
    if (!activeMemberIds.has(uid)) continue;
    if (!lastSeenTimestamp) continue;

    const seenMs = lastSeenTimestamp.toMillis();
    let frontier: ChatMessage | undefined;

    for (const message of readable) {
      if (message.createdAt!.toMillis() <= seenMs) {
        frontier = message;
      } else {
        break;
      }
    }

    if (!frontier) continue;

    const name = getDisplayName(uid);
    if (!map[frontier.id]) map[frontier.id] = [];
    if (!map[frontier.id].includes(name)) {
      map[frontier.id].push(name);
    }
  }

  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => a.localeCompare(b));
  }

  return map;
}

/**
 * Generates a deterministic, consistent chat ID for a private (one-to-one) chat
 * between two users. The order of user IDs does not matter.
 * @param uid1 The UID of the first user.
 * @param uid2 The UID of the second user.
 * @returns A string representing the unique chat ID for the two users.
 */
export function getPrivateChatId(uid1: string, uid2: string): string {
  // Sort the UIDs alphabetically to ensure consistency
  const ids = [uid1, uid2].sort();
  return ids.join('_');
}

/**
 * Robustly gets a user's full name from a ChatMemberInfo object,
 * gracefully handling both old and new data structures.
 * @param memberInfo The member info object from a chat document.
 * @returns The user's full name, or null if not found.
 */
export function getMemberFullName(memberInfo: ChatMemberInfo | null | undefined): string | null {
    if (!memberInfo) {
        return null;
    }

    if (memberInfo.firstName || memberInfo.lastName) {
        return `${memberInfo.firstName || ''} ${memberInfo.lastName || ''}`.trim();
    }

    return null;
}

/** Compact chat label with last initial, e.g. "Jane D." */
export function getMemberDisplayName(memberInfo: ChatMemberInfo | null | undefined, fallback = 'Someone'): string {
    return formatUserDisplayName(memberInfo, fallback);
}

/** Prefer the live per-app profile avatar; fall back to denormalized memberInfo. */
export function resolveChatAvatar(
  peerProfile?: UserProfileData | null,
  memberInfo?: ChatMemberInfo | null,
  appScope?: AvatarAppId | Chat['appScope'] | null,
): AvatarData | undefined {
  const app: AvatarAppId = appScope === 'ndcpc' ? 'ndcpc' : 'cell';
  if (peerProfile) {
    return resolveAvatarForApp(peerProfile, app);
  }
  if (app === 'ndcpc') {
    const hint = {
      firstName: memberInfo?.firstName,
      lastName: memberInfo?.lastName,
    };
    if (!memberInfo?.avatar) return createDefaultNdcpcAvatar(hint);
    // Never paint a Cell/em. denormalized avatar into preschool chat.
    return sanitizeNdcpcAvatar(memberInfo.avatar, hint);
  }
  return mergeAvatarData(undefined, memberInfo?.avatar);
}

export function getChatDisplayDetails(
  chat: Chat,
  currentUserId: string,
  allUsers: UserProfileData[],
): { name: string; avatar: UserProfileData['avatar'] | null; photoURL?: string | null } | null {
  if (chat.type === 'private') {
    const peerId = chat.members.find((id) => id !== currentUserId);
    const peerInfoFromChat = peerId ? chat.memberInfo[peerId] : null;
    const peerFullProfile = peerId ? allUsers.find((u) => u.uid === peerId) : null;

    let name = 'Private Chat';
    if (peerFullProfile?.firstName) {
      name = formatUserDisplayName(peerFullProfile);
    } else if (peerInfoFromChat) {
      name = getMemberDisplayName(peerInfoFromChat, 'Private Chat');
    } else if (!peerId && chat.members.length === 1) {
      name = 'Archived Conversation';
    }

    return {
      name,
      avatar: resolveChatAvatar(peerFullProfile, peerInfoFromChat, chatAvatarApp(chat)) || null,
    };
  }

  if (chat.type === 'group') {
    return {
      name: chat.name || 'Unnamed chat',
      avatar: null,
      photoURL: chat.photoURL || null,
    };
  }

  return null;
}

export function resolveChatUserName(
  uid: string,
  chat: Chat,
  usersById: Map<string, UserProfileData>,
  fallback = 'Someone',
): string {
  const profile = usersById.get(uid);
  if (profile) return formatUserDisplayName(profile, fallback);
  return getMemberDisplayName(chat.memberInfo[uid], fallback);
}
