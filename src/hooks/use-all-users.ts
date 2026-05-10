
"use client";

import { useState, useEffect } from 'react';
import type { UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// Singleton state
let globalUsers: UserProfileData[] = [];
let globalLoading = true;
let globalError: Error | null = null;
let subscribers = new Set<() => void>();
let unsubscribeFn: (() => void) | null = null;

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

export function useAllUsers() {
  const [state, setState] = useState({
    allUsers: globalUsers,
    loading: globalLoading,
    error: globalError,
  });

  useEffect(() => {
    const handleChange = () => {
      setState({
        allUsers: globalUsers,
        loading: globalLoading,
        error: globalError,
      });
    };

    subscribers.add(handleChange);

    // If this is the first subscriber, start the Firestore listener
    if (subscribers.size === 1 && !unsubscribeFn) {
      const usersQuery = query(collection(db, USERS_COLLECTION));
      unsubscribeFn = onSnapshot(
        usersQuery,
        (querySnapshot) => {
          const usersData: UserProfileData[] = [];
          querySnapshot.forEach((doc) => {
            usersData.push(doc.data() as UserProfileData);
          });
          globalUsers = usersData;
          globalLoading = false;
          globalError = null;
          notifySubscribers();
        },
        (err) => {
          console.error("Error fetching all users:", err);
          globalError = err;
          globalLoading = false;
          notifySubscribers();
        }
      );
    } else {
        // Already loading or loaded, just update local state with current globals
        handleChange();
    }

    return () => {
      subscribers.delete(handleChange);
      // If no more subscribers, clean up the listener
      if (subscribers.size === 0 && unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = null;
        // Optionally reset state or keep it for next time
        // We'll keep it for faster re-mounts but mark as loading if we want fresh data next time
        // globalLoading = true; 
      }
    };
  }, []);

  return state;
}
