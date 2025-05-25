
"use client";

import { useState, useEffect } from 'react';
import type { UserBibleChecklist } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

export function useAllUserChecklists() {
  const { currentUser, isEffectivelyAdmin } = useAuth(); // Added isEffectivelyAdmin
  const [allChecklists, setAllChecklists] = useState<UserBibleChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if the current user is an admin
    if (!isEffectivelyAdmin) {
      setAllChecklists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const checklistsQuery = query(
      collection(db, USER_BIBLE_CHECKLISTS_COLLECTION),
      orderBy('updatedAt', 'desc') 
    );

    const unsubscribe = onSnapshot(checklistsQuery, (querySnapshot) => {
      const checklistsData: UserBibleChecklist[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        checklistsData.push({
          userId: doc.id,
          userDisplayName: data.userDisplayName || null, // Read displayName
          completedPassages: data.completedPassages || [],
          updatedAt: data.updatedAt as Timestamp,
        } as UserBibleChecklist);
      });
      setAllChecklists(checklistsData);
      setLoading(false);
    }, (error) => {
      console.error("[useAllUserChecklists] Error fetching all user Bible checklists:", error);
      console.log("[useAllUserChecklists] Current user UID:", currentUser?.uid, "Is Admin:", isEffectivelyAdmin);
      setAllChecklists([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isEffectivelyAdmin]); // Depend on isEffectivelyAdmin

  return { allChecklists, loading };
}
