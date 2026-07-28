"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipSetlist, SetlistSong, ChordKey, ReferenceTrack, WorshipRoster } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, getDocs, where,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useWorshipData } from '@/contexts/worship-data-context';
import { useNotifications } from '@/hooks/use-notifications';

const SETLISTS_COLLECTION = 'worshipSetlists';
const ROSTERS_COLLECTION = 'worshipRosters';
const USERS_COLLECTION = 'users';

function collectLinkedRosterMemberIds(rosters: WorshipRoster[], setlistId: string): string[] {
  const ids = new Set<string>();
  for (const roster of rosters) {
    if (roster.setlistId !== setlistId) continue;
    for (const slot of roster.slots ?? []) {
      for (const member of slot.members ?? []) {
        if (member.userId) ids.add(member.userId);
      }
    }
  }
  return [...ids];
}

/** Worship team only (worship.manage) — not app admins unless they also have that capability. */
async function collectWorshipTeamIds(): Promise<string[]> {
  const managersSnap = await getDocs(
    query(collection(db, USERS_COLLECTION), where('capabilityKeys', 'array-contains', 'worship.manage')),
  );
  return managersSnap.docs.map((d) => d.id);
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
    detail: string,
  ) => {
    if (!currentUser?.uid) return;
    try {
      const rosterSnap = await getDocs(query(collection(db, ROSTERS_COLLECTION), orderBy('date', 'desc')));
      const rosters = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipRoster));
      const linkedMemberIds = collectLinkedRosterMemberIds(rosters, setlist.id);

      // Linked → that roster’s assigned members.
      // Unlinked → worship team only (worship.manage), not app admins.
      const recipientIds = (
        linkedMemberIds.length > 0
          ? linkedMemberIds
          : await collectWorshipTeamIds()
      ).filter((uid) => uid !== currentUser.uid);

      if (recipientIds.length === 0) return;

      const setlistLabel = setlist.name?.trim() || 'Setlist';
      const relatedUrl = `/worship?tab=playlists&id=${encodeURIComponent(setlist.id)}`;

      await Promise.all(
        recipientIds.map((userId) =>
          createNotification({
            title: `Setlist updated: ${setlistLabel}`,
            message: `${detail} in “${setlistLabel}”.`,
            type: 'reminder',
            isGlobal: false,
            userId,
            relatedUrl,
          }).catch((error) => {
            console.error('[useWorshipSetlists] Failed to notify:', userId, error);
          }),
        ),
      );
    } catch (error) {
      console.error('[useWorshipSetlists] notifySetlistChange failed:', error);
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
    await notifySetlistChange(setlist, `“${songTitle}” (${keyLabel}) was added`);
  }, [notifySetlistChange]);

  const updateSetlistSong = useCallback(async (
    setlist: WorshipSetlist,
    songId: string,
    patch: Partial<Pick<SetlistSong, 'key' | 'referenceTracks' | 'chordSheetIds'>>,
  ) => {
    const existing = setlist.songs.find((s) => s.songId === songId);
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

    // Only notify for key changes — sheet/track tweaks are too noisy.
    if (patch.key !== undefined && existing && existing.key !== patch.key) {
      const nextKey = patch.key === 'numbers' ? '#' : patch.key;
      await notifySetlistChange(setlist, `Key for “${existing.title}” changed to ${nextKey}`);
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
      await notifySetlistChange(setlist, `“${removed.title}” was removed`);
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
