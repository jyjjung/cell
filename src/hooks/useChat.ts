
"use client";

import { useCallback } from 'react';
import { doc, updateDoc, deleteDoc, arrayRemove, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { usePageLoading } from '@/contexts/page-loading-context';
import type { UserProfileData, ChatMemberInfo } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';

const CHATS_COLLECTION = 'chats';

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
        }).catch((error: any) => {
            console.error("Error leaving group:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not leave group." });
        });
        
        toast({ title: "You have left the group." });
        setIsPageLoading(true);
        router.push('/chat');
    }, [chatId, currentUser, router, toast, setIsPageLoading]);

    const deleteChat = useCallback(() => {
        const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
        deleteDoc(chatDocRef).catch((error: any) => {
            console.error("Error deleting chat:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete chat." });
        });
        
        toast({ title: "Chat deleted." });
        setIsPageLoading(true);
        router.push('/chat');
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


    return { renameGroup, leaveGroup, deleteChat, addMembers, removeMember };
}
