
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
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  limit,
  getDocs,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const NOTIFICATIONS_COLLECTION = 'notifications';

const triggerPushNotification = async (notificationId: string): Promise<void> => {
    try {
        const res = await fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId }),
        });
        
        if (!res.ok) {
            const body = await res.json().catch(() => ({ error: "Server returned a non-JSON or empty response." }));
            console.error("Failed to trigger push notification API:", res.status, body.error);
        }
    } catch (error) {
        console.error("Error calling /api/send-push:", error);
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
    
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const allRecentNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      const relevantNotifs = allRecentNotifs.filter(n => n.isGlobal || n.userId === currentUser.uid || n.type === 'announcement');
      setNotifications(relevantNotifs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const createNotification = useCallback(async (
    notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>
  ): Promise<{notificationId: string}> => {
    if (!notificationData.isGlobal && !notificationData.userId) {
        throw new Error("A non-global notification must have a userId.");
    }
    
    if (notificationData.type === 'reading_progress' && notificationData.userId) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION), 
        where('userId', '==', notificationData.userId),
        where('type', '==', 'reading_progress'),
        where('title', '==', notificationData.title)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        return { notificationId: existing.docs[0].id };
      }
    }
    
    const docRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    const notificationId = docRef.id;

    const dataToSave = {
        ...notificationData,
        createdAt: serverTimestamp(),
        readBy: [], 
    };

    try {
      // CRITICAL: Await the write before triggering the push notification to prevent 404 in API
      await setDoc(docRef, dataToSave);
      triggerPushNotification(notificationId);
    } catch (e) {
      console.error("Error creating notification:", e);
    }
    
    return { notificationId };
  }, []);
  
  const deleteNotification = useCallback((notificationId: string) => {
    if (!isAdmin) throw new Error("Unauthorized.");
    deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId)).catch(e => console.error(e));
  }, [isAdmin]);
  
  const markAsRead = useCallback((notificationId: string) => {
    if (!currentUser) return;
    updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      readBy: arrayUnion(currentUser.uid)
    }).catch(e => console.error("Error marking read:", e));
  }, [currentUser]);

  const markAllAsRead = useCallback((notificationIdsToMark?: string[]) => {
    if (!currentUser) return;

    let notificationsToUpdate = notificationIdsToMark 
        ? notifications.filter(n => notificationIdsToMark.includes(n.id))
        : notifications.filter(n => !n.readBy.includes(currentUser.uid));

    if (notificationsToUpdate.length === 0) return;

    const batch = writeBatch(db);
    notificationsToUpdate.forEach(n => {
        batch.update(doc(db, NOTIFICATIONS_COLLECTION, n.id), { readBy: arrayUnion(currentUser.uid) });
    });
    batch.commit().catch(e => console.error("Batch mark all as read error:", e));
  }, [currentUser, notifications]);

  return { notifications, loading, createNotification, deleteNotification, markAsRead, markAllAsRead };
}
