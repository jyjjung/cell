
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

const CHATS_COLLECTION = 'chats';

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
      avatar: currentUser.avatar || DEFAULT_AVATAR_DATA,
    };

    const peerUserInfo: ChatMemberInfo = {
      firstName: peerUser.firstName,
      lastName: peerUser.lastName,
      avatar: peerUser.avatar || DEFAULT_AVATAR_DATA,
    };

    const newChat = {
      type: 'private' as const,
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
        avatar: member.avatar || DEFAULT_AVATAR_DATA,
      };
    });

    const memberSeen: { [uid: string]: Timestamp | ReturnType<typeof serverTimestamp> } = {};
    memberIds.forEach((id) => {
      memberSeen[id] = id === currentUser.uid ? serverTimestamp() : new Timestamp(0, 0);
    });

    const newChat = {
      type: 'group' as const,
      name,
      members: memberIds,
      memberInfo,
      admins: [currentUser.uid],
      createdAt: serverTimestamp() as Timestamp,
      lastMessageText: `${formatUserDisplayName(currentUser)} created the circle.`,
      lastMessageSentAt: serverTimestamp() as Timestamp,
      memberSeen,
    };

    const chatDocRef = doc(collection(db, CHATS_COLLECTION));
    const chatId = chatDocRef.id;

    await setDoc(chatDocRef, newChat);
    return chatId;
  }, [currentUser]);

  if (!ctx) {
    return { chats, loading, createPrivateChat, createGroupChat };
  }

  return {
    chats: ctx.chats,
    loading: ctx.loading,
    createPrivateChat,
    createGroupChat,
  };
}
