
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';
// Removed: import { usePageLoading } from './page-loading-context'; // No longer directly used here

interface AuthContextType {
  isAdmin: boolean;
  adminPasswordLogin: (password: string) => boolean;
  adminLogout: () => void; // Will be called by UI components that can set loading state

  currentUser: FirebaseUser | null;
  loadingAuth: boolean; 
  signUpUser: (email: string, password: string) => Promise<FirebaseUser | null>;
  signInUser: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOutUser: () => Promise<void>; // Will be called by UI components
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PASSWORD = "Admin123"; 
const ADMIN_AUTH_KEY = "cell_dates_admin_auth"; 

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); 
  const router = useRouter();
  // Removed: const { setIsPageLoading } = usePageLoading(); // No longer used here

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAdminAuth = sessionStorage.getItem(ADMIN_AUTH_KEY);
      if (storedAdminAuth === "true") {
        setIsAdmin(true);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe(); 
  }, []);

  const adminPasswordLogin = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const adminLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAdmin(false);
    // UI (e.g., Header) should set loading state before calling this, then router.push
    router.push('/admin'); 
  }, [router]);

  const signUpUser = async (email: string, password: string): Promise<FirebaseUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing up user:", error);
      throw error; 
    }
  };

  const signInUser = async (email: string, password: string): Promise<FirebaseUser | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in user:", error);
      throw error; 
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      // UI (e.g., Header or ProfilePage) should set loading state before calling this
      await signOut(auth);
      router.push('/'); 
    } catch (error) {
      console.error("Error signing out user:", error);
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
      signOutUser
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
