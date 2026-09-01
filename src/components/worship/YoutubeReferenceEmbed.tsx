"use client";

import {
    Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';
import { fetchYoutubeVideoTitle, getReferenceTracks, parseYoutubeVideoId } from '@/lib/worship-utils';
import {
    captureYoutubeLoadFailure,
    loadYoutubeIframeApi, YT_ENDED, YT_PAUSED, YT_PLAYING, type YTPlayer
} from '@/lib/youtube-player-api';
import type { ReferenceTrack, SetlistSong } from '@/types';
import { Headphones, Pause, Play, X, Youtube } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useYoutubeVideoTitle(videoId: string | null) {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setTitle(null);
      return;
    }
    let cancelled = false;
    setTitle(null);
    void fetchYoutubeVideoTitle(videoId).then((t) => {
      if (!cancelled && t) setTitle(t);
    });
    return () => { cancelled = true; };
  }, [videoId]);

  return title;
}

function useYoutubePlayer(
  videoId: string | null,
  containerId: string,
  enabled: boolean,
  onTitle?: (title: string) => void,
) {
  const playerRef = useRef<YTPlayer | null>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useLayoutEffect(() => {
    if (!videoId || !enabled) return;
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | null = null;

    const mount = document.getElementById(containerId);
    if (!mount) return;

    setFailed(false);

    void loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !document.getElementById(containerId)) return;
        new YT.Player(containerId, {
          videoId,
          height: '0',
          width: '0',
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
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              const d = event.target.getDuration();
              if (Number.isFinite(d) && d > 0) setDuration(d);
              try {
                const videoTitle = event.target.getVideoData()?.title?.trim();
                if (videoTitle) onTitleRef.current?.(videoTitle);
              } catch { /* ignore */ }
              setReady(true);
            },
            onStateChange: (event) => {
              if (event.data === YT_PLAYING) {
                setPlaying(true);
                if (tick) clearInterval(tick);
                tick = setInterval(() => {
                  const t = playerRef.current?.getCurrentTime() ?? 0;
                  const d = playerRef.current?.getDuration() ?? 0;
                  setCurrentTime(t);
                  if (Number.isFinite(d) && d > 0) setDuration(d);
                }, 250);
              } else {
                setPlaying(false);
                if (tick) {
                  clearInterval(tick);
                  tick = null;
                }
                if (event.data === YT_PAUSED || event.data === YT_ENDED) {
                  setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
                }
                if (event.data === YT_ENDED) {
                  setCurrentTime(0);
                }
              }
            },
          },
        });
      })
      .catch((err) => {
        // Script blocked / offline — leave controls disabled.
        captureYoutubeLoadFailure(err, 'reference-track-panel');
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
      try { playerRef.current?.destroy(); } catch { /* already destroyed */ }
      playerRef.current = null;
      setReady(false);
      setFailed(false);
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [videoId, containerId, enabled]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !ready) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [playing, ready]);

  const seek = useCallback((time: number) => {
    if (!playerRef.current || !ready) return;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
  }, [ready]);

  return { ready, failed, playing, currentTime, duration, togglePlay, seek };
}

