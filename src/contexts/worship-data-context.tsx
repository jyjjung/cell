"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { primeMediaUrls } from '@/lib/media-cache';
import type { WorshipSetlist, WorshipSong } from '@/types';

const SONGS_COLLECTION = 'worshipSongs';
const SETLISTS_COLLECTION = 'worshipSetlists';

type WorshipDataContextValue = {
  songs: WorshipSong[];
  setlists: WorshipSetlist[];
  songsLoading: boolean;
  setlistsLoading: boolean;
};

const WorshipDataContext = createContext<WorshipDataContextValue | null>(null);

export function WorshipDataProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const { currentUser } = useAuth();
  const [songs, setSongs] = useState<WorshipSong[]>([]);
  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [songsLoading, setSongsLoading] = useState(enabled);
  const [setlistsLoading, setSetlistsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !currentUser) {
      setSongs([]);
      setSetlists([]);
      setSongsLoading(false);
      setSetlistsLoading(false);
      return;
    }

    setSongsLoading(true);
    setSetlistsLoading(true);

    const songsQuery = query(collection(db, SONGS_COLLECTION), orderBy('title', 'asc'));
    const setlistsQuery = query(collection(db, SETLISTS_COLLECTION), orderBy('date', 'desc'));

    const unsubSongs = onSnapshot(
      songsQuery,
      (snap) => {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipSong));
        setSongs(loaded);
        setSongsLoading(false);
        primeMediaUrls(loaded.flatMap((song) => song.chordSheets.map((sheet) => sheet.imageUrl)));
      },
      () => setSongsLoading(false),
    );

    const unsubSetlists = onSnapshot(
      setlistsQuery,
      (snap) => {
        setSetlists(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipSetlist)));
        setSetlistsLoading(false);
      },
      () => setSetlistsLoading(false),
    );

    return () => {
      unsubSongs();
      unsubSetlists();
    };
  }, [enabled, currentUser?.uid]);

  const value = useMemo(
    () => ({ songs, setlists, songsLoading, setlistsLoading }),
    [songs, setlists, songsLoading, setlistsLoading],
  );

  return (
    <WorshipDataContext.Provider value={value}>{children}</WorshipDataContext.Provider>
  );
}

/** Read worship library data from the nearest provider, or null when outside a provider. */
export function useWorshipData() {
  return useContext(WorshipDataContext);
}
