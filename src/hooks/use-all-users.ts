
"use client";

import { useState, useEffect } from 'react';
import type { UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export function useAllUsers() {
  const [allUsers, setAllUsers] = useState<UserProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const usersQuery = query(collection(db, USERS_COLLECTION));

    const unsubscribe = onSnapshot(
      usersQuery,
      { includeMetadataChanges: true },
      (querySnapshot) => {
      const usersData: UserProfileData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfileData);
      });
      setAllUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching all users:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { allUsers, loading, error };
}
