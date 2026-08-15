'use client';

import { writeLastAppLocal, type CommunityAppId } from '@/lib/app-access';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/** Remember the active app for `/` resume (local immediately, Firestore when possible). */
export function persistLastApp(app: CommunityAppId, uid?: string | null): void {
  writeLastAppLocal(app);
  if (!uid) return;
  void updateDoc(doc(db, 'users', uid), {
    'preferences.lastApp': app,
    updatedAt: new Date(),
  }).catch(() => {
    // localStorage is enough for same-device resume
  });
}
