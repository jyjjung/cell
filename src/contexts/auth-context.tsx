
"use client";

import { resolveIsAdmin } from '@/lib/admin-access';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { createDefaultNdcpcAvatar } from '@/lib/user-avatars';
import { normalizeUserAvatars, resolveAvatarForApp } from '@/lib/user-avatars';
import {
  clearCachedAuthProfile,
  readCachedAuthProfile,
  writeCachedAuthProfile,
} from '@/lib/auth-profile-cache';
import { clearSharedDirectoryCaches } from '@/lib/collection-cache';
import { clearDocsCaches } from '@/lib/docs-directory';
import { clearServerSession, syncServerSession } from '@/lib/client-session';
import { auth, db } from '@/lib/firebase';
import { normalizeInviteCode } from '@/lib/invite-utils';
import { hasCapability } from '@/lib/role-capabilities';
import { redeemSignupInvite } from '@/lib/signup-invite-redeem';
import { notifySignupPending } from '@/lib/signup-notify';
import { syncProfileToChats } from '@/lib/sync-profile-chats';
import type { AppUser, DashboardPreferences, UserProfileData } from '@/types';
import * as Sentry from '@sentry/nextjs';
import {
    createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile as updateFirebaseProfile, type User as FirebaseUser
} from 'firebase/auth';
import { arrayUnion, doc, getDoc, getDocFromCache, getDocFromServer, onSnapshot, serverTimestamp, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  adminPasswordLogin: (password: string) => Promise<boolean>;
  adminLogout: () => Promise<void>;
  adminUpdateUserProfile: (userId: string, profileData: Partial<UserProfileData>) => Promise<void>;

  currentUser: AppUser | null;
  hasSession: boolean;
  /** Server cookie was present on first paint — expect Firebase restore (avoid guest flash). */
  initialSessionCookie: boolean;
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
const defaultDashboardPreferences: DashboardPreferences['widgetVisibility'] = {
  notifications: true,
  todayReading: true,
  upcomingEvents: true,
  nextReading: true,
};

function buildAppUser(firebaseUser: FirebaseUser, profileData: UserProfileData, isAdmin: boolean): AppUser {
  const hasName = !!(profileData.firstName && profileData.lastName);

  return {
    ...firebaseUser,
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    displayName: hasName ? `${profileData.firstName} ${profileData.lastName}` : null,
    phone: profileData.phone ?? null,
    birthday: profileData.birthday ?? null,
    roleIds: profileData.roleIds || [],
    ndcpcRoleIds: profileData.ndcpcRoleIds || [],
    capabilityKeys: profileData.capabilityKeys || [],
    showInCommunityProgress: profileData.showInCommunityProgress ?? true,
    preferredLanguage: profileData.preferredLanguage || 'en',
    appTheme: profileData.appTheme,
    bibleTextVersion: profileData.bibleTextVersion,
    dashboard: {
      layouts: profileData.dashboard?.layouts || {},
      widgetVisibility: { ...defaultDashboardPreferences, ...(profileData.dashboard?.widgetVisibility || {}) },
    },
    isAdmin,
    isApproved: profileData.isApproved || isAdmin,
    access: profileData.access,
    ndcpcRole: profileData.ndcpcRole,
    preferences: profileData.preferences,
    legacyNdcpcUid: profileData.legacyNdcpcUid,
    migratedFrom: profileData.migratedFrom,
    isYouth: hasCapability(profileData.capabilityKeys, 'member.youth'),
    avatars: normalizeUserAvatars(profileData),
    avatar: resolveAvatarForApp(profileData, 'cell'),
    avatarChangesEnabled: profileData.avatarChangesEnabled,
    fcmTokens: profileData.fcmTokens || [],
    fcmNeedsResync: profileData.fcmNeedsResync,
    fcmLastHealedAt: profileData.fcmLastHealedAt,
    fcmHealVersion: profileData.fcmHealVersion,
    lastSeenAt: profileData.lastSeenAt,
  } as AppUser;
}

export function AuthProvider({
  children,
  initialSessionCookie = false,
}: {
  children: ReactNode;
  /** HttpOnly `__session` presence from the server layout (FCP hint). */
  initialSessionCookie?: boolean;
}) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [hasSession, setHasSession] = useState(initialSessionCookie);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWorshipTeam, setIsWorshipTeam] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const profileGenerationRef = useRef(0);

  const applyProfile = useCallback(async (
    firebaseUser: FirebaseUser,
    profileData: UserProfileData,
    generation: number,
  ) => {
    try {
      const effectiveIsAdmin = resolveIsAdmin(profileData);
      if (generation !== profileGenerationRef.current) return;
      setCurrentUser(buildAppUser(firebaseUser, profileData, effectiveIsAdmin));
      setIsAdmin(effectiveIsAdmin);
      writeCachedAuthProfile({ ...profileData, uid: profileData.uid || firebaseUser.uid });
    } catch (error) {
      if (generation !== profileGenerationRef.current) return;
      console.error('Error resolving admin access:', error);
      setCurrentUser(buildAppUser(firebaseUser, profileData, false));
      setIsAdmin(false);
      writeCachedAuthProfile({ ...profileData, uid: profileData.uid || firebaseUser.uid });
    }
  }, []);

  const hydrateProfileFromServer = useCallback(async (
    firebaseUser: FirebaseUser,
    userDocRef: ReturnType<typeof doc>,
    generation: number,
  ) => {
    try {
      const serverSnap = await getDocFromServer(userDocRef);
      if (generation !== profileGenerationRef.current) return;

      if (serverSnap.exists()) {
        await applyProfile(firebaseUser, serverSnap.data() as UserProfileData, generation);
        return;
      }

      const cacheSnap = await getDoc(userDocRef);
      if (generation !== profileGenerationRef.current) return;

      if (cacheSnap.exists()) {
        await applyProfile(firebaseUser, cacheSnap.data() as UserProfileData, generation);
        return;
      }

      console.warn('[AuthProvider] Firebase session exists but no Firestore profile was found:', firebaseUser.uid);
    } catch (error) {
      if (generation !== profileGenerationRef.current) return;
      console.error('[AuthProvider] Error hydrating profile from server:', error);
    }
  }, [applyProfile]);

  useEffect(() => {
    let unsubscribeFromProfile: (() => void) | null = null;

    const unsubscribeFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeFromProfile) {
        unsubscribeFromProfile();
        unsubscribeFromProfile = null;
      }

      setHasSession(!!firebaseUser);

      if (firebaseUser) {
        // UID only — no email/name in Sentry for privacy.
        Sentry.setUser({ id: firebaseUser.uid });

        void firebaseUser.getIdToken()
          .then((idToken) => syncServerSession(idToken))
          .catch((error) => {
            console.error('[AuthProvider] Failed to sync server session:', error);
          });

        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

        // Paint chrome immediately from last known profile while the live snapshot catches up.
        // Clear loadingAuth here — waiting only on the first snapshot kept skeletons up even
        // when currentUser was already hydrated from cache (hurts FCP on /cell and chat).
        const cachedProfile = readCachedAuthProfile(firebaseUser.uid);
        if (cachedProfile) {
          const generation = ++profileGenerationRef.current;
          void applyProfile(firebaseUser, cachedProfile as UserProfileData, generation).finally(() => {
            setLoadingAuth(false);
          });
        }

        unsubscribeFromProfile = onSnapshot(userDocRef, (userDocSnap) => {
          const generation = ++profileGenerationRef.current;

          if (userDocSnap.exists()) {
            void applyProfile(firebaseUser, userDocSnap.data() as UserProfileData, generation)
              .finally(() => {
                if (generation === profileGenerationRef.current) {
                  setLoadingAuth(false);
                }
              });
            return;
          }

          void hydrateProfileFromServer(firebaseUser, userDocRef, generation)
            .finally(() => {
              if (generation === profileGenerationRef.current) {
                setLoadingAuth(false);
              }
            });
        }, (error) => {
          console.error('Error listening to user profile:', error);
          const generation = ++profileGenerationRef.current;
          void (async () => {
            try {
              const cacheSnap = await getDocFromCache(userDocRef);
              if (generation !== profileGenerationRef.current) return;
              if (cacheSnap.exists()) {
                await applyProfile(firebaseUser, cacheSnap.data() as UserProfileData, generation);
                return;
              }
            } catch {
              /* no Firestore device cache */
            }
            if (generation !== profileGenerationRef.current) return;
            const local = readCachedAuthProfile(firebaseUser.uid);
            if (local) {
              await applyProfile(firebaseUser, local as UserProfileData, generation);
            }
          })().finally(() => {
            if (generation === profileGenerationRef.current) {
              setLoadingAuth(false);
            }
          });
        });

      } else {
        profileGenerationRef.current += 1;
        clearCachedAuthProfile();
        setCurrentUser(null);
        setIsAdmin(false);
        setLoadingAuth(false);
        Sentry.setUser(null);
        void clearServerSession();
      }
    });

    return () => {
      unsubscribeFromAuth();
      if (unsubscribeFromProfile) {
        unsubscribeFromProfile();
      }
    };
  }, [applyProfile, hydrateProfileFromServer]);

  const uid = currentUser?.uid;
  const capabilityKeys = currentUser?.capabilityKeys;

  useEffect(() => {
    if (!uid) {
      setIsWorshipTeam(false);
      return;
    }
    setIsWorshipTeam(
      hasCapability(capabilityKeys, 'app.admin')
      || hasCapability(capabilityKeys, 'worship.manage'),
    );
  }, [uid, capabilityKeys]);

  // Throttled presence for admin "inactive" filter — at most once per 6 hours per device.
  useEffect(() => {
    if (!uid || typeof window === 'undefined') return;
    const storageKey = `em_last_seen_write:${uid}`;
    const minIntervalMs = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const prev = Number(window.localStorage.getItem(storageKey) || '0');
    if (now - prev < minIntervalMs) return;
    window.localStorage.setItem(storageKey, String(now));
    void updateDoc(doc(db, USERS_COLLECTION, uid), {
      lastSeenAt: serverTimestamp(),
    }).catch(() => {
      // Rules or offline — non-critical.
    });
  }, [uid]);

  const adminPasswordLogin = async (password: string): Promise<boolean> => {
    if (!currentUser) {
        throw new Error("No user is logged in to grant admin access to.");
    }
    
    // Dynamic import to avoid client-side bundling of server actions immediately
    const { escalateToAdminAction } = await import('@/app/actions/admin-actions');
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Not authenticated.');
    }
    const result = await escalateToAdminAction(password, idToken);
    
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
        router.push('/');
    } catch(err) {
        console.error("Failed to revoke admin status:", err);
    }
  };

  const signUpUser = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string): Promise<AppUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

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
        isApproved: false,
        avatar: DEFAULT_AVATAR_DATA,
        avatars: {
          cell: DEFAULT_AVATAR_DATA,
          ndcpc: createDefaultNdcpcAvatar({ firstName, lastName, uid: firebaseUser.uid }),
        },
        fcmTokens: [],
        roleIds: [],
        capabilityKeys: [],
      };
      await setDoc(userDocRef, newProfileData);
      await updateFirebaseProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });

      let inviteRedeemed = false;
      if (inviteCode?.trim()) {
        const redeem = await redeemSignupInvite(normalizeInviteCode(inviteCode));
        if (redeem.ok) {
          inviteRedeemed = true;
        } else if (redeem.error !== 'not_authenticated') {
          const err = new Error(redeem.message) as Error & { code?: string };
          err.code = 'auth/invite-invalid';
          void notifySignupPending(firebaseUser.uid);
          throw err;
        }
      }

      if (!inviteRedeemed) {
        void notifySignupPending(firebaseUser.uid);
      }

      const idToken = await firebaseUser.getIdToken();
      await syncServerSession(idToken);

      return firebaseUser as AppUser;
    } catch (error) {
      console.error("Error signing up user:", error);
      throw error;
    }
  };

  const signInUser = async (email: string, password: string): Promise<AppUser | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await syncServerSession(idToken);
      return userCredential.user as AppUser;
    } catch (error) {
      console.error("Error signing in user:", error);
      throw error;
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      clearCachedAuthProfile(currentUser?.uid);
      clearSharedDirectoryCaches();
      clearDocsCaches();
      await clearServerSession();
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

  const updateUserProfile = useCallback(async (userId: string, profileData: Partial<UserProfileData>) => {
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

    setCurrentUser((prev) => {
      if (!prev || prev.uid !== userId) return prev;
      return { ...prev, ...otherProfileData };
    });

    await setDoc(userDocRef, dataToWrite, { merge: true });

    if (profileData.avatar || profileData.avatars || profileData.firstName || profileData.lastName) {
      void syncProfileToChats().catch((error) => {
        console.error('[updateUserProfile] Failed to sync profile to chats:', error);
      });
    }

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
  }, []);
  
  const adminUpdateUserProfile = async (userId: string, profileData: Partial<UserProfileData>) => {
    if (!isAdmin || !currentUser) {
      throw new Error("Only admins can perform this action.");
    }
    
    const { adminUpdateUserProfileAction } = await import('@/app/actions/admin-actions');
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated.');
    const result = await adminUpdateUserProfileAction(idToken, userId, profileData);
    
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
      hasSession,
      initialSessionCookie,
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
