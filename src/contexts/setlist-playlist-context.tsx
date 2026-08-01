"use client";

import {
    bindMediaSessionHandlers,
    setMediaSessionPlaybackState,
    syncMediaSessionMetadata,
    syncMediaSessionPosition
} from '@/lib/media-session-controls';
import type { PlaylistQueueItem } from '@/lib/setlist-playlist-queue';
import { playlistItemLabel } from '@/lib/setlist-playlist-queue';
import { fetchYoutubeVideoTitle } from '@/lib/worship-utils';
import {
    loadYoutubeIframeApi, YT_ENDED, YT_PAUSED, YT_PLAYING, type YTPlayer
} from '@/lib/youtube-player-api';
import React, {
    createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';

const YT_MOUNT_ID = 'setlist-playlist-yt-mount';

type SetlistPlaylistContextValue = {
  queue: PlaylistQueueItem[];
  setlistId: string | null;
  setlistName: string | null;
  currentIndex: number;
  currentItem: PlaylistQueueItem | null;
  playing: boolean;
  ready: boolean;
  /** YouTube's player API could not be loaded (blocked script / offline). */
  failed: boolean;
  retry: () => void;
  currentTime: number;
  duration: number;
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  isActive: boolean;
  startPlaylist: (setlistId: string, name: string, items: PlaylistQueueItem[], startIndex?: number) => void;
  stopPlaylist: () => void;
  togglePlay: () => void;
  playIndex: (index: number) => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
};

const SetlistPlaylistContext = createContext<SetlistPlaylistContextValue | null>(null);

export function useSetlistPlaylistOptional() {
  return useContext(SetlistPlaylistContext);
}

export function SetlistPlaylistProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<YTPlayer | null>(null);
  const queueRef = useRef<PlaylistQueueItem[]>([]);
  const setlistIdRef = useRef<string | null>(null);
  const setlistNameRef = useRef<string | null>(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const titleCacheRef = useRef<Map<string, string>>(new Map());
  const pendingStartIndexRef = useRef<number | null>(null);
  const loadIndexRef = useRef<(index: number, autoplay: boolean) => void>(() => {});
  const nextRef = useRef<() => void>(() => {});

  const [queue, setQueue] = useState<PlaylistQueueItem[]>([]);
  const [setlistId, setSetlistId] = useState<string | null>(null);
  const [setlistName, setSetlistName] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [playerEnabled, setPlayerEnabled] = useState(false);

  const currentItem = queue[currentIndex] ?? null;

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      const t = playerRef.current?.getCurrentTime() ?? 0;
      const d = playerRef.current?.getDuration() ?? 0;
      setCurrentTime(t);
      if (Number.isFinite(d) && d > 0) setDuration(d);
      syncMediaSessionPosition({ duration: d, position: t, playing: true });
    }, 500);
  }, [clearTick]);

  const loadIndex = useCallback(async (index: number, autoplay: boolean) => {
    const items = queueRef.current;
    const item = items[index];
    if (!item || !playerRef.current) return;

    indexRef.current = index;
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setTrackTitle(null);

    const cached = titleCacheRef.current.get(item.videoId);
    if (cached) setTrackTitle(cached);
    else {
      void fetchYoutubeVideoTitle(item.videoId).then((title) => {
        if (title && queueRef.current[indexRef.current]?.videoId === item.videoId) {
          titleCacheRef.current.set(item.videoId, title);
          setTrackTitle(title);
        }
      });
    }

    syncMediaSessionMetadata({
      title: playlistItemLabel(item),
      artist: setlistNameRef.current ?? 'Setlist',
      album: item.songTitle,
    });

    playerRef.current.loadVideoById({
      videoId: item.videoId,
      startSeconds: 0,
    });

    if (autoplay) {
      playerRef.current.playVideo();
    }
  }, []);

  loadIndexRef.current = loadIndex;

  const next = useCallback(() => {
    const items = queueRef.current;
    if (items.length === 0) return;
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= items.length) {
      playerRef.current?.pauseVideo();
      playingRef.current = false;
      setPlaying(false);
      setMediaSessionPlaybackState(false);
      clearTick();
      return;
    }
    void loadIndex(nextIndex, true);
  }, [clearTick, loadIndex]);

  nextRef.current = next;

  const previous = useCallback(() => {
    const items = queueRef.current;
    if (items.length === 0) return;
    const t = playerRef.current?.getCurrentTime() ?? 0;
    if (t > 3) {
      playerRef.current?.seekTo(0, true);
      setCurrentTime(0);
      return;
    }
    const prevIndex = Math.max(0, indexRef.current - 1);
    void loadIndex(prevIndex, true);
  }, [loadIndex]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !ready) return;
    if (playingRef.current) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [ready]);

  const seek = useCallback((time: number) => {
    if (!playerRef.current || !ready) return;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
    syncMediaSessionPosition({ duration, position: time, playing: playingRef.current });
  }, [duration, ready]);

  const playIndex = useCallback((index: number) => {
    if (index < 0 || index >= queueRef.current.length) return;
    void loadIndex(index, true);
  }, [loadIndex]);

  const startPlaylist = useCallback((id: string, name: string, items: PlaylistQueueItem[], startIndex = 0) => {
    if (items.length === 0) return;
    setPlayerEnabled(true);
    queueRef.current = items;
    setlistIdRef.current = id;
    setlistNameRef.current = name;
    setQueue(items);
    setSetlistId(id);
    setSetlistName(name);
    setExpanded(true);
    const idx = Math.min(Math.max(0, startIndex), items.length - 1);
    if (playerRef.current && ready) {
      void loadIndex(idx, true);
    } else {
      pendingStartIndexRef.current = idx;
    }
  }, [loadIndex, ready]);

  const stopPlaylist = useCallback(() => {
    queueRef.current = [];
    setlistIdRef.current = null;
    setlistNameRef.current = null;
    setQueue([]);
    setSetlistId(null);
    setSetlistName(null);
    setCurrentIndex(0);
    setExpanded(false);
    setPlayerEnabled(false);
    playingRef.current = false;
    setPlaying(false);
    clearTick();
    try { playerRef.current?.stopVideo(); } catch { /* ignore */ }
    setMediaSessionPlaybackState(false);
  }, [clearTick]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!playerEnabled) return;

    let cancelled = false;
    setFailed(false);

    // Mount outside React's tree — YouTube replaces this node's children and
    // React must not try to reconcile/remove them on unmount.
    const mount = document.createElement('div');
    mount.id = YT_MOUNT_ID;
    mount.setAttribute('aria-hidden', 'true');
    Object.assign(mount.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      left: '-9999px',
      top: '-9999px',
    });
    document.body.appendChild(mount);

    void loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || playerRef.current || !mount.isConnected) return;

        playerRef.current = new YT.Player(mount, {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setReady(true);
              if (pendingStartIndexRef.current !== null && queueRef.current.length > 0) {
                const idx = pendingStartIndexRef.current;
                pendingStartIndexRef.current = null;
                loadIndexRef.current(idx, true);
              }
            },
            onStateChange: (event) => {
              if (event.data === YT_PLAYING) {
                playingRef.current = true;
                setPlaying(true);
                setMediaSessionPlaybackState(true);
                startTick();
              } else {
                playingRef.current = false;
                setPlaying(false);
                setMediaSessionPlaybackState(false);
                clearTick();
                if (event.data === YT_PAUSED || event.data === YT_ENDED) {
                  setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
                }
                if (event.data === YT_ENDED) {
                  nextRef.current();
                }
              }
            },
          },
        });
      })
      .catch(() => {
        // Script blocked / offline — keep the bar up so the user can retry
        // rather than having playback silently disappear.
        if (!cancelled) {
          setReady(false);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      clearTick();
      setReady(false);
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
      mount.replaceChildren();
      mount.remove();
    };
  }, [clearTick, startTick, playerEnabled, attempt]);

  useEffect(() => {
    if (!currentItem || !setlistName) return;
    const displayTitle = trackTitle ?? playlistItemLabel(currentItem);
    syncMediaSessionMetadata({
      title: displayTitle,
      artist: setlistName,
      album: currentItem.songTitle,
    });
  }, [currentItem, setlistName, trackTitle]);

  useEffect(() => {
    return bindMediaSessionHandlers({
      onPlay: () => togglePlay(),
      onPause: () => togglePlay(),
      onNext: () => next(),
      onPrevious: () => previous(),
      onSeek: (time) => seek(time),
    });
  }, [next, previous, seek, togglePlay]);

  const value = useMemo<SetlistPlaylistContextValue>(() => ({
    queue,
    setlistId,
    setlistName,
    currentIndex,
    currentItem,
    playing,
    ready,
    failed,
    retry,
    currentTime,
    duration,
    expanded,
    setExpanded,
    isActive: queue.length > 0,
    startPlaylist,
    stopPlaylist,
    togglePlay,
    playIndex,
    next,
    previous,
    seek,
  }), [
    queue, setlistId, setlistName, currentIndex, currentItem, playing, ready, failed, retry,
    currentTime, duration,
    expanded, startPlaylist, stopPlaylist, togglePlay, playIndex, next, previous, seek,
  ]);

  return (
    <SetlistPlaylistContext.Provider value={value}>
      {children}
    </SetlistPlaylistContext.Provider>
  );
}
