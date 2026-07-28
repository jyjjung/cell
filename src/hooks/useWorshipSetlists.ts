"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipSetlist, SetlistSong, ChordKey, ReferenceTrack, WorshipRoster } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, getDocs, where,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useWorshipData } from '@/contexts/worship-data-context';

const SETLISTS_COLLECTION = 'worshipSetlists';
const ROSTERS_COLLECTION = 'worshipRosters';

function collectAssignedUserIds(rosters: WorshipRoster[]): string[] {
  const ids = new Set<string>();
  for (const roster of rosters) {
    for (const slot of roster.slots || []) {
      for (const member of slot.members || []) {
        if (member?.userId) ids.add(member.userId);
      }
    }
  }
  return Array.from(ids);
}

export function useWorshipSetlists(enabled = true) {
  const worshipData = useWorshipData();
  const useShared = enabled && worshipData !== null;
  const { currentUser } = useAuth();
  const { createNotification } = useNotifications();
  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [loading, setLoading] = useState(!useShared);

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

  const notifySetlistChange = useCallback(async (
    setlist: WorshipSetlist,
    changeSummary: string,
  ) => {
    if (!currentUser?.uid) return;
    try {
      const rosterSnap = await getDocs(
        query(collection(db, ROSTERS_COLLECTION), where('setlistId', '==', setlist.id)),
      );
      const linkedRosters = rosterSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as WorshipRoster,
      );
      const recipientIds = collectAssignedUserIds(linkedRosters)
        .filter((uid) => uid !== currentUser.uid);
      if (recipientIds.length === 0) return;

      const setlistLabel = setlist.name?.trim() || 'Untitled setlist';
      await Promise.all(
        recipientIds.map((userId) =>
          createNotification({
            title: `Setlist updated: ${setlistLabel}`,
            message: `${changeSummary} in “${setlistLabel}”.`,
            type: 'reminder',
            isGlobal: false,
            userId,
            relatedUrl: `/worship?tab=playlists&id=${setlist.id}`,
          }).catch((err) => {
            console.error('[useWorshipSetlists] setlist change notify failed:', err);
          }),
        ),
      );
    } catch (err) {
      console.error('[useWorshipSetlists] setlist change notify failed:', err);
    }
  }, [createNotification, currentUser?.uid]);

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
    const keyLabel = key === 'numbers' ? '#' : key;
    void notifySetlistChange(setlist, `“${songTitle}” (${keyLabel}) was added`);
  }, [notifySetlistChange]);

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

    if (previous && patch.key !== undefined && patch.key !== previous.key) {
      const from = previous.key === 'numbers' ? '#' : previous.key;
      const to = patch.key === 'numbers' ? '#' : patch.key;
      void notifySetlistChange(
        setlist,
        `Key for “${previous.title}” changed from ${from} to ${to}`,
      );
    } else if (previous && ('referenceTracks' in patch || 'chordSheetIds' in patch)) {
      void notifySetlistChange(setlist, `“${previous.title}” was updated`);
    }
  }, [notifySetlistChange]);

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
    if (removed) {
      void notifySetlistChange(setlist, `“${removed.title}” was removed`);
    }
  }, [notifySetlistChange]);

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
    setlists: useShared ? worshipData.setlists : setlists,
    loading: useShared ? worshipData.setlistsLoading : loading,
    createSetlist, updateSetlist,
    addSongToSetlist, updateSetlistSong, removeSongFromSetlist, reorderSetlistSongs,
    deleteSetlist,
  };
}
