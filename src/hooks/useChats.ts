
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Chat, AppUser, UserProfileData, ChatMemberInfo } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { getPrivateChatId } from '@/lib/chat-utils';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';

const CHATS_COLLECTION = 'chats';

// Singleton state
let globalChats: Chat[] = [];
let globalLoading = true;
let subscribers = new Set<() => void>();
let unsubscribeFn: (() => void) | null = null;
let activeUid: string | null = null;

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

export function useChats() {
  const { currentUser } = useAuth();
  const [state, setState] = useState({
    chats: globalChats,
    loading: globalLoading,
  });

  useEffect(() => {
    if (!currentUser?.uid) {
      setState({ chats: [], loading: false });
      return;
    }

    const handleChange = () => {
      setState({
        chats: globalChats,
        loading: globalLoading,
      });
    };

    subscribers.add(handleChange);

    // If user changed, we MUST reset the listener
    if (activeUid !== currentUser.uid) {
        if (unsubscribeFn) {
            unsubscribeFn();
            unsubscribeFn = null;
        }
        activeUid = currentUser.uid;
        globalChats = [];
        globalLoading = true;
    }

    // Start listener if it's the first subscriber for this user
    if (!unsubscribeFn) {
        const chatsQuery = query(
            collection(db, CHATS_COLLECTION),
            where('members', 'array-contains', currentUser.uid)
        );

        unsubscribeFn = onSnapshot(
            chatsQuery,
            (snapshot) => {
                const chatsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Chat));
                
                // Sort on the client to ensure consistent order across different query types
                chatsData.sort((a, b) => {
                    const getMillis = (c: Chat) => {
                        const ts = c.lastMessageSentAt || c.createdAt;
                        if (!ts) return 0;
                        if (typeof (ts as any).toMillis === 'function') return (ts as any).toMillis();
                        if (ts instanceof Date) return ts.getTime();
                        return 0;
                    };
                    return getMillis(b) - getMillis(a);
                });

                globalChats = chatsData;
                globalLoading = false;
                notifySubscribers();
            }, (error) => {
                console.error("Error fetching user chats:", error);
                globalLoading = false;
                notifySubscribers();
            }
        );
    } else {
        // Already loading or loaded for this user
        handleChange();
    }

    return () => {
      subscribers.delete(handleChange);
      if (subscribers.size === 0 && unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = null;
        activeUid = null;
      }
    };
  }, [currentUser?.uid]);

  const createPrivateChat = useCallback(async (peerUser: UserProfileData): Promise<string> => {
    if (!currentUser || !currentUser.firstName || !currentUser.lastName) throw new Error("Current user not found or profile incomplete.");
    if (!peerUser?.uid) throw new Error("Peer user is invalid.");

    const chatId = getPrivateChatId(currentUser.uid, peerUser.uid);
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);

    const chatDoc = await getDoc(chatDocRef);
    if (chatDoc.exists()) {
      return chatId; // Chat already exists
    }

    const currentUserInfo: ChatMemberInfo = {
        firstName: currentUser.firstName!,
        lastName: currentUser.lastName!,
        avatar: currentUser.avatar || DEFAULT_AVATAR_DATA
    }

    const peerUserInfo: ChatMemberInfo = {
        firstName: peerUser.firstName,
        lastName: peerUser.lastName,
        avatar: peerUser.avatar || DEFAULT_AVATAR_DATA
    }

    const newChat: Omit<Chat, 'id'> = {
      type: 'private',
      members: [currentUser.uid, peerUser.uid],
      memberInfo: {
        [currentUser.uid]: currentUserInfo,
        [peerUser.uid]: peerUserInfo
      },
      createdAt: serverTimestamp() as Timestamp,
      lastMessageText: 'Chat created',
      lastMessageSentAt: serverTimestamp() as Timestamp,
      memberSeen: {
        [currentUser.uid]: serverTimestamp() as Timestamp,
        [peerUser.uid]: new Timestamp(0, 0), // Not seen by peer yet
      }
    };

    setDoc(chatDocRef, newChat).catch(e => console.error("Error creating private chat:", e));
    return chatId;
  }, [currentUser]);

  const createGroupChat = useCallback(async (name: string, members: UserProfileData[]): Promise<string> => {
    if (!currentUser || !currentUser.firstName || !currentUser.lastName) {
        throw new Error("Identity context missing. Ensure profile is complete before establishing a circle.");
    }
    if (members.length === 0) throw new Error("Group chat must have members.");

    const allMemberProfiles = [currentUser, ...members];
    const memberIds = allMemberProfiles.map(m => m.uid);

    const memberInfo: { [uid: string]: ChatMemberInfo } = {};
    allMemberProfiles.forEach(member => {
        memberInfo[member.uid] = {
            firstName: member.firstName!,
            lastName: member.lastName!,
            avatar: member.avatar || DEFAULT_AVATAR_DATA
        }
    });

    const memberSeen: { [uid: string]: any } = {};
    memberIds.forEach(id => {
      // Every member starts with a 'zero' timestamp except the creator
      memberSeen[id] = id === currentUser.uid ? serverTimestamp() : new Timestamp(0, 0);
    });

    const newChat: Omit<Chat, 'id'> = {
      type: 'group',
      name,
      members: memberIds,
      memberInfo,
      admins: [currentUser.uid], // Creator is the first admin
      createdAt: serverTimestamp() as Timestamp,
      lastMessageText: `${currentUser.firstName} created the circle.`,
      lastMessageSentAt: serverTimestamp() as Timestamp,
      memberSeen,
    };

    const chatDocRef = doc(collection(db, CHATS_COLLECTION));
    const chatId = chatDocRef.id;
    
    // We do not await this to ensure the UI can transition immediately
    setDoc(chatDocRef, newChat).catch(e => {
        console.error("[useChats] Fatal error during circle establishment:", e);
    });
    
    return chatId;
  }, [currentUser]);

  return { ...state, createPrivateChat, createGroupChat };
}
