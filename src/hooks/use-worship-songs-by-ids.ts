"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WorshipSong } from '@/types';

const inflight = new Map<string, Promise<WorshipSong | null>>();

async function fetchSong(songId: string): Promise<WorshipSong | null> {
  if (!inflight.has(songId)) {
    const promise = getDoc(doc(db, 'worshipSongs', songId))
      .then((snap) => (snap.exists() ? ({ id: snap.id, ...snap.data() } as WorshipSong) : null))
      .catch((err) => {
        inflight.delete(songId);
        throw err;
      });
    inflight.set(songId, promise);
  }
  return inflight.get(songId)!;
}

/**
 * One-shot fetch of specific worship songs by id — avoids a full-collection listener
 * when WorshipDataProvider is not active (e.g. setlist summary offline-cache helpers).
 */
export function useWorshipSongsByIds(songIds: string[], enabled: boolean) {
  const [songs, setSongs] = useState<WorshipSong[]>([]);
  const [loading, setLoading] = useState(enabled && songIds.length > 0);
  const idsKey = songIds.slice().sort().join(',');

  useEffect(() => {
    if (!enabled || !idsKey) {
      setSongs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const ids = idsKey.split(',').filter(Boolean);

    void Promise.all(ids.map((id) => fetchSong(id)))
      .then((results) => {
        if (cancelled) return;
        setSongs(results.filter((s): s is WorshipSong => Boolean(s)));
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useWorshipSongsByIds] Failed to fetch songs:', err);
        if (cancelled) return;
        setSongs([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, idsKey]);

  return { songs, loading };
}
