"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { CustomRosterEntry, RosterDefinition } from '@/types';
import { userCanSeeRoster } from '@/lib/roster-access';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  getDocsFromCache,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { format } from 'date-fns';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCacheStale,
  readNonEmptyCollectionCache,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

const ROSTER_DEFINITIONS_COLLECTION = 'rosterDefinitions';
const ENTRIES_SUBCOLLECTION = 'entries';
const CACHE_KEY = 'custom_roster_entries_v1';

export interface CustomRosterEntryWithMeta extends CustomRosterEntry {
  rosterDefId: string;
  rosterName: string;
  rosterFields?: RosterDefinition['fields'];
}

function todayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

async function loadDefinitions(): Promise<RosterDefinition[]> {
  const q = query(collection(db, ROSTER_DEFINITIONS_COLLECTION), orderBy('name', 'asc'));
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) {
      return cached.docs.map((d) => ({ id: d.id, ...d.data() } as RosterDefinition));
    }
  } catch {
    /* cache miss */
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RosterDefinition));
}

async function loadEntriesForDefinition(
  def: RosterDefinition,
  fromDate: string,
): Promise<CustomRosterEntryWithMeta[]> {
  const q = query(
    collection(db, ROSTER_DEFINITIONS_COLLECTION, def.id, ENTRIES_SUBCOLLECTION),
    where('date', '>=', fromDate),
    orderBy('date', 'asc'),
  );

  let snap;
  try {
    snap = await getDocsFromCache(q);
    if (snap.empty) snap = await getDocs(q);
  } catch {
    snap = await getDocs(q);
  }

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<CustomRosterEntry, 'id'>),
    rosterDefId: def.id,
    rosterName: def.name,
    rosterFields: def.fields,
  }));
}

async function loadEntriesWithMeta(
  fromDate: string,
  definitions: RosterDefinition[],
): Promise<CustomRosterEntryWithMeta[]> {
  if (definitions.length === 0) return [];

  const batches = await Promise.all(
    definitions.map((def) => loadEntriesForDefinition(def, fromDate)),
  );
  return batches.flat().sort((a, b) => a.date.localeCompare(b.date));
}

/** Dashboard helper: cached definitions + entries for visible rosters. */
export function useAllCustomRosterEntries() {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const [entries, setEntries] = useState<CustomRosterEntryWithMeta[]>(() => {
    return readLocalCollectionCacheStale<CustomRosterEntryWithMeta[]>(CACHE_KEY) ?? [];
  });
  const [loading, setLoading] = useState(entries.length === 0);

  const load = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const fresh = readNonEmptyCollectionCache<CustomRosterEntryWithMeta[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
      if (fresh) {
        setEntries(fresh);
        setLoading(false);
        return fresh;
      }
    }

    const definitions = await loadDefinitions();
    const visibleDefs = currentUser
      ? definitions.filter((def) => userCanSeeRoster(currentUser, def, isAdmin))
      : [];
    const enriched = await loadEntriesWithMeta(todayDateString(), visibleDefs);
    writeLocalCollectionCache(CACHE_KEY, enriched);
    setEntries(enriched);
    setLoading(false);
    return enriched;
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void load().catch((err) => {
      console.error('[useAllCustomRosterEntries] load error:', err);
      if (!cancelled) setLoading(false);
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        void load().catch((err) => {
          console.error('[useAllCustomRosterEntries] refresh error:', err);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, loadingAuth, currentUser?.uid]);

  return { entries, loading, refresh: () => load(true) };
}
