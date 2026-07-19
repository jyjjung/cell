"use server";

import { getAdminApp, getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfileData } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { reconcileUserRoleState } from '@/lib/server-role-state';

import { commitUpdatesInChunks } from '@/lib/commit-batches';

const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';
const CHATS_COLLECTION = 'chats';

export async function escalateToAdminAction(password: string, idToken: string) {
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
    const auth = getAdminAuth(app);
    const db = getAdminDb(app);

    let uid: string;
    try {
      uid = (await auth.verifyIdToken(idToken)).uid;
    } catch {
      return { success: false, error: 'Unauthorized.' };
    }
    
    const adminRoles = await db.collection(ROLES_COLLECTION)
      .where('capabilities', 'array-contains', 'app.admin')
      .get();
    const adminRole = adminRoles.docs.find((roleDoc) => roleDoc.data().status !== 'archived');
    if (!adminRole) {
      return { success: false, error: 'No active admin-capable role is configured.' };
    }
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const userSnap = await userRef.get();
    const roleIds = Array.isArray(userSnap.data()?.roleIds) ? userSnap.data()!.roleIds : [];
    await userRef.update({
      roleIds: Array.from(new Set([...roleIds, adminRole.id])),
      isApproved: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await reconcileUserRoleState(db, uid);
    
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user profile.';
    console.error("Failed to escalate to admin:", error);
    return { success: false, error: message };
  }
}

export async function adminUpdateUserProfileAction(
  idToken: string,
  userId: string, 
  profileData: Partial<UserProfileData>
) {
  try {
    const app = getAdminApp();
    const db = getAdminDb(app);
    const requesterId = (await getAdminAuth(app).verifyIdToken(idToken)).uid;
    const requesterIsAdmin = await userHasAdminAccess(db, requesterId);
    if (!requesterIsAdmin) {
      return { success: false, error: 'Only admins can perform this action.' };
    }
    
    // 2. Fetch the user to update
    const userDocRef = db.collection(USERS_COLLECTION).doc(userId);
    const userDocSnap = await userDocRef.get();
    if (!userDocSnap.exists) {
      return { success: false, error: 'User not found.' };
    }
    
    const oldProfileData = userDocSnap.data() as UserProfileData;
    
    const hasRoleUpdate = 'roleIds' in profileData;
    const {
      roleIds,
      capabilityKeys: _ignoredCapabilities,
      isAdmin: _ignoredAdmin,
      isYouth: _ignoredYouth,
      ...safeProfileData
    } = profileData as Partial<UserProfileData> & {
      isAdmin?: unknown;
      isYouth?: unknown;
    };
    const cleanUpdateData: Record<string, unknown> = {
      ...safeProfileData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batchUpdates: Array<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }> = [
      { ref: userDocRef, data: cleanUpdateData },
    ];

    const shouldSyncMemberInfo =
      profileData.avatar !== undefined
      || profileData.firstName !== undefined
      || profileData.lastName !== undefined;

    if (shouldSyncMemberInfo) {
      const mergedProfile = { ...oldProfileData, ...safeProfileData } as UserProfileData;
      const memberInfo = {
        firstName: mergedProfile.firstName,
        lastName: mergedProfile.lastName,
        avatar: mergedProfile.avatar || DEFAULT_AVATAR_DATA,
      };

      const chatsSnap = await db
        .collection(CHATS_COLLECTION)
        .where('members', 'array-contains', userId)
        .get();

      for (const chatDoc of chatsSnap.docs) {
        batchUpdates.push({
          ref: chatDoc.ref,
          data: { [`memberInfo.${userId}`]: memberInfo },
        });
      }
    }
    
    await commitUpdatesInChunks(db, batchUpdates);
    if (hasRoleUpdate) {
      await reconcileUserRoleState(db, userId, roleIds || []);
    }

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
