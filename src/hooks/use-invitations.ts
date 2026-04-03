
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppInvitation, InvitationResponse } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';

const INVITATIONS_COLLECTION = 'invitations';

export function useInvitations() {
  const [invitations, setInvitations] = useState<AppInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, INVITATIONS_COLLECTION), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const invitesData: AppInvitation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        invitesData.push({
          id: docSnap.id,
          ...data,
        } as AppInvitation);
      });
      setInvitations(invitesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching invitations from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addInvitation = useCallback(async (data: Omit<AppInvitation, 'id' | 'createdAt' | 'responses'>): Promise<string> => {
    try {
      const dataToSend = {
        ...data,
        responses: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, INVITATIONS_COLLECTION), dataToSend);
      return docRef.id;
    } catch (error) {
      console.error("Error adding invitation:", error);
      throw error;
    }
  }, []);

  const updateInvitation = useCallback(async (id: string, data: Partial<AppInvitation>) => {
    const inviteDocRef = doc(db, INVITATIONS_COLLECTION, id);
    try {
      await updateDoc(inviteDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      } as DocumentData);
    } catch (error) {
      console.error("Error updating invitation:", error);
      throw error;
    }
  }, []);

  const deleteInvitation = useCallback(async (id: string) => {
    const inviteDocRef = doc(db, INVITATIONS_COLLECTION, id);
    try {
      await deleteDoc(inviteDocRef);
    } catch (error) {
      console.error("Error deleting invitation:", error);
      throw error;
    }
  }, []);

  const respondToInvitation = useCallback(async (id: string, response: InvitationResponse) => {
    const inviteDocRef = doc(db, INVITATIONS_COLLECTION, id);
    try {
      // Direct update of the nested response object
      await updateDoc(inviteDocRef, {
        [`responses.${response.uid}`]: {
          ...response,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error responding to invitation:", error);
      throw error;
    }
  }, []);

  return { invitations, addInvitation, updateInvitation, deleteInvitation, respondToInvitation, loading };
}
