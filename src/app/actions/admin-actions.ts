"use server";

import { getAdminApp, getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfileData, AppRole } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';

const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';
const CHATS_COLLECTION = 'chats';

export async function escalateToAdminAction(password: string, userId: string) {
  const correctPassword = process.env.ADMIN_PASSWORD;
  
  if (!correctPassword) {
    console.error("Server misconfiguration: missing ADMIN_PASSWORD.");
    return { success: false, error: 'Server misconfiguration.' };
  }
  
  if (password !== correctPassword) {
    return { success: false, error: 'Incorrect password.' };
  }

  try {
    const app = getAdminApp();
    const db = getAdminDb(app);
    
    await db.collection(USERS_COLLECTION).doc(userId).update({
      isAdmin: true,
      isApproved: true,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to escalate to admin:", error);
    return { success: false, error: error.message || 'Failed to update user profile.' };
  }
}

export async function adminUpdateUserProfileAction(
  requesterId: string, 
  userId: string, 
  profileData: Partial<UserProfileData>
) {
  try {
    const app = getAdminApp();
    const db = getAdminDb(app);
    
    // 1. Verify the requester is an admin
    const requesterDoc = await db.collection(USERS_COLLECTION).doc(requesterId).get();
    if (!requesterDoc.exists || !requesterDoc.data()?.isAdmin) {
      return { success: false, error: 'Only admins can perform this action.' };
    }
    
    // 2. Fetch the user to update
    const userDocRef = db.collection(USERS_COLLECTION).doc(userId);
    const userDocSnap = await userDocRef.get();
    if (!userDocSnap.exists) {
      return { success: false, error: 'User not found.' };
    }
    
    const oldProfileData = userDocSnap.data() as UserProfileData;
    
    // Safety check: Only process role transitions if roleIds is explicitly in the update payload.
    const hasRoleUpdate = 'roleIds' in profileData;
    const oldRoles = new Set((oldProfileData.roleIds || []) as string[]);
    const currentRoles = hasRoleUpdate ? new Set((profileData.roleIds || []) as string[]) : oldRoles;

    // Detect state changes for auto-sync
    const isBecomingApproved = profileData.isApproved === true && !oldProfileData.isApproved;
    
    let rolesAdded: string[] = [];
    let rolesRemoved: string[] = [];

    if (hasRoleUpdate) {
        rolesAdded = [...currentRoles].filter(r => !oldRoles.has(r));
        rolesRemoved = [...oldRoles].filter(r => !currentRoles.has(r));
    }

    if (isBecomingApproved) {
        const rolesToEnsure = Array.from(currentRoles);
        rolesAdded = Array.from(new Set([...rolesAdded, ...rolesToEnsure]));
    }
    
    const rolesQuery = await db.collection(ROLES_COLLECTION).get();
    const allRolesMap = new Map<string, AppRole>(rolesQuery.docs.map((d: any) => [d.id, d.data() as AppRole]));
    
    let leaderRoleId: string | null = null;
    let youthRoleId: string | null = null;
    for (const [id, role] of allRolesMap.entries()) {
        if (role?.name === 'Leader') leaderRoleId = id;
        if (role?.name === 'Youth') youthRoleId = id;
    }

    const finalDataToUpdate: Partial<UserProfileData> = { ...profileData };

    if (leaderRoleId) {
        if (currentRoles.has(leaderRoleId)) {
            finalDataToUpdate.isAdmin = true;
            finalDataToUpdate.isApproved = true; 
        } else if (hasRoleUpdate) {
            finalDataToUpdate.isAdmin = false;
        }
    }
    
    if (youthRoleId) {
        if (currentRoles.has(youthRoleId)) {
            finalDataToUpdate.isYouth = true;
        } else if (hasRoleUpdate) {
            finalDataToUpdate.isYouth = false;
        }
    }

    // Clean up undefined properties for Firestore update, replacing with FieldValue.delete() if null
    const cleanUpdateData: any = { ...finalDataToUpdate, updatedAt: FieldValue.serverTimestamp() };

    const batch = db.batch();
    batch.update(userDocRef, cleanUpdateData);
    
    for (const roleId of rolesAdded) {
      const roleData = allRolesMap.get(roleId);
      if (roleData && roleData.chatId) {
        const chatDocRef = db.collection(CHATS_COLLECTION).doc(roleData.chatId);
        batch.update(chatDocRef, { 
          members: FieldValue.arrayUnion(userId),
          [`memberInfo.${userId}`]: {
            firstName: profileData.firstName || oldProfileData.firstName,
            lastName: profileData.lastName || oldProfileData.lastName,
            avatar: oldProfileData.avatar || DEFAULT_AVATAR_DATA,
          }
        });
      }
    }
    
    for (const roleId of rolesRemoved) {
      const roleData = allRolesMap.get(roleId);
      if (roleData && roleData.chatId) {
        const chatDocRef = db.collection(CHATS_COLLECTION).doc(roleData.chatId);
        batch.update(chatDocRef, { 
          members: FieldValue.arrayRemove(userId),
          admins: FieldValue.arrayRemove(userId),
          [`memberInfo.${userId}`]: FieldValue.delete()
        });
      }
    }
    
    await batch.commit();

    // 3. Update Firebase Auth displayName if names changed
    if (profileData.firstName || profileData.lastName) {
       const newDisplayName = `${profileData.firstName || oldProfileData.firstName} ${profileData.lastName || oldProfileData.lastName}`;
       try {
           const authApp = getAdminAuth(app);
           await authApp.updateUser(userId, { displayName: newDisplayName });
       } catch (authErr) {
           console.error("Failed to update Firebase Auth displayName", authErr);
       }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Admin user update failed:", error);
    return { success: false, error: error.message || 'Failed to update user' };
  }
}
