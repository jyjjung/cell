
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppNotification } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const NOTIFICATIONS_COLLECTION = 'notifications';

// This function now lives in the hook file to be used by other hooks.
// It's not exported as part of the hook itself, just a utility function.
const createAutomatedNotification = async (
  notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>
) => {
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notificationData,
      createdAt: serverTimestamp(),
      readBy: [], 
    });
  } catch(error) {
      console.error("Error creating automated notification:", error, "Data:", notificationData);
      // We don't re-throw here because this is a non-critical background task.
  }
};


export function useNotifications() {
  const { currentUser, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setNotifications([]);
      return;
    }
    setLoading(true);
    
    // Query for global notifications OR notifications targeted at the current user
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('isGlobal', '==', true),
      orderBy('createdAt', 'desc')
      // Note: Firestore does not allow OR queries on different fields in this way.
      // We will fetch global notifications and then user-specific ones if needed,
      // or combine them on the client side. For now, we focus on global.
      // A more complex setup would involve two listeners or a different data model.
    );

    const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
      const notificationsData: AppNotification[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notificationsData.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt as Timestamp,
          readBy: data.readBy || [],
        } as AppNotification);
      });
      setNotifications(notificationsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const createNotification = useCallback(async (
    notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>
  ) => {
    if (!isAdmin) {
      throw new Error("You are not authorized to create notifications.");
    }
    return createAutomatedNotification(notificationData);
  }, [isAdmin]);
  
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!isAdmin) {
      throw new Error("You are not authorized to delete notifications.");
    }
    const notificationDocRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notificationDocRef);
  }, [isAdmin]);


  const markAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser) return;
    const notificationDocRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    try {
      await updateDoc(notificationDocRef, {
        readBy: arrayUnion(currentUser.uid)
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, [currentUser]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    const unreadNotifications = notifications.filter(n => !n.readBy.includes(currentUser.uid));
    if (unreadNotifications.length === 0) return;

    // This is not a single atomic operation, but it's acceptable for this use case.
    // For true atomicity, a Cloud Function would be better.
    const promises = unreadNotifications.map(n => markAsRead(n.id));
    await Promise.all(promises);

  }, [currentUser, notifications, markAsRead]);


  return { notifications, loading, createNotification, deleteNotification, markAsRead, markAllAsRead };
}
