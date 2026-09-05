'use client';

import {
  getAppHref,
  listAccessibleApps,
  resolveEntryApp,
  writeLastAppLocal,
  type AccessProfile,
  type CommunityAppId,
} from '@/lib/app-access';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/** Remember the active app for `/` resume (local + cookie immediately, Firestore when possible). */
export function persistLastApp(app: CommunityAppId, uid?: string | null): void {
  writeLastAppLocal(app);
  if (!uid) return;
  void updateDoc(doc(db, 'users', uid), {
    'preferences.lastApp': app,
    updatedAt: new Date(),
  }).catch(() => {
    // localStorage / cookie are enough for same-device resume
  });
}

/**
 * Leave a denied app without bouncing through `/` (which would re-apply the last-app cookie).
 * Updates the cookie to an accessible app first.
 */
export function redirectToAccessibleApp(
  router: { replace: (href: string) => void },
  profile: AccessProfile & { uid?: string },
): void {
  const accessible = listAccessibleApps(profile);
  if (accessible.length === 0) {
    router.replace('/pending-approval');
    return;
  }
  const entry = resolveEntryApp(profile);
  if (!entry) {
    router.replace('/pending-approval');
    return;
  }
  persistLastApp(entry, profile.uid);
  router.replace(getAppHref(entry));
}
