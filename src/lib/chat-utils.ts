
import type { Chat, ChatMemberInfo, UserProfileData } from '@/types';
import { formatUserDisplayName } from '@/lib/formatting';

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

export function getChatDisplayDetails(
  chat: Chat,
  currentUserId: string,
  allUsers: UserProfileData[],
): { name: string; avatar: UserProfileData['avatar'] | null } | null {
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
      avatar: peerFullProfile?.avatar || peerInfoFromChat?.avatar || null,
    };
  }

  if (chat.type === 'group') {
    return {
      name: chat.name || 'Unnamed Circle',
      avatar: null,
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
