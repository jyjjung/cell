
"use client";

import { useCallback } from 'react';
import type { UserProfileData, ChatMemberInfo } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useChatsContext } from '@/contexts/chats-context';
import { useChatsSubscription } from '@/hooks/use-chats-subscription';
import { getPrivateChatId } from '@/lib/chat-utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { resolveAvatarForApp } from '@/lib/user-avatars';
import { hasCapability } from '@/lib/role-capabilities';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';

const CHATS_COLLECTION = 'chats';

function birthdayDayEnd(birthdayDate: string): Date {
  const [year, month, day] = birthdayDate.split('-').map(Number);
  return new Date(year, month - 1, day + 1);
}

export function useChats() {
  const { currentUser } = useAuth();
  const ctx = useChatsContext();
  const { chats, loading } = useChatsSubscription({ enabled: !ctx });

  const localChats = ctx?.chats;

  const createPrivateChat = useCallback(async (peerUser: UserProfileData): Promise<string> => {
    if (!currentUser || !currentUser.firstName || !currentUser.lastName) {
      throw new Error('Current user not found or profile incomplete.');
    }
    if (!peerUser?.uid) throw new Error('Peer user is invalid.');

    const chatId = getPrivateChatId(currentUser.uid, peerUser.uid);
    if (localChats?.some((chat) => chat.id === chatId)) {
      return chatId;
    }

    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);

    const currentUserInfo: ChatMemberInfo = {
      firstName: currentUser.firstName!,
      lastName: currentUser.lastName!,
      avatar: resolveAvatarForApp(currentUser, 'cell') || DEFAULT_AVATAR_DATA,
    };

    const peerUserInfo: ChatMemberInfo = {
      firstName: peerUser.firstName,
      lastName: peerUser.lastName,
      avatar: resolveAvatarForApp(peerUser, 'cell') || DEFAULT_AVATAR_DATA,
    };

    const newChat = {
      type: 'private' as const,
      appScope: 'cell' as const,
      members: [currentUser.uid, peerUser.uid],
      memberInfo: {
        [currentUser.uid]: currentUserInfo,
        [peerUser.uid]: peerUserInfo,
      },
      createdAt: serverTimestamp() as Timestamp,
      lastMessageText: 'Chat created',
      lastMessageSentAt: serverTimestamp() as Timestamp,
      memberSeen: {
        [currentUser.uid]: serverTimestamp() as Timestamp,
        [peerUser.uid]: new Timestamp(0, 0),
      },
      memberUnreadCount: {
        [currentUser.uid]: 0,
        [peerUser.uid]: 0,
      },
    };

    await runTransaction(db, async (transaction) => {
      const chatDoc = await transaction.get(chatDocRef);
      if (chatDoc.exists()) return;
      transaction.set(chatDocRef, newChat);
    });
    return chatId;
  }, [currentUser, localChats]);

  const createGroupChat = useCallback(async (name: string, members: UserProfileData[]): Promise<string> => {
    if (!currentUser || !currentUser.firstName || !currentUser.lastName) {
      throw new Error('Identity context missing. Ensure profile is complete before establishing a circle.');
    }
    if (members.length === 0) throw new Error('Group chat must have members.');

    const allMemberProfiles = [currentUser, ...members];
    const memberIds = allMemberProfiles.map((m) => m.uid);

    const memberInfo: { [uid: string]: ChatMemberInfo } = {};
    allMemberProfiles.forEach((member) => {
      memberInfo[member.uid] = {
        firstName: member.firstName!,
        lastName: member.lastName!,
        avatar: resolveAvatarForApp(member, 'cell') || DEFAULT_AVATAR_DATA,
      };
    });

    const memberSeen: { [uid: string]: Timestamp | ReturnType<typeof serverTimestamp> } = {};
    const memberUnreadCount: { [uid: string]: number } = {};
    memberIds.forEach((id) => {
      memberSeen[id] = id === currentUser.uid ? serverTimestamp() : new Timestamp(0, 0);
      memberUnreadCount[id] = 0;
    });

    const newChat = {
      type: 'group' as const,
      appScope: 'cell' as const,
      name,
      members: memberIds,
      memberInfo,
      admins: [currentUser.uid],
      createdAt: serverTimestamp() as Timestamp,
      lastMessageText: `${formatUserDisplayName(currentUser)} created the circle.`,
      lastMessageSentAt: serverTimestamp() as Timestamp,
      memberSeen,
      memberUnreadCount,
    };

    const chatDocRef = doc(collection(db, CHATS_COLLECTION));
    const chatId = chatDocRef.id;

    await setDoc(chatDocRef, newChat);
    return chatId;
  }, [currentUser]);

  const createBirthdayChat = useCallback(async (
    birthdayPerson: UserProfileData,
    birthdayDate: string,
    members: UserProfileData[],
  ): Promise<string> => {
    if (!currentUser || !hasCapability(currentUser.capabilityKeys, 'birthday.chat') && !currentUser.isAdmin) {
      throw new Error('You do not have permission to use birthday chat.');
    }
    if (!birthdayPerson.uid || !birthdayDate) throw new Error('Birthday chat details are incomplete.');

    const memberProfiles = [currentUser, ...members, birthdayPerson]
      .filter((profile, index, all) => all.findIndex((item) => item.uid === profile.uid) === index);
    const memberIds = memberProfiles.map((profile) => profile.uid);
    const chatId = `birthday-${birthdayPerson.uid}-${birthdayDate}`;
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const memberInfo: { [uid: string]: ChatMemberInfo } = {};
    const memberSeen: { [uid: string]: Timestamp | ReturnType<typeof serverTimestamp> } = {};
    const memberUnreadCount: { [uid: string]: number } = {};

    memberProfiles.forEach((profile) => {
      memberInfo[profile.uid] = {
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        avatar: resolveAvatarForApp(profile, 'cell') || DEFAULT_AVATAR_DATA,
      };
      memberSeen[profile.uid] = profile.uid === currentUser.uid ? serverTimestamp() : new Timestamp(0, 0);
      memberUnreadCount[profile.uid] = 0;
    });

    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(chatDocRef);
      if (existing.exists()) {
        const existingData = existing.data();
        const existingMembers = Array.isArray(existingData.members) ? existingData.members : [];
        const existingAdmins = Array.isArray(existingData.admins) ? existingData.admins : [];

        if (
          existingData.kind === 'birthday' &&
          existingAdmins.includes(currentUser.uid)
        ) {
          const missingProfiles = memberProfiles.filter(
            (profile) => !existingMembers.includes(profile.uid),
          );

          if (missingProfiles.length > 0) {
            const mergedMemberInfo = {
              ...(existingData.memberInfo ?? {}),
              ...Object.fromEntries(
                missingProfiles.map((profile) => [
                  profile.uid,
                  {
                    firstName: profile.firstName ?? '',
                    lastName: profile.lastName ?? '',
                    avatar: resolveAvatarForApp(profile, 'cell') || DEFAULT_AVATAR_DATA,
                  },
                ]),
              ),
            };
            const mergedMemberSeen = {
              ...(existingData.memberSeen ?? {}),
              ...Object.fromEntries(missingProfiles.map((profile) => [profile.uid, new Timestamp(0, 0)])),
            };
            const mergedUnreadCount = {
              ...(existingData.memberUnreadCount ?? {}),
              ...Object.fromEntries(missingProfiles.map((profile) => [profile.uid, 0])),
            };

            transaction.update(chatDocRef, {
              members: [...existingMembers, ...missingProfiles.map((profile) => profile.uid)],
              memberInfo: mergedMemberInfo,
              memberSeen: mergedMemberSeen,
              memberUnreadCount: mergedUnreadCount,
            });
          }
        }
        return;
      }
      const expiresAt = Timestamp.fromDate(birthdayDayEnd(birthdayDate));
      transaction.set(chatDocRef, {
        type: 'group',
        appScope: 'cell',
        kind: 'birthday',
        birthdayPersonId: birthdayPerson.uid,
        birthdayDate,
        expiresAt,
        name: `${formatUserDisplayName(birthdayPerson)}'s birthday`,
        members: memberIds,
        memberInfo,
        admins: [currentUser.uid],
        createdAt: serverTimestamp(),
        lastMessageText: 'Birthday chat created',
        lastMessageSentAt: serverTimestamp(),
        memberSeen,
        memberUnreadCount,
      });
    });

    const headers = await getClientAuthHeaders();
    const response = await fetch('/api/chat/birthday-members', {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'Could not update birthday chat members.');
    }

    return chatId;
  }, [currentUser]);

  if (!ctx) {
    return { chats, loading, createPrivateChat, createGroupChat, createBirthdayChat };
  }

  return {
    chats: ctx.chats,
    loading: ctx.loading,
    createPrivateChat,
    createGroupChat,
    createBirthdayChat,
  };
}
