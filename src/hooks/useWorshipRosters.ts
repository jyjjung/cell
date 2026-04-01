"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipRoster, WorshipRosterSlot } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const ROSTERS_COLLECTION = 'worshipRosters';

export function useWorshipRosters() {
  const { currentUser } = useAuth();
  const [rosters, setRosters] = useState<WorshipRoster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setRosters([]); setLoading(false); return; }
    const q = query(collection(db, ROSTERS_COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRosters(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipRoster)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [currentUser]);

  const createRoster = useCallback(async (
    name: string,
    date: string,
    setlistId?: string | null,
  ): Promise<string> => {
    if (!currentUser) throw new Error('Not authenticated');
    // Build default slots for all 13 roles
    const slots: WorshipRosterSlot[] = [
      'Lead', 'Drums', 'Keys 1', 'Keys 2', 'Bass',
      'Vox 1', 'Vox 2', 'Vox 3', 'E/G 1', 'E/G 2',
      'A/G', 'PPT', 'Sound',
    ].map((role, i) => ({ role: role as WorshipRosterSlot['role'], members: [], order: i }));

    const docRef = await addDoc(collection(db, ROSTERS_COLLECTION), {
      name: name.trim(),
      date,
      setlistId: setlistId ?? null,
      slots,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }, [currentUser]);

  const updateRosterSlots = useCallback(async (
    rosterId: string,
    slots: WorshipRosterSlot[],
  ) => {
    await updateDoc(doc(db, ROSTERS_COLLECTION, rosterId), {
      slots,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const updateRosterMeta = useCallback(async (
    rosterId: string,
    data: Partial<Pick<WorshipRoster, 'name' | 'date' | 'setlistId'>>,
  ) => {
    await updateDoc(doc(db, ROSTERS_COLLECTION, rosterId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const deleteRoster = useCallback(async (rosterId: string) => {
    await deleteDoc(doc(db, ROSTERS_COLLECTION, rosterId));
  }, []);

  return {
    rosters, loading,
    createRoster, updateRosterSlots, updateRosterMeta, deleteRoster,
  };
}
