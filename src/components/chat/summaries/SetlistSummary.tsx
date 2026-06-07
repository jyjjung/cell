"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Music,
  ChevronRight,
  Play,
  CloudDownload,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { useWorshipData } from '@/contexts/worship-data-context';
import type { WorshipSetlist, WorshipSong } from '@/types';
import { cacheMediaUrlsForOffline, countCachedMediaUrls } from '@/lib/media-cache';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface SetlistSummaryProps {
  setlistId: string;
  isSender: boolean;
  onOpenViewer?: (songId?: string) => void;
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

export default function SetlistSummary({ setlistId, isSender, onOpenViewer }: SetlistSummaryProps) {
  const { data: setlist, loading: setlistLoading } = useFirestoreDoc<WorshipSetlist>('worshipSetlists', setlistId);
  const worshipData = useWorshipData();
  const songHook = useWorshipSongs(!!setlist && !worshipData);
  const worshipSongs = worshipData?.songs ?? songHook.songs;
  const { toast } = useToast();
  const router = useRouter();
  const [offlineCaching, setOfflineCaching] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState({ done: 0, total: 0 });
  const [offlineCached, setOfflineCached] = useState<{ cached: number; total: number } | null>(null);
  const offlineAbortRef = useRef<AbortController | null>(null);

  const setlistSongs = setlist?.songs ?? [];

  const mediaUrls = useMemo(() => {
    if (!setlist) return [];
    const urls: string[] = [];
    for (const ps of setlist.songs) {
      const libSong = worshipSongs.find((s) => s.id === ps.songId);
      if (!libSong) continue;
      libSong.chordSheets
        .filter((sheet) => sheet.key === ps.key)
        .forEach((sheet) => urls.push(sheet.imageUrl));
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

  if (setlistLoading || !setlist) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        Loading Setlist...
      </div>
    );
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
      className="block transition-transform active:scale-95 cursor-pointer"
    >
      <div
        className={cn(
          'group flex w-full max-w-full flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-all duration-200',
          isSender
            ? 'border-primary/30 bg-primary/5 text-foreground'
            : 'border-border/60 bg-card text-foreground',
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-muted/40">
                <Music className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Worship Setlist
              </span>
              {partialOffline && !offlineCaching && (
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {offlineCached!.cached}/{offlineCached!.total} saved
                </span>
              )}
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{setlist.name}</h3>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{dateText}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <Play className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {(offlineCaching || partialOffline) && offlineCached && offlineCached.total > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
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
              <p className="text-[10px] font-medium text-muted-foreground">
                {offlineCaching
                  ? `Saving ${offlineProgress.done} of ${offlineProgress.total} pages…`
                  : `${offlineCached.cached} of ${offlineCached.total} pages saved offline`}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {setlistSongs.map((song, i) => (
            <div
              key={song.songId}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenViewer) {
                  onOpenViewer(song.songId);
                } else {
                  router.push(`/worship?tab=playlists&id=${setlistId}&songId=${song.songId}`);
                }
              }}
              className="pointer-events-auto flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-4 text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                <p className="truncate text-[13px] font-medium text-foreground">{song.title}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {song.key}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1 flex items-center gap-2">
          {mediaUrls.length > 0 && (
            <button
              type="button"
              onClick={handleCacheOffline}
              disabled={offlineCaching}
              className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-60"
            >
              {offlineCaching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : allOfflineReady ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <CloudDownload className="h-3.5 w-3.5" />
              )}
              {offlineCaching
                ? `${offlineProgress.done}/${offlineProgress.total}`
                : allOfflineReady
                  ? 'Saved'
                  : partialOffline
                    ? `${offlineCached!.cached}/${offlineCached!.total}`
                    : 'Save offline'}
            </button>
          )}
          <div className="flex flex-1 items-center justify-between min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
              Open Chart Viewer
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
