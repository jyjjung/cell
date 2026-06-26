"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipRoster, WorshipRosterSlot, WorshipRole } from '@/types';
import { WORSHIP_ROLES } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useScheduleData } from '@/contexts/schedule-data-context';

const ROSTERS_COLLECTION = 'worshipRosters';

export function useWorshipRosters(enabled = true) {
  const { currentUser } = useAuth();
  const schedule = useScheduleData();
  const [localRosters, setLocalRosters] = useState<WorshipRoster[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (schedule || !enabled || !currentUser) {
      if (!schedule && !currentUser) {
        setLocalRosters([]);
        setLocalLoading(false);
      }
      return;
    }
    const q = query(collection(db, ROSTERS_COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setLocalRosters(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipRoster)));
      setLocalLoading(false);
    }, () => setLocalLoading(false));
    return unsub;
  }, [schedule, enabled, currentUser]);

  const rosters = schedule?.worshipRosters ?? localRosters;
  const loading = schedule ? schedule.worshipRostersLoading : localLoading;

  const createRoster = useCallback(async (
    name: string,
    date: string,
    setlistId?: string | null,
  ): Promise<string> => {
    if (!currentUser) throw new Error('Not authenticated');
    const slots: WorshipRosterSlot[] = WORSHIP_ROLES.map((role, i) => ({
      role: role as WorshipRole,
      members: [],
      order: i,
    }));

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
