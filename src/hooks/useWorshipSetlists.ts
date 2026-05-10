
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

// Singleton state
let globalSetlists: WorshipSetlist[] = [];
let globalLoading = true;
let subscribers = new Set<() => void>();
let unsubscribeFn: (() => void) | null = null;
let activeUid: string | null = null;

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

export function useWorshipSetlists() {
  const { currentUser } = useAuth();
  const [state, setState] = useState({
    setlists: globalSetlists,
    loading: globalLoading,
  });

  useEffect(() => {
    if (!currentUser) {
      setState({ setlists: [], loading: false });
      return;
    }

    const handleChange = () => {
      setState({
        setlists: globalSetlists,
        loading: globalLoading,
      });
    };

    subscribers.add(handleChange);

    // If user changed, reset
    if (activeUid !== currentUser.uid) {
        if (unsubscribeFn) {
            unsubscribeFn();
            unsubscribeFn = null;
        }
        activeUid = currentUser.uid;
        globalSetlists = [];
        globalLoading = true;
    }

    if (!unsubscribeFn) {
      const q = query(collection(db, SETLISTS_COLLECTION), orderBy('date', 'desc'));
      unsubscribeFn = onSnapshot(q, (snap) => {
        globalSetlists = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSetlist));
        globalLoading = false;
        notifySubscribers();
      }, () => {
          globalLoading = false;
          notifySubscribers();
      });
    } else {
        handleChange();
    }

    return () => {
      subscribers.delete(handleChange);
      if (subscribers.size === 0 && unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = null;
        activeUid = null;
      }
    };
  }, [currentUser?.uid]);

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
    ...state,
    createSetlist, updateSetlist,
    addSongToSetlist, removeSongFromSetlist, reorderSetlistSongs,
    deleteSetlist,
  };
}
