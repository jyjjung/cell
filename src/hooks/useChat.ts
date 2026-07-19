
"use client";

import { useCallback } from 'react';
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { usePageLoading } from '@/contexts/page-loading-context';
import { formatUserDisplayName } from '@/lib/formatting';
import {
  GROUP_PHOTO_CHANGED_PREVIEW,
  GROUP_PHOTO_REMOVED_PREVIEW,
} from '@/lib/chat-utils';
import { primeMediaUrl } from '@/lib/media-cache';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { UserProfileData } from '@/types';

const CHATS_COLLECTION = 'chats';

function actorLabel(user: { firstName?: string | null; lastName?: string | null; displayName?: string | null }): string {
  return formatUserDisplayName(user, 'Someone');
}

async function dispatchChatPush(chatId: string, messageId: string, text: string, senderId: string) {
  try {
    const headers = await getClientAuthHeaders();
    await fetch('/api/send-chat-push', {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId, messageId, text, senderId }),
    });
  } catch (error) {
    console.error('[useChat] Push dispatch failed:', error);
  }
}

export function useChat(chatId: string) {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { setIsPageLoading } = usePageLoading();

    const renameGroup = useCallback((newName: string) => {
        if (!currentUser) return;
        const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
        updateDoc(chatDocRef, { name: newName }).catch((error: any) => {
            console.error("Error renaming group:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not rename group." });
        });
        toast({ title: "Renaming group..." });
    }, [chatId, currentUser, toast]);

    const leaveGroup = useCallback(() => {
        if (!currentUser) return;
        const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
        updateDoc(chatDocRef, {
            members: arrayRemove(currentUser.uid),
            admins: arrayRemove(currentUser.uid),
            [`memberInfo.${currentUser.uid}`]: deleteField(),
        }).catch((error: any) => {
            console.error("Error leaving group:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not leave group." });
        });
        
        toast({ title: "You have left the group." });
        setIsPageLoading(true);
        router.push('/chat');
    }, [chatId, currentUser, router, toast, setIsPageLoading]);

    const deleteChat = useCallback(async () => {
      try {
        const headers = await getClientAuthHeaders();
        const response = await fetch('/api/admin/delete-chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ chatId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not delete chat.');
        toast({ title: "Chat deleted." });
        setIsPageLoading(true);
        router.push('/chat');
      } catch (error) {
        console.error("Error deleting chat:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete chat." });
      }
    }, [chatId, router, toast, setIsPageLoading]);

    const addMembers = useCallback((membersToAdd: UserProfileData[]) => {
      if (!currentUser || membersToAdd.length === 0) return;
      const chatDocRef = doc(db, CHATS_COLLECTION, chatId);

      const memberIdsToAdd = membersToAdd.map(m => m.uid);
      const memberInfoUpdates: { [key: string]: any } = {};
      membersToAdd.forEach(member => {
        memberInfoUpdates[`memberInfo.${member.uid}`] = {
          firstName: member.firstName,
          lastName: member.lastName,
          avatar: member.avatar || DEFAULT_AVATAR_DATA,
        };
      });

      updateDoc(chatDocRef, {
        members: arrayUnion(...memberIdsToAdd),
        ...memberInfoUpdates
      }).catch((error: any) => {
        console.error("Error adding members:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not add members." });
      });
      toast({ title: "Adding members..." });
    }, [chatId, currentUser, toast]);

    const removeMember = useCallback((uidToRemove: string) => {
      if (!currentUser || !uidToRemove) return;
      const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
      updateDoc(chatDocRef, {
        members: arrayRemove(uidToRemove),
        admins: arrayRemove(uidToRemove),
        [`memberInfo.${uidToRemove}`]: deleteField()
      }).catch((error: any) => {
        console.error("Error removing member:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not remove member." });
      });
      toast({ title: "Removing member..." });
    }, [chatId, currentUser, toast]);

    const updateGroupPhoto = useCallback(async (photoURL: string) => {
      if (!currentUser) return;

      try {
        const headers = await getClientAuthHeaders();
        const response = await fetch('/api/chat/group-photo', {
          method: 'POST',
          headers,
          body: JSON.stringify({ chatId, photoURL }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Could not update group photo.');
        }

        primeMediaUrl(photoURL);
        const pushBody = `${actorLabel(currentUser)} ${GROUP_PHOTO_CHANGED_PREVIEW}`;
        void dispatchChatPush(chatId, data.messageId, pushBody, currentUser.uid);
        toast({ title: "Group photo updated" });
      } catch (error) {
        console.error("Error updating group photo:", error);
        const description =
          error instanceof Error && error.message
            ? error.message
            : "Could not update group photo.";
        toast({ variant: "destructive", title: "Error", description });
        throw error;
      }
    }, [chatId, currentUser, toast]);

    const removeGroupPhoto = useCallback(async () => {
      if (!currentUser) return;

      try {
        const headers = await getClientAuthHeaders();
        const response = await fetch('/api/chat/group-photo', {
          method: 'POST',
          headers,
          body: JSON.stringify({ chatId, remove: true }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Could not remove group photo.');
        }

        const pushBody = `${actorLabel(currentUser)} ${GROUP_PHOTO_REMOVED_PREVIEW}`;
        void dispatchChatPush(chatId, data.messageId, pushBody, currentUser.uid);
        toast({ title: "Group photo removed" });
      } catch (error) {
        console.error("Error removing group photo:", error);
        const description =
          error instanceof Error && error.message
            ? error.message
            : "Could not remove group photo.";
        toast({ variant: "destructive", title: "Error", description });
        throw error;
      }
    }, [chatId, currentUser, toast]);


    return { renameGroup, leaveGroup, deleteChat, addMembers, removeMember, updateGroupPhoto, removeGroupPhoto };
}
