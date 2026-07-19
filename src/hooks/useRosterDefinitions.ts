
"use client";

import { useState, useEffect, useCallback } from 'react';
import type {
  RosterDefinition,
  RosterVisibility,
  RosterFieldDefinition,
  RosterEditPermissions,
} from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';

const ROSTER_DEFINITIONS_COLLECTION = 'rosterDefinitions';

export function useRosterDefinitions() {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const [definitions, setDefinitions] = useState<RosterDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setDefinitions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, ROSTER_DEFINITIONS_COLLECTION), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const defsData: RosterDefinition[] = [];
      querySnapshot.forEach((docSnap) => {
        defsData.push({ ...docSnap.data(), id: docSnap.id } as RosterDefinition);
      });
      setDefinitions(defsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching roster definitions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadingAuth, currentUser?.uid]);

  const addDefinition = useCallback(async (name: string): Promise<string> => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = await addDoc(collection(db, ROSTER_DEFINITIONS_COLLECTION), {
      name,
      createdAt: serverTimestamp(),
      visibility: { type: 'public' },
      fields: [],
      editPermissions: {},
    });
    return docRef.id;
  }, [isAdmin]);

  const updateDefinition = useCallback(async (id: string, data: Partial<Pick<RosterDefinition, 'name' | 'fields' | 'visibility' | 'editPermissions'>>) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    await updateDoc(docRef, data);
  }, [isAdmin]);

  const updateDefinitionVisibility = useCallback(async (id: string, visibility: RosterVisibility) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    await updateDoc(docRef, { visibility });
  }, [isAdmin]);

  const updateDefinitionFields = useCallback(async (id: string, fields: RosterFieldDefinition[]) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    await updateDoc(docRef, { fields });
  }, [isAdmin]);

  const updateDefinitionEditPermissions = useCallback(async (id: string, editPermissions: RosterEditPermissions) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    await updateDoc(docRef, { editPermissions });
  }, [isAdmin]);

  const deleteDefinition = useCallback(async (id: string) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const response = await fetch(`/api/admin/roster-definitions/${id}`, {
      method: 'DELETE',
      headers: await getClientAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not delete roster definition.');
  }, [isAdmin]);

  return {
    definitions,
    loading,
    addDefinition,
    updateDefinition,
    deleteDefinition,
    updateDefinitionVisibility,
    updateDefinitionFields,
    updateDefinitionEditPermissions,
  };
}
