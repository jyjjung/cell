
"use client";

import { useState, useEffect } from 'react';
import type { UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const CACHE_KEY = 'cache_all_users';

export function useAllUsers() {
  const [allUsers, setAllUsers] = useState<UserProfileData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem(CACHE_KEY);
    }
    return true;
  });
  
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const usersQuery = query(collection(db, USERS_COLLECTION));

    const unsubscribe = onSnapshot(
      usersQuery,
      (querySnapshot) => {
      const usersData: UserProfileData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfileData);
      });
      
      setAllUsers(usersData);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(usersData));
        } catch (e) {
          console.warn("Failed to cache users:", e);
        }
      }
      
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
