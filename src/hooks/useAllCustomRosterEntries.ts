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
/** v2: per-user cache key so viewers are not stuck with another account's empty/partial snapshot. */
const CACHE_KEY_PREFIX = 'custom_roster_entries_v2';

export interface CustomRosterEntryWithMeta extends CustomRosterEntry {
  rosterDefId: string;
  rosterName: string;
  rosterFields?: RosterDefinition['fields'];
}

function todayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

function cacheKeyForUser(uid: string) {
  return `${CACHE_KEY_PREFIX}:${uid}`;
}

async function loadDefinitions(): Promise<RosterDefinition[]> {
  const q = query(collection(db, ROSTER_DEFINITIONS_COLLECTION), orderBy('name', 'asc'));
  // Prefer server so visibility/edit ACL used for filtering is current. Cache is offline fallback only.
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RosterDefinition));
  } catch {
    try {
      const cached = await getDocsFromCache(q);
      return cached.docs.map((d) => ({ id: d.id, ...d.data() } as RosterDefinition));
    } catch {
      return [];
    }
  }
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
    snap = await getDocs(q);
  } catch (serverErr) {
    try {
      snap = await getDocsFromCache(q);
      if (snap.empty) throw serverErr;
    } catch {
      throw serverErr;
    }
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

  // One roster's permission failure must not wipe the rest of the dashboard agenda.
  const settled = await Promise.allSettled(
    definitions.map((def) => loadEntriesForDefinition(def, fromDate)),
  );

  const entries: CustomRosterEntryWithMeta[] = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      entries.push(...result.value);
      return;
    }
    console.warn(
      `[useAllCustomRosterEntries] skipped roster ${definitions[index]?.id}:`,
      result.reason,
    );
  });

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/** Dashboard helper: cached definitions + entries for visible rosters. */
export function useAllCustomRosterEntries() {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const cacheKey = currentUser?.uid ? cacheKeyForUser(currentUser.uid) : null;
  const [entries, setEntries] = useState<CustomRosterEntryWithMeta[]>(() => {
    if (!cacheKey) return [];
    return readLocalCollectionCacheStale<CustomRosterEntryWithMeta[]>(cacheKey) ?? [];
  });
  const [loading, setLoading] = useState(entries.length === 0);

  const load = useCallback(async (forceRefresh = false) => {
    if (!currentUser?.uid || !cacheKey) {
      setEntries([]);
      setLoading(false);
      return [];
    }

    if (!forceRefresh) {
      const fresh = readNonEmptyCollectionCache<CustomRosterEntryWithMeta[]>(
        cacheKey,
        COLLECTION_CACHE_TTL_MS,
      );
      if (fresh) {
        setEntries(fresh);
        setLoading(false);
        return fresh;
      }
    }

    const definitions = await loadDefinitions();
    const visibleDefs = definitions.filter((def) =>
      userCanSeeRoster(currentUser, def, isAdmin),
    );
    const enriched = await loadEntriesWithMeta(todayDateString(), visibleDefs);
    writeLocalCollectionCache(cacheKey, enriched);
    setEntries(enriched);
    setLoading(false);
    return enriched;
  }, [cacheKey, currentUser, isAdmin]);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Hydrate from this user's cache when the account changes.
    const cached =
      readLocalCollectionCacheStale<CustomRosterEntryWithMeta[]>(cacheKeyForUser(currentUser.uid)) ??
      [];
    setEntries(cached);
    setLoading(cached.length === 0);

    let cancelled = false;

    void load().catch((err) => {
      console.error('[useAllCustomRosterEntries] load error:', err);
      if (!cancelled) setLoading(false);
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible' && currentUser?.uid) {
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
