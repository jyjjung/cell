"use client";

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Headphones, ListMusic, Pause, Play, SkipBack, SkipForward, X,
} from 'lucide-react';
import { useSetlistPlaylistOptional } from '@/contexts/setlist-playlist-context';
import { playlistItemLabel } from '@/lib/setlist-playlist-queue';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SetlistPlaylistBar() {
  const pathname = usePathname();
  const playlist = useSetlistPlaylistOptional();
  if (!playlist) return null;

  const isChatRoute = pathname.startsWith('/chat/');

  const {
    isActive,
    queue, setlistName, currentIndex, currentItem, playing, ready,
    currentTime, duration, expanded, setExpanded,
    togglePlay, playIndex, next, previous, seek, stopPlaylist,
  } = playlist;

  const displayTitle = currentItem ? playlistItemLabel(currentItem) : '';
  const subtitle = currentItem
    ? `${currentItem.songTitle}${currentItem.note ? '' : ` · ${currentItem.songKey === 'numbers' ? '#' : currentItem.songKey}`}`
    : '';

  return (
    <AnimatePresence>
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
            <div className="max-h-[45vh] overflow-y-auto border-b border-border/50">
              <div className="px-4 pt-3 pb-2">
                <p className="text-sm font-black truncate">{setlistName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {queue.length} tracks
                </p>
              </div>
              <div className="px-2 pb-2 space-y-0.5">
                {queue.map((item, i) => {
                  const active = i === currentIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => playIndex(i)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                        active ? 'bg-primary/15' : 'hover:bg-muted/60',
                      )}
                    >
                      <span className={cn(
                        'w-5 shrink-0 text-center text-[10px] font-black tabular-nums',
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => setExpanded(!expanded)}
            >
              <p className="text-xs font-bold truncate">{displayTitle || 'Reference track'}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {subtitle || setlistName}
              </p>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={previous} className="p-2 rounded-lg hover:bg-muted" aria-label="Previous">
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                disabled={!ready}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              </button>
              <button type="button" onClick={next} className="p-2 rounded-lg hover:bg-muted" aria-label="Next">
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label={expanded ? 'Collapse playlist' : 'Expand playlist'}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ListMusic className="h-4 w-4" />}
              </button>
              <button type="button" onClick={stopPlaylist} className="p-2 rounded-lg hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

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
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
