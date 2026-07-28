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

function formatKeyLabel(key: ChordKey): string {
  return key === 'numbers' ? '#' : key;
}

function assignedUserIdsFromRoster(roster: WorshipRoster): string[] {
  const ids = new Set<string>();
  for (const slot of roster.slots || []) {
    for (const member of slot.members || []) {
      if (member.userId) ids.add(member.userId);
    }
  }
  return Array.from(ids);
}

async function findLinkedRosterRecipients(setlist: WorshipSetlist): Promise<string[]> {
  const recipients = new Set<string>();
  try {
    const queries = [
      getDocs(query(collection(db, ROSTERS_COLLECTION), where('setlistId', '==', setlist.id))),
    ];
    if (setlist.date) {
      queries.push(
        getDocs(query(collection(db, ROSTERS_COLLECTION), where('date', '==', setlist.date))),
      );
    }
    const snaps = await Promise.all(queries);
    for (const snap of snaps) {
      for (const d of snap.docs) {
        const roster = { id: d.id, ...d.data() } as WorshipRoster;
        for (const uid of assignedUserIdsFromRoster(roster)) {
          recipients.add(uid);
        }
      }
    }
  } catch (error) {
    console.error('[useWorshipSetlists] failed to resolve setlist recipients', error);
  }
  return Array.from(recipients);
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
    message: string,
  ) => {
    const recipients = (await findLinkedRosterRecipients(setlist))
      .filter((uid) => uid !== currentUser?.uid);
    if (recipients.length === 0) return;

    const title = `Setlist updated: ${setlist.name}`;
    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          title,
          message,
          type: 'reminder',
          isGlobal: false,
          userId,
          relatedUrl: `/worship?tab=playlists&id=${setlist.id}`,
        }).catch((error) => {
          console.error('[useWorshipSetlists] setlist notify failed', userId, error);
        }),
      ),
    );
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
    void notifySetlistChange(
      setlist,
      `"${songTitle}" (${formatKeyLabel(key)}) was added to ${setlist.name}${setlist.date ? ` (${setlist.date})` : ''}.`,
    );
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
      void notifySetlistChange(
        setlist,
        `"${previous.title}" key changed to ${formatKeyLabel(patch.key)} in ${setlist.name}${setlist.date ? ` (${setlist.date})` : ''}.`,
      );
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
      void notifySetlistChange(
        setlist,
        `"${removed.title}" was removed from ${setlist.name}${setlist.date ? ` (${setlist.date})` : ''}.`,
      );
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
