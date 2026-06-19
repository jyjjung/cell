
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppRole, ChatMemberInfo, UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDoc,
  getDocs,
  where,
  arrayRemove,
  arrayUnion,
  deleteField,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';

const ROLES_COLLECTION = 'roles';
const CHATS_COLLECTION = 'chats';
const USERS_COLLECTION = 'users';

export function useRoles() {
  const { currentUser, isAdmin, loadingAuth } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, ROLES_COLLECTION), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rolesData: AppRole[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        rolesData.push({ ...data, id: doc.id } as AppRole);
      });
      setRoles(rolesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching roles:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadingAuth, currentUser?.uid]);

  const addRole = useCallback(async (name: string, createChat: boolean): Promise<string> => {
    if (!isAdmin || !currentUser || !currentUser.firstName || !currentUser.lastName) throw new Error("User is not authorized or profile is incomplete.");
    
    const batch = writeBatch(db);
    const roleDocRef = doc(collection(db, ROLES_COLLECTION));
    let chatId: string | undefined = undefined;

    if (createChat) {
      const chatDocRef = doc(collection(db, CHATS_COLLECTION));
      chatId = chatDocRef.id;
      
      const creatorInfo: ChatMemberInfo = {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          avatar: currentUser.avatar || DEFAULT_AVATAR_DATA
      };

      const newChat = {
        type: 'group',
        name: name,
        members: [currentUser.uid], 
        memberInfo: {
            [currentUser.uid]: creatorInfo
        },
        admins: [currentUser.uid],
        createdAt: serverTimestamp(),
        lastMessageText: `Role circle initialized.`,
        lastMessageSentAt: serverTimestamp(),
        memberSeen: {
            [currentUser.uid]: serverTimestamp()
        }
      };
      batch.set(chatDocRef, newChat);
    }

    batch.set(roleDocRef, {
      name,
      chatId: chatId || null,
      createdAt: serverTimestamp(),
    });
    
    await batch.commit();
    return roleDocRef.id;

  }, [isAdmin, currentUser]);

  const updateRole = useCallback(async (roleId: string, name: string) => {
    if (!isAdmin) throw new Error("User is not authorized to update roles.");
    
    const batch = writeBatch(db);
    const roleDocRef = doc(db, ROLES_COLLECTION, roleId);
    
    try {
      const roleDoc = await getDoc(roleDocRef);
      if (roleDoc.exists()) {
        const roleData = roleDoc.data();
        batch.update(roleDocRef, { name });
        if (roleData.chatId) {
          const chatDocRef = doc(db, CHATS_COLLECTION, roleData.chatId);
          batch.update(chatDocRef, { name });
        }
        await batch.commit();
      }
    } catch(e) {
      console.error("Error updating role and chat name", e);
      throw e;
    }
  }, [isAdmin]);

  const deleteRole = useCallback(async (roleId: string) => {
    if (!isAdmin) throw new Error("User is not authorized to delete roles.");
    
    const batch = writeBatch(db);
    const roleDocRef = doc(db, ROLES_COLLECTION, roleId);
    
    try {
      const roleDoc = await getDoc(roleDocRef);
      if (roleDoc.exists()) {
        const roleData = roleDoc.data();
        batch.delete(roleDocRef);
        if (roleData.chatId) {
          const chatDocRef = doc(db, CHATS_COLLECTION, roleData.chatId);
          batch.delete(chatDocRef);
        }
        
        const usersQuery = query(collection(db, USERS_COLLECTION), where('roleIds', 'array-contains', roleId));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(userDoc => {
          const updateData: any = { roleIds: arrayRemove(roleId) };
          if (roleData.name === 'Leader') updateData.isAdmin = false;
          if (roleData.name === 'Youth') updateData.isYouth = false;
          batch.update(userDoc.ref, updateData);
        });

        await batch.commit();
      }
    } catch (e) {
      console.error("Error deleting role, chat, and updating users:", e);
      throw e;
    }
  }, [isAdmin]);

  const syncRolesAndChats = useCallback(async () => {
    if (!isAdmin) throw new Error("Unauthorized access to synchronization engine.");
    
    try {
      const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
      const rolesSnap = await getDocs(collection(db, ROLES_COLLECTION));
      const allUsers = usersSnap.docs.map(d => d.data() as UserProfileData);
      const allRolesWithChats = rolesSnap.docs
        .map(d => ({ ...d.data(), id: d.id } as AppRole))
        .filter(r => !!r.chatId);
      
      const batch = writeBatch(db);
      let totalChanges = 0;

      for (const role of allRolesWithChats) {
        const chatRef = doc(db, CHATS_COLLECTION, role.chatId!);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) continue;

        const chatData = chatSnap.data();
        const currentMemberIds = new Set<string>(chatData.members || []);
        
        const validUsersForRole = allUsers.filter(u => u.roleIds?.includes(role.id));
        const targetMemberIds = validUsersForRole.map(u => u.uid);
        const targetMemberIdsSet = new Set(targetMemberIds);

        const membersToAdd: string[] = [];
        const memberInfoUpdates: Record<string, any> = {};

        // 1. Identify users to ADD or UPDATE metadata
        validUsersForRole.forEach(user => {
          if (!currentMemberIds.has(user.uid)) {
            membersToAdd.push(user.uid);
          }
          memberInfoUpdates[`memberInfo.${user.uid}`] = {
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar || DEFAULT_AVATAR_DATA
          };
        });

        // 2. Identify users to REMOVE (those who have the chat but no longer have the role)
        currentMemberIds.forEach(memberId => {
          if (!targetMemberIdsSet.has(memberId)) {
            batch.update(chatRef, {
              members: arrayRemove(memberId),
              admins: arrayRemove(memberId),
              [`memberInfo.${memberId}`]: deleteField()
            });
            totalChanges++;
          }
        });

        if (membersToAdd.length > 0) {
          batch.update(chatRef, { members: arrayUnion(...membersToAdd) });
          totalChanges++;
        }
        
        if (Object.keys(memberInfoUpdates).length > 0) {
          batch.update(chatRef, memberInfoUpdates);
          totalChanges++;
        }
      }

      if (totalChanges > 0) {
        await batch.commit();
      }
      
      return totalChanges;
    } catch (error) {
      console.error("[Sync Engine] Critical failure:", error);
      throw error;
    }
  }, [isAdmin]);

  return { roles, addRole, updateRole, deleteRole, syncRolesAndChats, loading };
}
