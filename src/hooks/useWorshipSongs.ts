"use client";

import { useState, useEffect, useCallback } from 'react';
import type { WorshipSong, SongChordSheet, ChordKey } from '@/types';
import { db, storage } from '@/lib/firebase';
import {
  collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, arrayUnion, orderBy, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/contexts/auth-context';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';

import { useWorshipData } from '@/contexts/worship-data-context';

const SONGS_COLLECTION = 'worshipSongs';

export function useWorshipSongs(enabled = true) {
  const worshipData = useWorshipData();
  const useShared = enabled && worshipData !== null;
  const { currentUser } = useAuth();
  const [songs, setSongs] = useState<WorshipSong[]>([]);
  const [loading, setLoading] = useState(!useShared);

  useEffect(() => {
    if (useShared || !enabled || !currentUser?.uid) {
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
      kind: 'image',
    };
    await updateDoc(doc(db, SONGS_COLLECTION, songId), {
      chordSheets: arrayUnion(sheet),
      updatedAt: serverTimestamp(),
    });
    return sheet;
  }, [currentUser]);

  const addTextChordSheet = useCallback(async (
    songId: string,
    sourceText: string,
    key: ChordKey,
  ): Promise<SongChordSheet> => {
    if (!currentUser) throw new Error('Not authenticated');
    const sheet: SongChordSheet = {
      id: crypto.randomUUID(),
      key,
      imageUrl: '',
      storagePath: '',
      uploadedAt: Timestamp.now(),
      kind: 'text',
      sourceText,
      annotations: [],
    };
    await updateDoc(doc(db, SONGS_COLLECTION, songId), {
      chordSheets: arrayUnion(sheet),
      updatedAt: serverTimestamp(),
    });
    return sheet;
  }, [currentUser]);

  const updateChordSheet = useCallback(async (
    songId: string,
    sheetId: string,
    patch: Partial<Pick<SongChordSheet, 'annotations' | 'sourceText' | 'key'>>,
  ) => {
    const list = useShared ? worshipData!.songs : songs;
    const song = list.find((s) => s.id === songId);
    if (!song) throw new Error('Song not found');
    const chordSheets = song.chordSheets.map((sheet) => (
      sheet.id === sheetId ? { ...sheet, ...patch } : sheet
    ));
    await updateDoc(doc(db, SONGS_COLLECTION, songId), {
      chordSheets,
      updatedAt: serverTimestamp(),
    });
  }, [useShared, worshipData, songs]);

  /** Remove a specific chord sheet image */
  const removeChordSheet = useCallback(async (songId: string, sheet: SongChordSheet) => {
    if (sheet.storagePath) {
      try { await deleteObject(ref(storage, sheet.storagePath)); } catch { /* already deleted */ }
    }
    const list = useShared ? worshipData!.songs : songs;
    const song = list.find((s) => s.id === songId);
    const chordSheets = (song?.chordSheets ?? []).filter((s) => s.id !== sheet.id);
    await updateDoc(doc(db, SONGS_COLLECTION, songId), {
      chordSheets,
      updatedAt: serverTimestamp(),
    });
  }, [useShared, worshipData, songs]);

  /** Delete an entire song and all its chord sheets */
  const deleteSong = useCallback(async (song: WorshipSong) => {
    for (const sheet of song.chordSheets) {
      if (!sheet.storagePath) continue;
      try { await deleteObject(ref(storage, sheet.storagePath)); } catch { /* ok */ }
    }
    await deleteDoc(doc(db, SONGS_COLLECTION, song.id));
  }, []);

  return {
    songs: useShared ? worshipData.songs : songs,
    loading: useShared ? worshipData.songsLoading : loading,
    addSong, updateSong, addChordSheet, addTextChordSheet, updateChordSheet, removeChordSheet, deleteSong,
  };
}
