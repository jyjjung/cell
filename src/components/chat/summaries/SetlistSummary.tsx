"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Music, 
  ChevronRight,
  ListMusic,
  Play,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { format, parseISO, isValid } from 'date-fns';
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
    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl text-[11px] font-bold opacity-30">
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
        "flex flex-col gap-4 p-5 rounded-[1.8rem] border shadow-2xl transition-all duration-300 w-full min-w-[280px] sm:min-w-[320px]",
        isSender 
          ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-white" 
          : "bg-[#3B3B3D]/30 border-white/5 text-white backdrop-blur-2xl"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Music className="w-3.5 h-3.5 text-pink-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Worship Setlist</span>
            </div>
            <h3 className="text-[17px] font-black leading-tight text-white mb-2 truncate">{setlist.name}</h3>
            <p className="text-[11px] font-bold opacity-50 tracking-widest uppercase">{dateText}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-pink-500 fill-pink-500" />
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
               className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors pointer-events-auto"
             >
                <div className="flex items-center gap-3 min-w-0">
                   <span className="text-[10px] font-black opacity-30 w-4">{i + 1}</span>
                   <p className="text-[13px] font-bold truncate">{song.title}</p>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase tracking-widest text-[#007AFF]">{song.key}</div>
             </div>
           ))}
        </div>

        <div className="flex items-center justify-between mt-1 group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#007AFF] group-hover:text-white transition-colors">
            Open Chart Viewer
          </span>
          <ChevronRight className="w-4 h-4 text-[#007AFF] opacity-40 group-hover:opacity-100 group-hover:text-white transition-all" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
