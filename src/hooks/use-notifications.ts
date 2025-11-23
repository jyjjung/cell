
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
    
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('isGlobal', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50) // Fetch last 50 global notifications
    );

    const userNotificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50) // Fetch last 50 user-specific notifications
    );

    const unsubGlobal = onSnapshot(notificationsQuery, (globalSnapshot) => {
      const globalNotifs = globalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      
      setNotifications(prev => {
        const userNotifs = prev.filter(n => !n.isGlobal);
        const combined = [...globalNotifs, ...userNotifs];
        combined.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        return combined.slice(0, 100); // Limit total notifications in state
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching global notifications:", error);
      setLoading(false);
    });

    const unsubUser = onSnapshot(userNotificationsQuery, (userSnapshot) => {
      const userNotifs = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));

      setNotifications(prev => {
        const globalNotifs = prev.filter(n => n.isGlobal);
        const combined = [...globalNotifs, ...userNotifs];
        combined.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        return combined.slice(0, 100);
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user-specific notifications:", error);
      setLoading(false);
    });

    return () => {
      unsubGlobal();
      unsubUser();
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

    