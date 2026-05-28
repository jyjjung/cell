"use client";

import React from 'react';
import { Music2, ChevronRight, User } from 'lucide-react';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SongSummaryProps {
  songId: string;
  isSender: boolean;
  onOpenViewer?: (songId?: string) => void;
}

export default function SongSummary({ songId, isSender, onOpenViewer }: SongSummaryProps) {
  const { songs, loading } = useWorshipSongs();
  const song = songs.find(s => s.id === songId);

  if (loading) {
    return (
      <div className={cn(
        "flex min-w-[200px] items-center justify-center rounded-2xl border border-border/50 bg-muted/30 p-4"
      )}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className={cn(
        "flex min-w-[200px] items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 p-4"
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-muted grayscale opacity-70">
          <Music2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Song not found</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenViewer?.(songId)}
      className={cn(
        "group relative flex min-w-[240px] max-w-[280px] cursor-pointer flex-col overflow-hidden rounded-2xl border p-4 shadow-sm transition-all active:scale-[0.98]",
        isSender 
          ? "border-primary/30 bg-primary/5" 
          : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 transition-transform group-hover:scale-105"
        )}>
          <Music2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="mb-1 truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
            {song.title}
          </h3>
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground" />
            <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground">
              {song.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>
      </div>

      <div className={cn(
        "mt-4 flex items-center justify-between border-t border-border/60 pt-3"
      )}>
        <div className="flex items-center gap-2">
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {new Set(song.chordSheets?.map(s => s.key) ?? []).size} Keys
            </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
    </div>
  );
}
