
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User as FirebaseUser,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, arrayUnion, updateDoc, onSnapshot, writeBatch, arrayRemove, deleteField } from 'firebase/firestore';
import type { AppUser, UserProfileData, DashboardPreferences, AvatarData, AppRole } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';

interface AuthContextType {
  isAdmin: boolean;
  adminPasswordLogin: (password: string) => Promise<boolean>;
  adminLogout: () => Promise<void>;
  adminUpdateUserProfile: (userId: string, profileData: Partial<UserProfileData>) => Promise<void>;

  currentUser: AppUser | null;
  loadingAuth: boolean;
  signUpUser: (email: string, password: string, firstName: string, lastName: string, inviteCode?: string) => Promise<AppUser | null>;
  signInUser: (email: string, password: string) => Promise<AppUser | null>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (userId: string, profileData: Partial<UserProfileData>) => Promise<void>;
  saveUserProfile: (userId: string, profileData: Partial<UserProfileData>) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  isWorshipTeam: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';
const CHATS_COLLECTION = 'chats';


const defaultDashboardPreferences: DashboardPreferences['widgetVisibility'] = {
  notifications: true,
  todayReading: true,
  upcomingEvents: true,
  nextReading: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWorshipTeam, setIsWorshipTeam] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
    let unsubscribeFromProfile: (() => void) | null = null;

