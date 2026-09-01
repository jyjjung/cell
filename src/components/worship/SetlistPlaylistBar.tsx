"use client";

import {
    useSetlistPlaylistOptional, useSetlistPlaylistProgress
} from '@/contexts/setlist-playlist-context';
import type { PlaylistQueueItem } from '@/lib/setlist-playlist-queue';
import { playlistItemLabel } from '@/lib/setlist-playlist-queue';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronDown, Headphones, ListMusic, Pause, Play, RotateCw, SkipBack, SkipForward, X
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { memo } from 'react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Memoized so the twice-a-second position updates don't re-render the list. */
const TrackList = memo(function TrackList({
  queue,
  setlistName,
  currentIndex,
  playing,
  playIndex,
}: {
  queue: PlaylistQueueItem[];
  setlistName: string | null;
  currentIndex: number;
  playing: boolean;
  playIndex: (index: number) => void;
}) {
  return (
    <div className="max-h-[45vh] overflow-y-auto border-b border-border/50">
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-semibold truncate">{setlistName}</p>
        <p className="text-micro-label">
          {queue.length} tracks
        </p>
      </div>
      <div className="px-2 pb-2 space-y-0.5">
        {queue.map((item, i) => {
          const active = i === currentIndex;
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => playIndex(i)}
              className={cn(
                'h-auto w-full items-center gap-3 rounded-xl px-3 py-2 text-left justify-start',
                active ? 'bg-primary/15' : 'hover:bg-muted/60',
              )}
            >
              <span className={cn(
                'w-5 shrink-0 text-center text-micro-label font-semibold tabular-nums',
                active ? 'text-primary' : 'text-muted-foreground',
              )}>
                {active && playing ? '▶' : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold truncate', active && 'text-primary')}>
                  {playlistItemLabel(item)}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{item.songTitle}</p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
});

/** Only this row subscribes to position, so ticks repaint just the scrubber. */
function ProgressRow({
  ready,
  seek,
}: {
  ready: boolean;
  seek: (time: number) => void;
}) {
  const { currentTime, duration } = useSetlistPlaylistProgress();

  return (
    <div className="flex items-center gap-2 px-3 pb-3">
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-8">
        {formatTime(currentTime)}
      </span>
      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 100}
        step={0.1}
        value={duration > 0 ? currentTime : 0}
        disabled={!ready || duration <= 0}
        onChange={(e) => seek(Number(e.target.value))}
        className="flex-1 h-1 appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        aria-label="Track position"
      />
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-8 text-right">
        {formatTime(duration)}
      </span>
    </div>
  );
}

export function SetlistPlaylistBar() {
  const pathname = usePathname();
  const playlist = useSetlistPlaylistOptional();
  if (!playlist) return null;

  const isChatRoute = pathname.startsWith('/chat/');

  const {
    isActive,
    queue, setlistName, currentIndex, currentItem, playing, ready, failed, retry,
    expanded, setExpanded,
    togglePlay, playIndex, next, previous, seek, stopPlaylist,
  } = playlist;

  const displayTitle = currentItem ? playlistItemLabel(currentItem) : '';
  const subtitle = currentItem
    ? `${currentItem.songTitle}${currentItem.note ? '' : ` · ${currentItem.songKey === 'numbers' ? '#' : currentItem.songKey}`}`
    : '';

  return (
    <AnimatePresence>
      {isActive && expanded && (
        <motion.button
          key="setlist-playlist-dismiss"
          type="button"
          aria-label="Collapse playlist"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[249] cursor-default bg-black/20"
          onClick={() => setExpanded(false)}
        />
      )}
      {isActive && (
      <motion.div
        key="setlist-playlist-bar"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed inset-x-0 z-[250] px-3 pointer-events-none"
        style={{
          bottom: isChatRoute
            ? 'calc(5.25rem + env(safe-area-inset-bottom))'
            : 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl">
          {expanded && (
            <TrackList
              queue={queue}
              setlistName={setlistName}
              currentIndex={currentIndex}
              playing={playing}
              playIndex={playIndex}
            />
          )}

          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start text-left"
              onClick={() => setExpanded(!expanded)}
            >
              <p className="text-xs font-semibold truncate">{displayTitle || 'Reference track'}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {failed ? "Couldn't load YouTube — tap retry" : (subtitle || setlistName)}
              </p>
            </Button>
            <div className="flex items-center gap-0.5 shrink-0">
              <IconButton type="button" onClick={previous} className="rounded-lg hover:bg-muted" aria-label="Previous" icon={SkipBack} />
              {failed ? (
                <IconButton
                  type="button"
                  onClick={retry}
                  variant="default"
                  className="rounded-lg"
                  aria-label="Retry loading player"
                  icon={RotateCw}
                />
              ) : (
                <IconButton
                  type="button"
                  onClick={togglePlay}
                  disabled={!ready}
                  variant="default"
                  className="rounded-lg disabled:opacity-40"
                  aria-label={playing ? 'Pause' : 'Play'}
                  icon={playing ? Pause : Play}
                  iconClassName={playing ? undefined : 'fill-current'}
                />
              )}
              <IconButton type="button" onClick={next} className="rounded-lg hover:bg-muted" aria-label="Next" icon={SkipForward} />
              <IconButton
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="rounded-lg hover:bg-muted"
                aria-label={expanded ? 'Collapse playlist' : 'Expand playlist'}
                icon={expanded ? ChevronDown : ListMusic}
              />
              <IconButton type="button" onClick={stopPlaylist} className="rounded-lg hover:bg-muted" aria-label="Close" icon={X} />
            </div>
          </div>

          <ProgressRow ready={ready} seek={seek} />
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
