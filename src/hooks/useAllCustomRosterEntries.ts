"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { CustomRosterEntry, RosterDefinition } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
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

async function loadEntriesWithMeta(
  fromDate: string,
  definitions: RosterDefinition[],
): Promise<CustomRosterEntryWithMeta[]> {
  const defMap = new Map(definitions.map((d) => [d.id, d.name]));
  const q = query(
    collectionGroup(db, ENTRIES_SUBCOLLECTION),
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

  return snap.docs.map((docSnap) => {
    const defId = docSnap.ref.parent.parent?.id ?? '';
    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<CustomRosterEntry, 'id'>),
      rosterDefId: defId,
      rosterName: defMap.get(defId) ?? 'Roster',
    };
  });
}

/** Dashboard helper: cached definitions + one collection-group entries query. */
export function useAllCustomRosterEntries() {
  const { currentUser, loadingAuth } = useAuth();
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
    const enriched = await loadEntriesWithMeta(todayDateString(), definitions);
    writeLocalCollectionCache(CACHE_KEY, enriched);
    setEntries(enriched);
    setLoading(false);
    return enriched;
  }, []);

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
      if (document.visibilityState === 'visible' && currentUser) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, loadingAuth, currentUser?.uid]);

  return { entries, loading, refresh: () => load(true) };
}
