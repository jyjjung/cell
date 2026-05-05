"use client";

import { useState, useEffect } from 'react';
import type { CustomRosterEntry, RosterDefinition } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const ROSTER_DEFINITIONS_COLLECTION = 'rosterDefinitions';
const ENTRIES_SUBCOLLECTION = 'entries';

export interface CustomRosterEntryWithMeta extends CustomRosterEntry {
  rosterDefId: string;
  rosterName: string;
}

/**
 * Fetches ALL custom roster entries across every roster definition,
 * enriched with the definition id and name. Used by the dashboard to
 * show a user's personal assignments without calling a variable number
 * of hooks conditionally.
 */
export function useAllCustomRosterEntries() {
  const [definitions, setDefinitions] = useState<RosterDefinition[]>([]);
  const [entries, setEntries] = useState<CustomRosterEntryWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1 – subscribe to all roster definitions
  useEffect(() => {
    const q = query(
      collection(db, ROSTER_DEFINITIONS_COLLECTION),
      orderBy('name', 'asc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDefinitions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as RosterDefinition)),
        );
      },
      (err) => {
        console.error('[useAllCustomRosterEntries] definitions error:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  // Step 2 – for each definition, subscribe to its entries subcollection
  useEffect(() => {
    if (definitions.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Map of defId → raw entries
    const entriesByDef = new Map<string, CustomRosterEntry[]>();
    const unsubscribers: (() => void)[] = [];
    let pending = definitions.length;

    function flush() {
      const all: CustomRosterEntryWithMeta[] = [];
      definitions.forEach((def) => {
        const defEntries = entriesByDef.get(def.id) ?? [];
        defEntries.forEach((e) =>
          all.push({ ...e, rosterDefId: def.id, rosterName: def.name }),
        );
      });
      setEntries(all);
    }

    definitions.forEach((def) => {
      const q = query(
        collection(db, ROSTER_DEFINITIONS_COLLECTION, def.id, ENTRIES_SUBCOLLECTION),
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          entriesByDef.set(
            def.id,
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomRosterEntry)),
          );
          if (pending > 0) pending--;
          if (pending === 0) setLoading(false);
          flush();
        },
        (err) => {
          console.error(`[useAllCustomRosterEntries] entries error for ${def.id}:`, err);
          if (pending > 0) { pending--; if (pending === 0) setLoading(false); }
        },
      );
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [definitions]);

  return { entries, loading };
}
