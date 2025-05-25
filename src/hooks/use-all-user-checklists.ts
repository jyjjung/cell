
"use client";

import { useState, useEffect } from 'react';
import type { UserBibleChecklist } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

export function useAllUserChecklists() {
  const { currentUser } = useAuth();
  const [allChecklists, setAllChecklists] = useState<UserBibleChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setAllChecklists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const checklistsQuery = query(
      collection(db, USER_BIBLE_CHECKLISTS_COLLECTION),
      orderBy('updatedAt', 'desc') // Optional: order by most recently updated
    );

    const unsubscribe = onSnapshot(checklistsQuery, (querySnapshot) => {
      const checklistsData: UserBibleChecklist[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        checklistsData.push({
          userId: doc.id, // Assuming doc.id is the userId
          completedPassages: data.completedPassages || [],
          updatedAt: data.updatedAt as Timestamp,
        } as UserBibleChecklist);
      });
      setAllChecklists(checklistsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all user Bible checklists:", error);
      // Potentially a permissions error if rules are not set correctly
      setAllChecklists([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return { allChecklists, loading };
}