    const unsubscribeFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeFromProfile) {
        unsubscribeFromProfile();
        unsubscribeFromProfile = null;
      }
      
      setLoadingAuth(true);

      if (firebaseUser) {
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        
        unsubscribeFromProfile = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfileData;
            
            const hasName = !!(profileData.firstName && profileData.lastName);

            setCurrentUser({
              ...firebaseUser,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              displayName: hasName ? `${profileData.firstName} ${profileData.lastName}` : null,
              roleIds: profileData.roleIds || [],
              showInCommunityProgress: profileData.showInCommunityProgress ?? true,
              preferredLanguage: profileData.preferredLanguage || 'en',
              dashboard: { 
                layouts: profileData.dashboard?.layouts || {},
                widgetVisibility: { ...defaultDashboardPreferences, ...(profileData.dashboard?.widgetVisibility || {}) }
              },
              isAdmin: profileData.isAdmin || false,
              isApproved: profileData.isApproved || false,
              isYouth: profileData.isYouth || false,
              avatar: profileData.avatar || DEFAULT_AVATAR_DATA,
              fcmTokens: profileData.fcmTokens || [],
            } as AppUser);
            setIsAdmin(profileData.isAdmin || false);
          }
          setLoadingAuth(false);
        }, (error) => {
            console.error("Error listening to user profile:", error);
            setCurrentUser(null);
            setIsAdmin(false);
            setLoadingAuth(false);
        });

      } else {
        setCurrentUser(null);
        setIsAdmin(false);
        setLoadingAuth(false);
      }
    });

    return () => {
      unsubscribeFromAuth();
      if (unsubscribeFromProfile) {
        unsubscribeFromProfile();
      }
    };
  }, []);

  // Update isWorshipTeam whenever currentUser or roles change
  useEffect(() => {
    if (!currentUser) {
      setIsWorshipTeam(false);
      return;
    }

    const checkWorshipRole = async () => {
      try {
        const q = query(collection(db, ROLES_COLLECTION), where('name', 'in', ['Worship', 'Worship Team']));
        const snap = await getDocs(q);
        const worshipRoleIds = snap.docs.map(d => d.id);
        const hasRole = currentUser.roleIds?.some(id => worshipRoleIds.includes(id));
        setIsWorshipTeam(!!hasRole);
      } catch (e) {
        console.error("Error checking worship role:", e);
        setIsWorshipTeam(false);
      }
    };
    checkWorshipRole();
  }, [currentUser]);

  const adminPasswordLogin = async (password: string): Promise<boolean> => {
    if (!currentUser) {
        throw new Error("No user is logged in to grant admin access to.");
    }
    
    // Dynamic import to avoid client-side bundling of server actions immediately
    const { escalateToAdminAction } = await import('@/app/actions/admin-actions');
    const result = await escalateToAdminAction(password, currentUser.uid);
    
    if (result.success) {
      return true;
    } else {
      console.error(result.error);
      return false;
    }
  };

  const adminLogout = async (): Promise<void> => {
    if (!currentUser) {
        console.warn("adminLogout called but no user is logged in.");
        return;
    }
    try {
        const rolesQuery = query(collection(db, ROLES_COLLECTION), where('name', '==', 'Leader'));
        const leaderRoleSnapshot = await getDocs(rolesQuery);
        let hasLeaderRole = false;
        if (!leaderRoleSnapshot.empty) {
            const leaderRoleId = leaderRoleSnapshot.docs[0].id;
            if (currentUser.roleIds?.includes(leaderRoleId)) {
                hasLeaderRole = true;
            }
        }

        if (!hasLeaderRole) {
            await updateUserProfile(currentUser.uid, { isAdmin: false });
        }
        
        router.push('/admin');
    } catch(err) {
        console.error("Failed to revoke admin status:", err);
    }
  };

  const signUpUser = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string): Promise<AppUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      let preConfiguredRoles: string[] = [];
      let autoCompleteApproval = false;
      if (inviteCode) {
          try {
              const inviteDocSnap = await getDoc(doc(db, 'invites', inviteCode));
              if (inviteDocSnap.exists()) {
                  preConfiguredRoles = inviteDocSnap.data().roles || [];
                  autoCompleteApproval = true;
              }
          } catch(err) {
              console.error("Failed to parse invite code", err);
          }
      }

      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const newProfileData: UserProfileData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        firstName,
        lastName,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        showInCommunityProgress: true,
        preferredLanguage: 'en',
        dashboard: {
          widgetVisibility: defaultDashboardPreferences,
          layouts: {},
        },
        isAdmin: false,
        isApproved: autoCompleteApproval,
        isYouth: false,
        avatar: DEFAULT_AVATAR_DATA,
        fcmTokens: [],
        roleIds: preConfiguredRoles,
      };
      await setDoc(userDocRef, newProfileData);
      await updateFirebaseProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      
      return firebaseUser as AppUser;
    } catch (error) {
      console.error("Error signing up user:", error);
      throw error;
    }
  };

  const signInUser = async (email: string, password: string): Promise<AppUser | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user as AppUser;
    } catch (error) {
      console.error("Error signing in user:", error);
      throw error;
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
      if (pathname !== '/') {
        router.push('/');
      }
    } catch (error) {
      console.error("Error signing out user:", error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  };

  const updateUserProfile = async (userId: string, profileData: Partial<UserProfileData>) => {
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      throw new Error("Not authorized to update this profile.");
    }
    
    const userDocRef = doc(db, USERS_COLLECTION, userId);

    const { fcmTokens, ...otherProfileData } = profileData;
    const dataToWrite: any = {
      ...otherProfileData,
      updatedAt: serverTimestamp(),
    };
    
    if (fcmTokens && fcmTokens.length > 0) {
      dataToWrite.fcmTokens = arrayUnion(...fcmTokens);
    }

    await setDoc(userDocRef, dataToWrite, { merge: true });

    if (profileData.firstName || profileData.lastName) {
      const userDocSnap = await getDoc(userDocRef);
      if(userDocSnap.exists()) {
        const fullProfile = userDocSnap.data() as UserProfileData;
        const newDisplayName = `${fullProfile.firstName} ${fullProfile.lastName}`;
        if (auth.currentUser && auth.currentUser.uid === userId) {
          await updateFirebaseProfile(auth.currentUser, { displayName: newDisplayName });
        }
      }
    }
  };
  
  const adminUpdateUserProfile = async (userId: string, profileData: Partial<UserProfileData>) => {
    if (!isAdmin || !currentUser) {
      throw new Error("Only admins can perform this action.");
    }
    
    const { adminUpdateUserProfileAction } = await import('@/app/actions/admin-actions');
    const result = await adminUpdateUserProfileAction(currentUser.uid, userId, profileData);
    
    if (!result.success) {
      throw new Error(result.error);
    }
  };


  return (
    <AuthContext.Provider value={{
      isAdmin,
      adminPasswordLogin,
      adminLogout,
      adminUpdateUserProfile,
      currentUser,
      loadingAuth,
      signUpUser,
      signInUser,
      signOutUser,
      updateUserProfile,
      saveUserProfile: updateUserProfile, 
      sendPasswordReset,
      isWorshipTeam,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
