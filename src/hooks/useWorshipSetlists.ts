"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipSetlist, SetlistSong, ChordKey } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const SETLISTS_COLLECTION = 'worshipSetlists';

export function useWorshipSetlists() {
  const { currentUser } = useAuth();
  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setSetlists([]); setLoading(false); return; }
    const q = query(collection(db, SETLISTS_COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSetlists(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSetlist)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [currentUser]);

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

  const addSongToSetlist = useCallback(async (
    setlist: WorshipSetlist,
    songId: string,
    songTitle: string,
    key: ChordKey,
  ) => {
    const newSong: SetlistSong = {
      songId,
      title: songTitle,
      key,
      order: setlist.songs.length,
    };
    const updated = [...setlist.songs, newSong];
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlist.id), {
      songs: updated,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const removeSongFromSetlist = useCallback(async (
    setlist: WorshipSetlist,
    songId: string,
  ) => {
    const updated = setlist.songs
      .filter(s => s.songId !== songId)
      .map((s, i) => ({ ...s, order: i }));
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlist.id), {
      songs: updated,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const reorderSetlistSongs = useCallback(async (
    setlistId: string,
    songs: SetlistSong[],
  ) => {
    await updateDoc(doc(db, SETLISTS_COLLECTION, setlistId), {
      songs,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const deleteSetlist = useCallback(async (setlistId: string) => {
    await deleteDoc(doc(db, SETLISTS_COLLECTION, setlistId));
  }, []);

  return {
    setlists, loading,
    createSetlist, updateSetlist,
    addSongToSetlist, removeSongFromSetlist, reorderSetlistSongs,
    deleteSetlist,
  };
}
