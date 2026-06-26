"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipSong, SongChordSheet, ChordKey } from '@/types';
import { db, storage } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, arrayUnion, arrayRemove, orderBy, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/contexts/auth-context';
import { primeMediaUrls, STORAGE_CACHE_CONTROL } from '@/lib/media-cache';

import { useWorshipData } from '@/contexts/worship-data-context';

const SONGS_COLLECTION = 'worshipSongs';

export function useWorshipSongs(enabled = true) {
  const worshipData = useWorshipData();
  const useShared = enabled && worshipData !== null;
  const { currentUser } = useAuth();
  const [songs, setSongs] = useState<WorshipSong[]>([]);
  const [loading, setLoading] = useState(!useShared);

  useEffect(() => {
    if (useShared || !enabled || !currentUser) {
      if (!useShared) {
        setSongs([]);
        setLoading(false);
      }
      return;
    }
    const q = query(collection(db, SONGS_COLLECTION), orderBy('title', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSong));
      setSongs(loaded);
      setLoading(false);

      primeMediaUrls(
        loaded.flatMap((song) => song.chordSheets.map((sheet) => sheet.imageUrl)),
      );
    }, () => setLoading(false));
    return unsub;
  }, [useShared, enabled, currentUser?.uid]);

  /** Create a new song with no chord sheets yet */
  const addSong = useCallback(async (title: string, artist?: string): Promise<string> => {
    if (!currentUser) throw new Error('Not authenticated');
    const docRef = await addDoc(collection(db, SONGS_COLLECTION), {
      title: title.trim(),
      artist: artist?.trim() || null,
      chordSheets: [],
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }, [currentUser]);

  /** Update song metadata (title/artist) */
  const updateSong = useCallback(async (songId: string, data: { title?: string; artist?: string | null }) => {
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    // Remove undefined values to avoid Firebase error
    if (updateData.title === undefined) delete updateData.title;
    if (updateData.artist === undefined) delete updateData.artist;

    await updateDoc(doc(db, SONGS_COLLECTION, songId), updateData);
  }, []);

  /** Upload a chord sheet image and add it to the song */
  const addChordSheet = useCallback(async (
    songId: string,
    file: File,
    key: ChordKey,
  ): Promise<SongChordSheet> => {
    if (!currentUser) throw new Error('Not authenticated');
    const sheetId = (typeof window !== 'undefined' && window.crypto?.randomUUID) 
      ? window.crypto.randomUUID() 
      : crypto.randomUUID();
    const lastDotIndex = file.name.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? file.name.slice(lastDotIndex).toLowerCase() : '';
    const storagePath = `worshipChordSheets/${songId}/${sheetId}${extension}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { 
      contentType: file.type || 'application/octet-stream',
      cacheControl: STORAGE_CACHE_CONTROL
    });
    const imageUrl = await getDownloadURL(storageRef);
    const sheet: SongChordSheet = {
      id: sheetId,
      key,
      imageUrl,
      storagePath,
      uploadedAt: Timestamp.now(),
    };
    await updateDoc(doc(db, SONGS_COLLECTION, songId), {
      chordSheets: arrayUnion(sheet),
      updatedAt: serverTimestamp(),
    });
    return sheet;
  }, [currentUser]);

  /** Remove a specific chord sheet image */
  const removeChordSheet = useCallback(async (songId: string, sheet: SongChordSheet) => {
    try { await deleteObject(ref(storage, sheet.storagePath)); } catch { /* already deleted */ }
    await updateDoc(doc(db, SONGS_COLLECTION, songId), {
      chordSheets: arrayRemove(sheet),
      updatedAt: serverTimestamp(),
    });
  }, []);

  /** Delete an entire song and all its chord sheets */
  const deleteSong = useCallback(async (song: WorshipSong) => {
    for (const sheet of song.chordSheets) {
      try { await deleteObject(ref(storage, sheet.storagePath)); } catch { /* ok */ }
    }
    await deleteDoc(doc(db, SONGS_COLLECTION, song.id));
  }, []);

  return {
    songs: useShared ? worshipData.songs : songs,
    loading: useShared ? worshipData.songsLoading : loading,
    addSong, updateSong, addChordSheet, removeChordSheet, deleteSong,
  };
}
