"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomRosterEntry, RosterDefinition, RosterFieldValue } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import {
  getAssignedUserIdsFromCustomEntry,
  getUserCustomRosterLabels,
  userCanEditRoster,
} from '@/lib/roster-access';

const ROSTER_DEFINITIONS_COLLECTION = 'rosterDefinitions';
const ENTRIES_SUBCOLLECTION = 'entries';

type NewEntryData = {
  date: string;
  time?: string;
  fieldValues?: Record<string, RosterFieldValue>;
};

export function useCustomRoster(
  rosterDefId: string | null,
  definition?: RosterDefinition | null,
) {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const { createNotification } = useNotifications();
  const [roster, setRoster] = useState<CustomRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = useMemo(() => {
    if (!currentUser || !definition) return false;
    return userCanEditRoster(currentUser, definition, isAdmin);
  }, [currentUser, definition, isAdmin]);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid || !rosterDefId) {
      setRoster([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION),
      orderBy('date', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rosterData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CustomRosterEntry));
      setRoster(rosterData);
      setLoading(false);
    }, (error) => {
      console.error("[useCustomRoster] Error fetching roster entries:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [rosterDefId, loadingAuth, currentUser?.uid]);

  const notifyNewAssignees = useCallback(async (
    entryData: NewEntryData,
    previousEntry?: CustomRosterEntry | null,
  ) => {
    if (!rosterDefId || !definition) return;

    const previousIds = new Set(
      previousEntry
        ? getAssignedUserIdsFromCustomEntry(previousEntry, definition)
        : [],
    );
    const nextIds = getAssignedUserIdsFromCustomEntry(entryData, definition);
    const newUsers = nextIds.filter((uid) => !previousIds.has(uid));
    if (newUsers.length === 0) return;

    const rosterName = definition.name?.trim() || 'roster';

    await Promise.all(
      newUsers.map((uid) => {
        const labels = getUserCustomRosterLabels(
          { id: previousEntry?.id ?? 'new', ...entryData },
          definition,
          uid,
        );
        const rolePart = labels.length > 0 ? `: ${labels.join(', ')}` : '';
        return createNotification({
          title: 'New Roster Assignment',
          message: `You've been added to ${rosterName} for ${entryData.date}${rolePart}.`,
          type: 'reminder',
          isGlobal: false,
          userId: uid,
          relatedUrl: `/rosters/${rosterDefId}`,
        }).catch((error) => {
          console.error('[useCustomRoster] Failed to notify assignee:', uid, error);
        });
      }),
    );
  }, [rosterDefId, definition, createNotification]);

  const addEntry = useCallback(async (entryData: NewEntryData) => {
    if (!rosterDefId) throw new Error("No roster definition selected.");
    if (!canEdit) throw new Error("Not authorized to edit this roster.");
    const collectionRef = collection(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION);
    await addDoc(collectionRef, { ...entryData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await notifyNewAssignees(entryData);
  }, [rosterDefId, canEdit, notifyNewAssignees]);
  
  const updateEntry = useCallback(async (entryId: string, entryData: NewEntryData) => {
    if (!rosterDefId) throw new Error("No roster definition selected.");
    if (!canEdit) throw new Error("Not authorized to edit this roster.");
    const previousEntry = roster.find((entry) => entry.id === entryId) ?? null;
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION, entryId);
    await updateDoc(docRef, { ...entryData, updatedAt: serverTimestamp() });
    await notifyNewAssignees(entryData, previousEntry);
  }, [rosterDefId, canEdit, roster, notifyNewAssignees]);

  const deleteEntry = useCallback(async (entryId: string) => {
    if (!rosterDefId) throw new Error("No roster definition selected.");
    if (!canEdit) throw new Error("Not authorized to edit this roster.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION, entryId);
    await deleteDoc(docRef);
  }, [rosterDefId, canEdit]);

  return { roster, loading, canEdit, addEntry, updateEntry, deleteEntry };
}
