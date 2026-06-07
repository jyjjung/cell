"use client";

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { WorshipSetlist, WorshipSong } from '@/types';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';

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
  const { songs, loading: songsLoading } = useWorshipSongs(enabled);
  const { setlists, loading: setlistsLoading } = useWorshipSetlists(enabled);

  const value = useMemo(
    () => ({ songs, setlists, songsLoading, setlistsLoading }),
    [songs, setlists, songsLoading, setlistsLoading],
  );

  return (
    <WorshipDataContext.Provider value={value}>{children}</WorshipDataContext.Provider>
  );
}

/** Read worship library data from the nearest provider, or empty when outside chat. */
export function useWorshipData() {
  return useContext(WorshipDataContext);
}
