"use client";

import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { Button } from '@/components/ui/button';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/auth-context';
import { useSetlistPlaylistOptional } from '@/contexts/setlist-playlist-context';
import { useWorshipData } from '@/contexts/worship-data-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { useToast } from '@/hooks/use-toast';
import { useWorshipSongsByIds } from '@/hooks/use-worship-songs-by-ids';
import { cacheMediaUrlsForOffline, countCachedMediaUrls } from '@/lib/media-cache';
import { buildSetlistPlaylistQueue } from '@/lib/setlist-playlist-queue';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { getReferenceTracks, hasReferenceTracks, resolveChordSheetsForSetlistSong, setlistSongEntryKey } from '@/lib/worship-utils';
import type { WorshipSetlist } from '@/types';
import { format } from 'date-fns';
import {
    Check, ChevronRight, CloudDownload, ListMusic, Music, Pause, Play, Youtube
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  chatCardAction,
  chatCardEyebrow,
  chatCardFooter,
  chatCardIcon,
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
  chatCardTitle,
} from './chat-card-styles';

interface SetlistSummaryProps {
  setlistId: string;
  isSender: boolean;
  onOpenViewer?: (songId?: string) => void;
  /** When the setlist is gone, call so the parent can render an inline deleted notice. */
  onMissing?: () => void;
}

function offlineReadyKey(setlistId: string) {
  return `setlist_offline_ready_${setlistId}`;
}

function mediaUrlsHash(urls: string[]): string {
  return urls.slice().sort().join('\0');
}

