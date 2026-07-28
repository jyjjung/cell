"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipSetlist, SetlistSong, ChordKey, ReferenceTrack } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { notifySetlistChange } from '@/lib/setlist-change-notify';

import { useWorshipData } from '@/contexts/worship-data-context';

const SETLISTS_COLLECTION = 'worshipSetlists';

export function useWorshipSetlists(enabled = true) {
  const worshipData = useWorshipData();
  const useShared = enabled && worshipData !== null;
  const { currentUser } = useAuth();
  const { createNotification } = useNotifications();
  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [loading, setLoading] = useState(!useShared);

  const liveSetlists = useShared ? worshipData.setlists : setlists;

  useEffect(() => {
    if (useShared || !enabled || !currentUser?.uid) {
      if (!useShared) {
        setSetlists([]);
        setLoading(false);
      }
      return;
    }
    const q = query(collection(db, SETLISTS_COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSetlists(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSetlist)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [useShared, enabled, currentUser?.uid]);

  const createSetlist = useCallback(async (name: string, date: string): Promise<string> => {
    if (!currentUser) throw new Error('Not authenticated');
    const docRef = await addDoc(collection(db, SETLISTS_COLLECTION), {
      name: name.trim(),
      date,
      songs: [],
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }, [currentUser]);

  const updateSetlist = useCallback(async (
    setlistId: string,
    data: Partial<Pick<WorshipSetlist, 'name' | 'date' | 'songs'>>,
  ) => {
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlistId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const notifyLinked = useCallback(
    (setlist: WorshipSetlist, kind: Parameters<typeof notifySetlistChange>[0]['kind'], detail?: string) => {
      void notifySetlistChange({
        setlistId: setlist.id,
        setlistName: setlist.name,
        kind,
        detail,
        actorId: currentUser?.uid,
        createNotification,
      });
    },
    [createNotification, currentUser?.uid],
  );

  const addSongToSetlist = useCallback(async (
    setlist: WorshipSetlist,
    songId: string,
    songTitle: string,
    key: ChordKey,
    options?: { referenceTracks?: ReferenceTrack[]; chordSheetIds?: string[] },
  ) => {
    const newSong: SetlistSong = {
      songId,
      title: songTitle,
      key,
      order: setlist.songs.length,
      ...(options?.referenceTracks && options.referenceTracks.length > 0
        ? { referenceTracks: options.referenceTracks }
        : {}),
      ...(options?.chordSheetIds && options.chordSheetIds.length > 0
        ? { chordSheetIds: options.chordSheetIds }
        : {}),
    };
    const updated = [...setlist.songs, newSong];
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlist.id), {
      songs: updated,
      updatedAt: serverTimestamp(),
    });
    notifyLinked(setlist, 'song_added', `${songTitle} (${key === 'numbers' ? '#' : key})`);
  }, [notifyLinked]);

  const updateSetlistSong = useCallback(async (
    setlist: WorshipSetlist,
    songId: string,
    patch: Partial<Pick<SetlistSong, 'key' | 'referenceTracks' | 'chordSheetIds'>>,
  ) => {
    const previous = setlist.songs.find((s) => s.songId === songId);
    const updated = setlist.songs.map((s) => {
      if (s.songId !== songId) return s;
      const next: SetlistSong = { ...s };
      if (patch.key !== undefined) next.key = patch.key;
      if ('referenceTracks' in patch) {
        if (patch.referenceTracks && patch.referenceTracks.length > 0) {
          next.referenceTracks = patch.referenceTracks;
        } else {
          delete next.referenceTracks;
        }
      }
      if ('chordSheetIds' in patch) {
        if (patch.chordSheetIds && patch.chordSheetIds.length > 0) {
          next.chordSheetIds = patch.chordSheetIds;
        } else {
          delete next.chordSheetIds;
        }
      }
      return next;
    });
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlist.id), {
      songs: updated,
      updatedAt: serverTimestamp(),
    });
    const detail =
      patch.key !== undefined && previous
        ? `${previous.title} key changed to ${patch.key === 'numbers' ? '#' : patch.key}`
        : previous
          ? `${previous.title} updated`
          : undefined;
    notifyLinked(setlist, 'song_updated', detail);
  }, [notifyLinked]);

  const removeSongFromSetlist = useCallback(async (
    setlist: WorshipSetlist,
    songId: string,
  ) => {
    const removed = setlist.songs.find((s) => s.songId === songId);
    const updated = setlist.songs
      .filter(s => s.songId !== songId)
      .map((s, i) => ({ ...s, order: i }));
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlist.id), {
      songs: updated,
      updatedAt: serverTimestamp(),
    });
    notifyLinked(setlist, 'song_removed', removed?.title);
  }, [notifyLinked]);

  const reorderSetlistSongs = useCallback(async (
    setlistId: string,
    songs: SetlistSong[],
  ) => {
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlistId), {
      songs,
      updatedAt: serverTimestamp(),
    });
    const setlist = liveSetlists.find((s) => s.id === setlistId);
    if (setlist) notifyLinked(setlist, 'reordered');
  }, [liveSetlists, notifyLinked]);

  const deleteSetlist = useCallback(async (setlistId: string) => {
    await deleteDoc(doc(db, SETLISTS_COLLECTION, setlistId));
  }, []);

  return {
    setlists: liveSetlists,
    loading: useShared ? worshipData.setlistsLoading : loading,
    createSetlist, updateSetlist,
    addSongToSetlist, updateSetlistSong, removeSongFromSetlist, reorderSetlistSongs,
    deleteSetlist,
  };
}
