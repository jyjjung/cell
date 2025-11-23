
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
  limit,
  getDocs,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const NOTIFICATIONS_COLLECTION = 'notifications';

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
    
    // Query for all recent notifications and we'll filter on the client
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100) // Fetch a reasonable number of recent notifications
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const allRecentNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      
      // Filter for global notifications or notifications for the current user
      const relevantNotifs = allRecentNotifs.filter(n => n.isGlobal || n.userId === currentUser.uid);

      setNotifications(relevantNotifs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const createNotification = useCallback(async (
    notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>
  ) => {
    if (!notificationData.isGlobal && !notificationData.userId) {
        console.error("A non-global notification must have a userId.");
        return;
    }
    // Prevent duplicate reading-progress notifications
    if (notificationData.type === 'reading_progress') {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION), 
        where('userId', '==', notificationData.userId),
        where('type', '==', 'reading_progress'),
        where('title', '==', notificationData.title)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        // console.log("Skipping duplicate reading progress notification.");
        return;
      }
    }
    
    try {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
          ...notificationData,
          createdAt: serverTimestamp(),
          readBy: [], 
        });
      } catch(error) {
          console.error("Error creating notification:", error, "Data:", notificationData);
      }
  }, []);
  
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
