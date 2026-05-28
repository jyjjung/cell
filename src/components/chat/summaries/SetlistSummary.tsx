"use client";

import React, { useMemo } from 'react';
import { 
  Music, 
  ChevronRight,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface SetlistSummaryProps {
  setlistId: string;
  isSender: boolean;
  onOpenViewer?: (songId?: string) => void;
}

export default function SetlistSummary({ setlistId, isSender, onOpenViewer }: SetlistSummaryProps) {
  const { setlists } = useWorshipSetlists();
  const router = useRouter();
  
  const setlist = useMemo(() => 
    setlists.find(s => s.id === setlistId), 
    [setlists, setlistId]
  );

  if (!setlist) return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        Loading Setlist...
    </div>
  );

  const songs = setlist.songs || [];

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

  const firstSongId = songs[0]?.songId;

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
      <div className={cn(
        "group flex w-full max-w-full flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-all duration-200",
        isSender 
          ? "border-primary/30 bg-primary/5 text-foreground" 
          : "border-border/60 bg-card text-foreground"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-muted/40">
                    <Music className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Worship Setlist</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{setlist.name}</h3>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{dateText}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
              <Play className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* List of songs */}
        <div className="flex flex-col gap-2 pt-2">
           {songs.map((song, i) => (
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
                <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{song.key}</div>
             </div>
           ))}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
            Open Chart Viewer
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
