"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipRoster, WorshipRosterSlot } from '@/types';
import { WORSHIP_ROLES } from '@/types';
import { db } from '@/lib/firebase';
import { emptySlotsForRoles } from '@/lib/worship-roster-roles';
import {
  collection, query, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useLiveScheduleData } from '@/contexts/schedule-data-context';
import { subscribeQueryPreferServer } from '@/lib/firestore-server-snapshot';
import { useNotifications } from '@/hooks/use-notifications';

const ROSTERS_COLLECTION = 'worshipRosters';

function getUserRoleAssignments(slots: WorshipRosterSlot[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const slot of slots) {
    for (const member of slot.members ?? []) {
      if (!member.userId) continue;
      const roles = map.get(member.userId) ?? [];
      roles.push(slot.role);
      map.set(member.userId, roles);
    }
  }
  return map;
}

export function useWorshipRosters(enabled = true) {
  const { currentUser } = useAuth();
  const schedule = useLiveScheduleData();
  const { createNotification } = useNotifications();
  const [localRosters, setLocalRosters] = useState<WorshipRoster[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (schedule || !enabled || !currentUser) {
      if (!currentUser) {
        setLocalRosters([]);
        setLocalLoading(false);
      }
      return;
    }
    const q = query(collection(db, ROSTERS_COLLECTION), orderBy('date', 'desc'));
    return subscribeQueryPreferServer(
      q,
      (id, data) => ({ id, ...data } as WorshipRoster),
      (data) => {
        setLocalRosters(data);
        setLocalLoading(false);
      },
      () => setLocalLoading(false),
    );
  }, [schedule, enabled, currentUser]);

  const rosters = schedule?.worshipRosters ?? localRosters;
  const loading = schedule ? schedule.worshipRostersLoading : localLoading;

  const createRoster = useCallback(async (
    name: string,
    date: string,
    setlistId?: string | null,
    roleNames?: readonly string[],
  ): Promise<string> => {
    if (!currentUser) throw new Error('Not authenticated');
    const slots = emptySlotsForRoles(roleNames ?? WORSHIP_ROLES);

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
    const existingRoster = rosters.find((r) => r.id === rosterId);
    const previousAssignments = getUserRoleAssignments(existingRoster?.slots ?? []);
    const nextAssignments = getUserRoleAssignments(slots);

    await updateDoc(doc(db, ROSTERS_COLLECTION, rosterId), {
      slots,
      updatedAt: serverTimestamp(),
    });

    const rosterName = existingRoster?.name ?? 'Worship roster';
    const rosterDate = existingRoster?.date ?? '';

    for (const [userId, roles] of nextAssignments) {
      const previousRoles = previousAssignments.get(userId) ?? [];
      const addedRoles = roles.filter((role) => !previousRoles.includes(role));
      if (addedRoles.length === 0) continue;

      await createNotification({
        title: 'New Worship Assignment',
        message: `You've been added to ${rosterName}${rosterDate ? ` on ${rosterDate}` : ''}: ${addedRoles.join(', ')}.`,
        type: 'reminder',
        isGlobal: false,
        userId,
        relatedUrl: '/worship',
      });
    }
  }, [rosters, createNotification]);

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
