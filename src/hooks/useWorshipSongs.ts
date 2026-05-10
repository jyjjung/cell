
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

const SONGS_COLLECTION = 'worshipSongs';

// Singleton state
let globalSongs: WorshipSong[] = [];
let globalLoading = true;
let subscribers = new Set<() => void>();
let unsubscribeFn: (() => void) | null = null;
let activeUid: string | null = null;

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

export function useWorshipSongs() {
  const { currentUser } = useAuth();
  const [state, setState] = useState({
    songs: globalSongs,
    loading: globalLoading,
  });

  useEffect(() => {
    if (!currentUser) {
      setState({ songs: [], loading: false });
      return;
    }

    const handleChange = () => {
      setState({
        songs: globalSongs,
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
        globalSongs = [];
        globalLoading = true;
    }

    if (!unsubscribeFn) {
      const q = query(collection(db, SONGS_COLLECTION), orderBy('title', 'asc'));
      unsubscribeFn = onSnapshot(q, (snap) => {
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSong));
        globalSongs = loaded;
        globalLoading = false;
        notifySubscribers();

        // ── Cache-prime chord sheet images into the SW CacheFirst cache ────────
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.caches) {
          // Optimized: check if already in cache before fetching to save bandwidth/ops
          (async () => {
              for (const song of loaded) {
                  for (const sheet of song.chordSheets) {
                      if (sheet.imageUrl) {
                          try {
                              const matched = await caches.match(sheet.imageUrl);
                              if (!matched) {
                                  // Fire-and-forget — only fetch if NOT in cache
                                  fetch(sheet.imageUrl, { mode: 'no-cors', cache: 'force-cache' }).then(() => {
                                      const img = new Image();
                                      img.src = sheet.imageUrl;
                                      img.decode().catch(() => {});
                                  }).catch(() => {});
                              } else {
                                  const img = new Image();
                                  img.src = sheet.imageUrl;
                                  img.decode().catch(() => {});
                              }
                          } catch (e) {}
                      }
                  }
              }
            })();
        }
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
    await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
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

  return { ...state, addSong, updateSong, addChordSheet, removeChordSheet, deleteSong };
}
