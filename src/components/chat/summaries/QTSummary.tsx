"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  ChevronRight,
  BookOpen,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface QTSummaryProps {
  date: string;
  isSender: boolean;
}

export default function QTSummary({ date, isSender }: QTSummaryProps) {
  const { roster } = useQTRoster();
  const { allUsers } = useAllUsers();
  const router = useRouter();
  
  const entry = useMemo(() => 
    roster.find(r => r.date === date), 
    [roster, date]
  );

  if (!entry) return (
    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl text-[11px] font-bold opacity-30">
        Loading QT Entry...
    </div>
  );

  const user = entry.userId ? allUsers.find(u => u.uid === entry.userId) : null;
  const name = entry.personName || user?.firstName || 'TBD';

  const formatDateText = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'EEEE, MMM do');
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      onClick={() => router.push(`/qt?date=${date}`)}
      className="block transition-transform active:scale-95 cursor-pointer"
    >
      <div className={cn(
        "flex flex-col gap-4 p-5 rounded-[1.8rem] border shadow-2xl transition-all duration-300 w-full max-w-full",
        isSender 
          ? "bg-primary/10 border-primary/20 text-white" 
          : "bg-[#3B3B3D]/30 border-white/5 text-white backdrop-blur-2xl"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">QT Roster</span>
            </div>
            <h3 className="text-[17px] font-black leading-tight text-white mb-2 truncate">{entry.passage}</h3>
            <p className="text-[11px] font-bold opacity-50 tracking-widest uppercase">{formatDateText(date)}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center shrink-0">
             <Calendar className="w-4 h-4 text-primary/40" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-[1.2rem] bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
            <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                {user?.avatar ? (
                  <PixelAvatar avatar={user.avatar} className="w-full h-full" />
                ) : (
                  <AvatarFallback className="text-[10px] uppercase font-black bg-white/5 text-white">
                    {name[0]}
                  </AvatarFallback>
                )}
            </Avatar>
            <div className="min-w-0">
                <p className="text-[14px] font-bold truncate text-white/90">{name}</p>
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest truncate">Assigned Reader</p>
            </div>
        </div>

        <div className="flex items-center justify-between mt-1 group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-[11px] font-black uppercase tracking-widest text-primary group-hover:text-white transition-colors">
            View Full Roster
          </span>
          <ChevronRight className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100 group-hover:text-white transition-all" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
