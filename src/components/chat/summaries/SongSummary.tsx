"use client";

import React from 'react';
import { Music2, ChevronRight, User } from 'lucide-react';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import type { WorshipSong } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SongSummaryProps {
  songId: string;
  isSender: boolean;
  onOpenViewer?: (songId?: string) => void;
}

export default function SongSummary({ songId, isSender, onOpenViewer }: SongSummaryProps) {
  const { data: song, loading } = useFirestoreDoc<WorshipSong>('worshipSongs', songId);

  if (loading) {
    return (
      <div className={cn(
        "flex w-full min-w-0 items-center justify-center rounded-2xl border border-border/50 bg-muted/30 p-4"
      )}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 p-4"
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
        "group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-200 active:scale-95",
        isSender
          ? "border-primary/30 bg-primary/5"
          : "border-border/60 bg-card"
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/40">
        <Music2 className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-foreground">{song.title}</h4>
        {song.artist && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{song.artist}</span>
          </div>
        )}
        <p className="mt-1 text-micro-label group-hover:text-foreground">
          {song.chordSheets.length} chart{song.chordSheets.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </div>
  );
}
