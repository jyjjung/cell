'use client';

import { useAuth as useCellAuth } from '@/contexts/auth-context';
import { hasNdcpcAccess } from '@/lib/app-access';
import { hasCapability } from '@/lib/role-capabilities';
import { resolveAppUserAvatar, resolveAvatarPhotoURL } from '@/lib/user-avatars';

/** NDCPC-compatible auth hook for ported components. */
export function useAuth() {
  const ctx = useCellAuth();
  const user = ctx.currentUser;
  const ndcpcAvatar = user ? resolveAppUserAvatar(user, 'ndcpc') : null;
  const profile = user
    ? {
        id: user.uid,
        uid: user.uid,
        email: user.email ?? '',
        displayName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || '',
        approved: hasNdcpcAccess(user),
        role: hasCapability(user?.capabilityKeys, 'ndcpc.admin') ? 'admin' : 'member',
        photoURL: ndcpcAvatar
          ? resolveAvatarPhotoURL(ndcpcAvatar, { firstName: user.firstName, lastName: user.lastName })
          : undefined,
        avatar: ndcpcAvatar ?? undefined,
      }
    : null;

  return {
    user,
    profile,
    loading: ctx.loadingAuth,
    isAdmin: hasCapability(user?.capabilityKeys, 'ndcpc.admin') || user?.ndcpcRole === 'admin',
    signOutUser: ctx.signOutUser,
  };
}

export function useAdmin() {
  const { isAdmin } = useAuth();
  return { isAdmin };
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
