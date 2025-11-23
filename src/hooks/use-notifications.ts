
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
  getDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';

async function triggerPushNotification(notification: AppNotification, targetUserIds?: string[]) {
    try {
        await fetch('/api/send-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notification, targetUserIds }),
        });
    } catch (error) {
        console.error("Failed to trigger push notification:", error);
        // This failure is logged but not thrown, as the in-app notification is the primary mechanism.
    }
}


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
  ): Promise<string> => {
    if (!notificationData.isGlobal && !notificationData.userId) {
        throw new Error("A non-global notification must have a userId.");
    }
    // Prevent duplicate reading-progress notifications by checking the database
    if (notificationData.type === 'reading_progress' && notificationData.userId) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION), 
        where('userId', '==', notificationData.userId),
        where('type', '==', 'reading_progress'),
        where('title', '==', notificationData.title)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        console.log("Skipping duplicate reading progress notification.");
        return existing.docs[0].id; // Return existing ID, but don't re-create or re-send
      }
    }
    
    try {
        const userNotifPrefs = currentUser?.notificationPreferences;
        const canReceiveNotification = userNotifPrefs ? userNotifPrefs[notificationData.type] ?? true : true;
        
        if (!notificationData.isGlobal && !canReceiveNotification) {
            console.log(`User has disabled '${notificationData.type}' notifications. Skipping creation.`);
            return ''; // Return empty string to indicate skipped notification
        }

        const dataToSave = {
            ...notificationData,
            createdAt: serverTimestamp(),
            readBy: [], 
        };
        const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), dataToSave);

        // After successfully creating the notification, trigger the push
        const fullNotification: AppNotification = {
            id: docRef.id,
            createdAt: new Timestamp(Date.now() / 1000, 0), // Approximate timestamp
            ...notificationData,
            readBy: []
        };
        
        if (notificationData.isGlobal) {
            // For global notifications, we need to respect each user's preference for this type
            // The logic for this is now handled in the /api/send-push route
            triggerPushNotification(fullNotification);
        } else if (notificationData.userId) {
            // For personal notifications, we already checked the preference
            triggerPushNotification(fullNotification, [notificationData.userId]);
        }
        
        return docRef.id;
      } catch(error) {
          console.error("Error creating notification:", error, "Data:", notificationData);
          throw error;
      }
  }, [currentUser]);
  
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