function readOfflineReady(setlistId: string): { count: number; hash: string } | null {
  try {
    const raw = localStorage.getItem(offlineReadyKey(setlistId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { count: number; hash: string };
    if (typeof parsed.count === 'number' && typeof parsed.hash === 'string') return parsed;
  } catch {
    /* legacy string value — ignore */
  }
  return null;
}

function writeOfflineReady(setlistId: string, urls: string[]) {
  localStorage.setItem(
    offlineReadyKey(setlistId),
    JSON.stringify({ count: urls.length, hash: mediaUrlsHash(urls) }),
  );
}

function isOfflineReadyLocally(setlistId: string, urls: string[]): boolean {
  const record = readOfflineReady(setlistId);
  if (!record || urls.length === 0) return false;
  return record.count === urls.length && record.hash === mediaUrlsHash(urls);
}

export default function SetlistSummary({ setlistId, isSender, onOpenViewer, onMissing }: SetlistSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data: setlist, loading: setlistLoading } = useFirestoreDoc<WorshipSetlist>('worshipSetlists', setlistId);

  useEffect(() => {
    if (!setlistLoading && !setlist) onMissing?.();
  }, [setlistLoading, setlist, onMissing]);
  const worshipData = useWorshipData();
  const setlistSongIds = useMemo(
    () => (setlist?.songs ?? []).map((s) => s.songId).filter(Boolean),
    [setlist],
  );
  const songHook = useWorshipSongsByIds(setlistSongIds, !!setlist && !worshipData);
  const worshipSongs = worshipData?.songs ?? songHook.songs;
  const { toast } = useToast();
  const router = useRouter();
  const [offlineCaching, setOfflineCaching] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState({ done: 0, total: 0 });
  const [offlineCached, setOfflineCached] = useState<{ cached: number; total: number } | null>(null);
  const offlineAbortRef = useRef<AbortController | null>(null);
  const playlist = useSetlistPlaylistOptional();

  const setlistSongs = setlist?.songs ?? [];

  const playlistQueue = useMemo(
    () => (setlist ? buildSetlistPlaylistQueue(setlist) : []),
    [setlist],
  );

  const playlistActiveForSetlist =
    playlist?.setlistId === setlistId && playlist.isActive;

  const mediaUrls = useMemo(() => {
    if (!setlist) return [];
    const urls: string[] = [];
    for (const ps of setlist.songs) {
      const libSong = worshipSongs.find((s) => s.id === ps.songId);
      resolveChordSheetsForSetlistSong(libSong, ps).forEach((sheet) => {
        if (sheet.imageUrl) urls.push(sheet.imageUrl);
      });
    }
    return urls;
  }, [setlist, worshipSongs]);

  useEffect(() => {
    let cancelled = false;
    if (mediaUrls.length === 0) {
      setOfflineCached(null);
      return;
    }

    if (isOfflineReadyLocally(setlistId, mediaUrls)) {
      setOfflineCached({ cached: mediaUrls.length, total: mediaUrls.length });
    }

    void countCachedMediaUrls(mediaUrls).then((result) => {
      if (cancelled) return;
      if (result.cached === result.total && result.total > 0) {
        writeOfflineReady(setlistId, mediaUrls);
        setOfflineCached(result);
      } else if (isOfflineReadyLocally(setlistId, mediaUrls)) {
        setOfflineCached({ cached: mediaUrls.length, total: mediaUrls.length });
      } else {
        localStorage.removeItem(offlineReadyKey(setlistId));
        setOfflineCached(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mediaUrls, setlistId]);

  useEffect(() => {
    return () => {
      offlineAbortRef.current?.abort();
    };
  }, []);

  const allOfflineReady =
    offlineCached !== null &&
    offlineCached.total > 0 &&
    offlineCached.cached === offlineCached.total;

  const partialOffline =
    offlineCached !== null &&
    offlineCached.total > 0 &&
    offlineCached.cached > 0 &&
    offlineCached.cached < offlineCached.total;

  const offlineProgressPct =
    offlineCached && offlineCached.total > 0
      ? Math.round((offlineCached.cached / offlineCached.total) * 100)
      : 0;

  const handlePlayPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!setlist || playlistQueue.length === 0) {
      toast({
        title: 'No reference tracks',
        description: 'Add YouTube reference links to setlist songs to use the playlist.',
      });
      return;
    }
    if (playlistActiveForSetlist) {
      playlist?.togglePlay();
      playlist?.setExpanded(true);
      return;
    }
    playlist?.startPlaylist(setlistId, setlist.name, playlistQueue);
  };

  const handleCacheOffline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaUrls.length === 0) {
      toast({ title: 'Nothing to cache', description: 'This setlist has no chord sheets yet.' });
      return;
    }
    setOfflineCaching(true);
    setOfflineProgress({ done: 0, total: mediaUrls.length });
    const controller = new AbortController();
    offlineAbortRef.current = controller;
    try {
      const result = await cacheMediaUrlsForOffline(mediaUrls, {
        signal: controller.signal,
        onProgress: (done, total) => setOfflineProgress({ done, total }),
      });
      if (result.aborted) return;
      if (result.quotaExceeded) {
        toast({
          title: 'Storage full',
          description:
            'Could not save all pages. Try clearing browser data for this site, or cache a smaller setlist.',
          variant: 'destructive',
        });
      } else if (result.failed === 0) {
        const saved = result.ok + result.skipped;
        writeOfflineReady(setlistId, mediaUrls);
        setOfflineCached({ cached: result.total, total: result.total });
        toast({
          title: 'Ready for offline',
          description:
            result.skipped > 0
              ? `${saved} of ${result.total} pages available (${result.skipped} already on device).`
              : `Cached ${result.ok} of ${result.total} pages on this device.`,
        });
      } else {
        toast({
          title: 'Partially cached',
          description: `${result.ok + result.skipped} of ${result.total} pages saved. ${result.failed} failed — check your connection and try again.`,
          variant: 'destructive',
        });
        setOfflineCached(await countCachedMediaUrls(mediaUrls));
      }
    } catch (err: unknown) {
      toast({
        title: 'Cache failed',
        description: err instanceof Error ? err.message : 'Could not save setlist for offline use.',
        variant: 'destructive',
      });
    } finally {
      offlineAbortRef.current = null;
      setOfflineCaching(false);
    }
  };

  if (setlistLoading) {
    return <div className={chatCardLoading}>Loading…</div>;
  }

  if (!setlist) {
    if (onMissing) return null;
    return <DeletedContentNotice label={t.deletedContentSetlist} />;
  }

  const formatDateText = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, 'EEEE, MMM do');
    } catch {
      return dateStr;
    }
  };

  const dateText = formatDateText(setlist.date);
  const firstSongId = setlistSongs[0]?.songId;

  return (
    <div
      onClick={() => {
        if (onOpenViewer) {
          onOpenViewer(firstSongId);
        } else {
          router.push(`/worship?tab=playlists&id=${setlistId}${firstSongId ? `&songId=${firstSongId}` : ''}`);
        }
      }}
      className="block w-full min-w-0 max-w-full cursor-pointer transition-transform active:scale-95"
    >
      <div className={chatCardShell(isSender, 'gap-3.5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <div className={chatCardIcon}>
                <Music className="h-3.5 w-3.5" />
              </div>
              <span className={chatCardEyebrow}>Setlist</span>
              {partialOffline && !offlineCaching && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {offlineCached!.cached}/{offlineCached!.total} saved
                </span>
              )}
            </div>
            <h3 className={cn(chatCardTitle, 'mb-1')}>{setlist.name}</h3>
            <p className={chatCardMeta}>{dateText}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted">
            <Play className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {(offlineCaching || partialOffline) && offlineCached && offlineCached.total > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${offlineCaching
                    ? Math.round((offlineProgress.done / offlineProgress.total) * 100)
                    : offlineProgressPct}%`,
                }}
              />
            </div>
            {!allOfflineReady && (
              <p className="text-xs font-medium text-muted-foreground">
                {offlineCaching
                  ? `Saving ${offlineProgress.done} of ${offlineProgress.total} pages…`
                  : `${offlineCached.cached} of ${offlineCached.total} pages saved offline`}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {setlistSongs.map((song, i) => (
            <div
              key={setlistSongEntryKey(song, i)}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenViewer) {
                  onOpenViewer(song.songId);
                } else {
                  router.push(`/worship?tab=playlists&id=${setlistId}&songId=${song.songId}`);
                }
              }}
              className="pointer-events-auto flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-transparent p-2.5 transition-colors hover:bg-muted/30"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <p className="min-w-0 truncate text-sm font-medium text-foreground">{song.title}</p>
                {hasReferenceTracks(song) && (
                  <Youtube
                    className="h-3 w-3 shrink-0 text-red-500"
                    aria-label={getReferenceTracks(song).length > 1 ? 'Has reference tracks' : 'Has reference track'}
                  />
                )}
              </div>
              <div className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {song.key === 'numbers' ? '#' : song.key}
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {playlistQueue.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handlePlayPlaylist}
              className={cn(
                chatCardAction,
                'h-auto hit-min',
                playlistActiveForSetlist && 'border-primary/40 text-primary hover:bg-primary/10',
              )}
            >
              {playlistActiveForSetlist && playlist?.playing ? (
                <Pause className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ListMusic className="h-3.5 w-3.5 shrink-0" />
              )}
              {playlistActiveForSetlist
                ? playlist?.playing
                  ? 'Playing'
                  : 'Paused'
                : `Playlist (${playlistQueue.length})`}
            </Button>
          )}
          {mediaUrls.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleCacheOffline}
              disabled={offlineCaching}
              className={cn(chatCardAction, 'h-auto hit-min')}
            >
              {offlineCaching ? (
                <ButtonSpinner size="sm" className="shrink-0" />
              ) : allOfflineReady ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <CloudDownload className="h-3.5 w-3.5 shrink-0" />
              )}
              {offlineCaching
                ? `${offlineProgress.done}/${offlineProgress.total}`
                : allOfflineReady
                  ? 'Saved'
                  : partialOffline
                    ? `${offlineCached!.cached}/${offlineCached!.total}`
                    : 'Save offline'}
            </Button>
          )}
          <div className={cn(chatCardFooter, 'min-w-0 flex-1 pt-0')}>
            <span className="truncate">Open charts</span>
            <ChevronRight
              className="h-4 w-4 shrink-0"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