/** Full audio player panel with title, play/pause, and scrubber. */
export function YoutubePlayerPanel({
  url,
  note,
  theme = 'dark',
  className,
  enabled = true,
  onClose,
  compact = false,
}: {
  url: string;
  note?: string;
  theme?: 'dark' | 'light';
  className?: string;
  enabled?: boolean;
  onClose?: () => void;
  compact?: boolean;
}) {
  const videoId = parseYoutubeVideoId(url);
  const reactId = useId().replace(/:/g, '');
  const containerId = `yt-ref-${reactId}`;
  const oembedTitle = useYoutubeVideoTitle(videoId);
  const [playerTitle, setPlayerTitle] = useState<string | null>(null);
  const { ready, failed, playing, currentTime, duration, togglePlay, seek } = useYoutubePlayer(
    videoId,
    containerId,
    enabled,
    setPlayerTitle,
  );
  const displayTitle = playerTitle ?? oembedTitle;

  if (!videoId) return null;

  const isDark = theme === 'dark';

  const shell = cn(
    'relative rounded-xl border transition-colors',
    compact ? 'px-2 py-1.5' : 'px-3 py-2.5 space-y-2',
    isDark
      ? 'border-white/15 bg-white/10 backdrop-blur-md'
      : 'border-border/50 bg-muted/40',
    className,
  );

  const titleClass = cn(
    'font-semibold truncate flex items-center gap-1 min-w-0 flex-1',
    compact ? 'text-[10px]' : 'text-xs',
    isDark ? 'text-white/85' : 'text-foreground',
  );

  const timeClass = cn(
    'font-semibold tabular-nums shrink-0',
    compact ? 'text-[9px]' : 'text-[10px]',
    isDark ? 'text-white/60' : 'text-muted-foreground',
  );

  const noteClass = cn(
    'font-medium truncate',
    compact ? 'text-[9px]' : 'text-[10px]',
    isDark ? 'text-white/55' : 'text-muted-foreground',
  );

  const playBtnClass = cn(
    'shrink-0 disabled:opacity-40',
    compact
      ? cn('rounded-lg', isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-background text-foreground hover:bg-muted border border-border/50')
      : cn('rounded-xl', isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-background text-foreground hover:bg-muted border border-border/50'),
  );

  const scrubClass = cn(
    'flex-1 appearance-none rounded-full cursor-pointer disabled:opacity-40',
    compact ? 'h-1' : 'h-1.5',
    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500',
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-500',
    compact
      ? '[&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5'
      : '[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3',
    isDark ? 'bg-white/15' : 'bg-muted',
  );

  return (
    <div className={shell}>
      <div id={containerId} className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none" aria-hidden />

      {compact ? (
        <div className="flex items-center gap-2 min-w-0">
          <IconButton
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            size="compact"
            className={playBtnClass}
            aria-label={playing ? 'Pause' : 'Play'}
            icon={playing ? Pause : Play}
            iconClassName={cn('h-3.5 w-3.5', !playing && 'fill-current')}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className={titleClass} title={displayTitle ?? undefined}>
              <Youtube className="h-3 w-3 text-red-500 shrink-0" />
              <span className="truncate">
                {failed ? 'Unavailable' : (displayTitle ?? 'Loading…')}
              </span>
            </p>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={timeClass}>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.1}
                value={duration > 0 ? currentTime : 0}
                disabled={!ready || duration <= 0}
                onChange={(e) => seek(Number(e.target.value))}
                className={scrubClass}
                aria-label="Track position"
              />
              <span className={timeClass}>{formatTime(duration)}</span>
            </div>
            {note && <p className={noteClass}>{note}</p>}
          </div>
          {onClose && (
            <IconButton
              type="button"
              onClick={onClose}
              size="compact"
              className={cn(
                'shrink-0 rounded-lg',
                isDark ? 'text-white/60 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted',
              )}
              aria-label="Close player"
              icon={X}
              iconClassName="h-3.5 w-3.5"
            />
          )}
        </div>
      ) : (
        <>
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className={titleClass} title={displayTitle ?? undefined}>
            <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="truncate">
              {failed ? 'Unavailable' : (displayTitle ?? 'Loading…')}
            </span>
          </p>
          {note && <p className={noteClass}>{note}</p>}
        </div>
        {onClose && (
          <IconButton
            type="button"
            onClick={onClose}
            className={cn(
              'shrink-0 rounded-lg',
              isDark ? 'text-white/60 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted',
            )}
            aria-label="Close player"
            icon={X}
            iconClassName="h-3.5 w-3.5"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          type="button"
          onClick={togglePlay}
          disabled={!ready}
          className={playBtnClass}
          aria-label={playing ? 'Pause' : 'Play'}
          icon={playing ? Pause : Play}
          iconClassName={playing ? undefined : 'fill-current'}
        />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={timeClass}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={duration > 0 ? currentTime : 0}
            disabled={!ready || duration <= 0}
            onChange={(e) => seek(Number(e.target.value))}
            className={scrubClass}
            aria-label="Track position"
          />
          <span className={timeClass}>{formatTime(duration)}</span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export function TrackPicker({
  tracks,
  activeIndex,
  onSelect,
  theme,
  compact = false,
}: {
  tracks: ReferenceTrack[];
  activeIndex: number;
  onSelect: (index: number) => void;
  theme: 'dark' | 'light';
  compact?: boolean;
}) {
  if (tracks.length <= 1) return null;
  const isDark = theme === 'dark';

  return (
    <div className={cn('flex gap-1', compact ? 'overflow-x-auto scrollbar-hide' : 'flex-wrap gap-1.5')}>
      {tracks.map((track, index) => {
        const label = track.note?.trim() || `Link ${index + 1}`;
        const active = index === activeIndex;
        return (
          <Button
            key={`${track.url}-${index}`}
            type="button"
            variant="ghost"
            onClick={() => onSelect(index)}
            className={cn(
              'h-auto shrink-0 truncate font-semibold',
              compact ? 'rounded-md px-2 py-0.5 text-[9px]' : 'max-w-full rounded-lg px-2.5 py-1 text-[10px]',
              active
                ? isDark
                  ? 'bg-rose-500/90 text-white'
                  : 'bg-primary text-primary-foreground'
                : isDark
                  ? 'bg-white/10 text-white/75 hover:bg-white/15'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
            title={label}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

function ReferenceTracksPopover({
  tracks,
  theme,
  className,
}: {
  tracks: ReferenceTrack[];
  theme: 'dark' | 'light';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDark = theme === 'dark';
  const activeTrack = tracks[activeIndex] ?? tracks[0];

  useEffect(() => {
    setOpen(false);
    setActiveIndex(0);
  }, [tracks]);

  if (!activeTrack) return null;

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex h-auto min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold',
            isDark
              ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
              : 'bg-muted text-foreground hover:bg-muted/80 border border-border/50',
            className,
          )}
          aria-label="Listen to reference tracks"
        >
          <Headphones className="h-3.5 w-3.5" />
          Listen{tracks.length > 1 ? ` (${tracks.length})` : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[400] w-[min(20rem,calc(100vw-2rem))] p-2 rounded-2xl space-y-2"
        side="top"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <TrackPicker
          tracks={tracks}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          theme={theme}
        />
        <YoutubePlayerPanel
          key={activeTrack.url}
          url={activeTrack.url}
          note={activeTrack.note}
          theme={theme}
          enabled={open}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Listen UI for one or more reference tracks (compact popover or inline panel). */
export function ReferenceTracksListen({
  tracks: tracksInput,
  theme = 'light',
  compact = true,
  className,
}: {
  tracks: ReferenceTrack[] | Pick<SetlistSong, 'referenceTracks'>;
  theme?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
}) {
  const tracks = useMemo(() => {
    if (Array.isArray(tracksInput)) return tracksInput.filter((t) => parseYoutubeVideoId(t.url));
    return getReferenceTracks(tracksInput);
  }, [tracksInput]);

  if (tracks.length === 0) return null;

  if (compact) {
    return <ReferenceTracksPopover tracks={tracks} theme={theme} className={className} />;
  }

  if (tracks.length === 1) {
    return (
      <YoutubePlayerPanel
        url={tracks[0].url}
        note={tracks[0].note}
        theme={theme}
        className={cn('w-full', className)}
      />
    );
  }

  return <ReferenceTracksPopover tracks={tracks} theme={theme} className={className} />;
}
