
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase'; // Import Firebase auth instance and db
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  updateProfile as updateFirebaseProfile, // For Firebase built-in displayName
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { AppUser, UserProfileData, SidebarPreferences } from '@/types';
import { useEvents } from '@/hooks/use-events'; // For birthday event management
import { usePageLoading } from '@/contexts/page-loading-context';

interface AuthContextType {
  isAdmin: boolean;
  adminPasswordLogin: (password: string) => Promise<boolean>;
  adminLogout: () => Promise<void>;

  currentUser: AppUser | null; // Changed to AppUser
  loadingAuth: boolean;
  signUpUser: (email: string, password: string) => Promise<AppUser | null>;
  signInUser: (email: string, password: string) => Promise<AppUser | null>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (userId: string, profileData: Partial<UserProfileData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PASSWORD = "Admin123";
const USERS_COLLECTION = 'users';

const defaultSidebarPreferences: SidebarPreferences = {
  home: true,
  events: true,
  memorize: true,
  checklist: true,
  fullPlan: true,
  leaderboard: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();
  const { addOrUpdateBirthdayEvent } = useEvents();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data() as UserProfileData;
          setCurrentUser({
            ...firebaseUser, // Base Firebase user properties
            displayName: profileData.displayName || firebaseUser.displayName, // Prefer Firestore, fallback to Firebase Auth
            birthday: profileData.birthday || null,
            showInCommunityProgress: profileData.showInCommunityProgress ?? true,
            sidebar: { ...defaultSidebarPreferences, ...(profileData.sidebar || {}) },
            isAdmin: profileData.isAdmin || false,
          } as AppUser);
          setIsAdmin(profileData.isAdmin || false); // Set admin state from Firestore
        } else {
          // Create a basic profile if it doesn't exist (e.g., first-time sign-up)
          const initialDisplayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "New User";
          const newProfileData: UserProfileData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: initialDisplayName,
            birthday: null,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
            showInCommunityProgress: true, // Default to true
            sidebar: defaultSidebarPreferences,
            isAdmin: false, // Default to not admin
          };
          await setDoc(userDocRef, newProfileData);
          setCurrentUser({
            ...firebaseUser,
            displayName: newProfileData.displayName,
            birthday: newProfileData.birthday,
            showInCommunityProgress: newProfileData.showInCommunityProgress,
            sidebar: newProfileData.sidebar,
            isAdmin: newProfileData.isAdmin,
          } as AppUser);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false); // No user, not an admin
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const adminPasswordLogin = async (password: string): Promise<boolean> => {
    if (!currentUser) {
        throw new Error("No user is logged in to grant admin access to.");
    }
    if (password === ADMIN_PASSWORD) {
      await updateUserProfile(currentUser.uid, { isAdmin: true });
      // The onAuthStateChanged listener will handle the state update,
      // but we can set it optimistically here for faster UI response.
      setIsAdmin(true); 
      return true;
    }
    return false;
  };

  const adminLogout = async (): Promise<void> => {
    if (!currentUser) {
        console.warn("adminLogout called but no user is logged in.");
        return;
    }
    try {
        await updateUserProfile(currentUser.uid, { isAdmin: false });
        setIsAdmin(false); // Optimistic update
        router.push('/admin');
    } catch(err) {
        console.error("Failed to revoke admin status:", err);
    }
  };

  const signUpUser = async (email: string, password: string): Promise<AppUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      // Create initial user profile in Firestore
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const initialDisplayName = firebaseUser.email?.split('@')[0] || "New User";
      const newProfileData: UserProfileData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: initialDisplayName,
        birthday: null,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        showInCommunityProgress: true,
        sidebar: defaultSidebarPreferences,
        isAdmin: false,
      };
      await setDoc(userDocRef, newProfileData);
      // Also update Firebase Auth profile if possible (for displayName)
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, { displayName: initialDisplayName });
      }
      return { ...firebaseUser, ...newProfileData } as AppUser;
    } catch (error) {
      console.error("Error signing up user:", error);
      throw error;
    }
  };

  const signInUser = async (email: string, password: string): Promise<AppUser | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User data will be fetched by onAuthStateChanged listener
      return userCredential.user as AppUser; // Cast, will be enriched by listener
    } catch (error) {
      console.error("Error signing in user:", error);
      throw error;
    }
  };

  const signOutUser = async (): Promise<void> => {
    setIsPageLoading(true);
    try {
      await signOut(auth);
      // After sign out, the onAuthStateChanged listener will update the currentUser state.
      // Components will re-render with the new auth state.
      // We want to ensure the user is on the homepage.
      
      // If we are not on the homepage, navigate there. The PageLoaderManager will turn off the spinner.
      if (pathname !== '/') {
        router.push('/');
      } else {
        // If we are already on the homepage, the route won't change, so we manually turn off the spinner.
        setIsPageLoading(false);
      }
    } catch (error) {
      console.error("Error signing out user:", error);
      setIsPageLoading(false); // Always turn off on error.
      throw error;
    }
  };

  const updateUserProfile = async (userId: string, profileData: Partial<UserProfileData>) => {
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      console.error("User not authorized to update this profile or no user logged in.");
      throw new Error("Not authorized.");
    }
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    try {
      const dataToUpdate: Partial<UserProfileData> & {updatedAt: Timestamp} = { ...profileData, updatedAt: serverTimestamp() as Timestamp };
      await setDoc(userDocRef, dataToUpdate, { merge: true });

      // Update Firebase Auth profile's displayName if it's being changed
      if (profileData.displayName && auth.currentUser && auth.currentUser.displayName !== profileData.displayName) {
        await updateFirebaseProfile(auth.currentUser, { displayName: profileData.displayName });
      }

      // Update local context state
      setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser: AppUser = {
          ...prevUser,
          displayName: profileData.displayName !== undefined ? profileData.displayName : prevUser.displayName,
          birthday: profileData.birthday !== undefined ? profileData.birthday : prevUser.birthday,
          showInCommunityProgress: profileData.showInCommunityProgress !== undefined ? profileData.showInCommunityProgress : prevUser.showInCommunityProgress,
          sidebar: profileData.sidebar !== undefined ? { ...prevUser.sidebar, ...profileData.sidebar } : prevUser.sidebar,
          isAdmin: profileData.isAdmin !== undefined ? profileData.isAdmin : prevUser.isAdmin,
        };
        return updatedUser;
      });

       // Also update the top-level isAdmin state in the context
       if (profileData.isAdmin !== undefined) {
          setIsAdmin(profileData.isAdmin);
       }

      // Handle birthday event creation/update
      if (profileData.birthday && profileData.displayName) { // Ensure displayName is available
         await addOrUpdateBirthdayEvent(userId, profileData.displayName, profileData.birthday);
      } else if (profileData.birthday && currentUser && currentUser.displayName) { // Fallback to current user's display name
         await addOrUpdateBirthdayEvent(userId, currentUser.displayName, profileData.birthday);
      }


    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  };


  return (
    <AuthContext.Provider value={{
      isAdmin,
      adminPasswordLogin,
      adminLogout,
      currentUser,
      loadingAuth,
      signUpUser,
      signInUser,
      signOutUser,
      updateUserProfile,
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
