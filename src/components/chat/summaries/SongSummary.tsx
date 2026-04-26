"use client";

import React from 'react';
import { motion } from 'framer-motion';
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
        "rounded-2xl p-4 flex items-center justify-center min-w-[200px] border border-white/5",
        isSender ? "bg-black/20" : "bg-black/30"
      )}>
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className={cn(
        "rounded-2xl p-4 flex items-center gap-3 min-w-[200px] border border-white/5",
        isSender ? "bg-black/20" : "bg-black/30"
      )}>
        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center grayscale opacity-50">
          <Music2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-white/40">Song not found</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpenViewer?.(songId)}
      className={cn(
        "group relative flex flex-col p-4 rounded-3xl border transition-all max-w-[280px] min-w-[240px] overflow-hidden cursor-pointer active:scale-[0.98]",
        isSender 
          ? "bg-primary shadow-lg shadow-primary/20 border-primary" 
          : "bg-[#1C1C1E]/95 backdrop-blur-2xl border-white/10 shadow-xl"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110",
          isSender ? "bg-white/20 border-white/30" : "bg-primary/10 border-primary/20"
        )}>
          <Music2 className={cn("w-6 h-6", isSender ? "text-white" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-sm font-black truncate leading-tight mb-1 uppercase tracking-tight",
            isSender ? "text-white" : "text-white"
          )}>
            {song.title}
          </h3>
          <div className="flex items-center gap-1.5">
            <User className={cn("w-3 h-3", isSender ? "text-white/60" : "text-primary/60")} />
            <p className={cn(
              "text-[10px] font-bold truncate tracking-wide",
              isSender ? "text-white/70" : "text-muted-foreground"
            )}>
              {song.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>
      </div>

      <div className={cn(
        "mt-4 pt-3 border-t flex items-center justify-between",
        isSender ? "border-white/10" : "border-white/5"
      )}>
        <div className="flex items-center gap-2">
            <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                isSender ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
            )}>
                {new Set(song.chordSheets?.map(s => s.key) ?? []).size} Keys
            </span>
        </div>
        <ChevronRight className={cn(
            "w-4 h-4 transition-transform group-hover:translate-x-1",
            isSender ? "text-white/40" : "text-primary/40"
        )} />
      </div>
    </motion.div>
  );
}
