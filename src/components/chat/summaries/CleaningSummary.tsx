"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  ChevronRight,
  ListTodo,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface CleaningSummaryProps {
  date: string;
  isSender: boolean;
}

export default function CleaningSummary({ date, isSender }: CleaningSummaryProps) {
  const { roster } = useCleaningRoster();
  const { allUsers } = useAllUsers();
  const { cleaningDays } = useCleaningDays();
  const router = useRouter();
  
  const entry = useMemo(() => 
    roster.find(r => r.date === date), 
    [roster, date]
  );

  const day = useMemo(() => 
    cleaningDays.find(d => d.id === entry?.dayId), 
    [cleaningDays, entry]
  );

  if (!entry) return (
    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl text-[11px] font-bold opacity-30">
        Loading Roster...
    </div>
  );

  const assignedUsers = entry.assignedUserIds.map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean);

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
      onClick={() => router.push(`/cleaning-roster?date=${date}`)}
      className="block transition-transform active:scale-95 cursor-pointer"
    >
      <div className={cn(
        "flex flex-col gap-4 p-5 rounded-[1.8rem] border shadow-2xl transition-all duration-300 w-full min-w-[280px]",
        isSender 
          ? "bg-emerald-500/10 border-emerald-500/20 text-white" 
          : "bg-[#3B3B3D]/30 border-white/5 text-white backdrop-blur-2xl"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Facility Roster</span>
            </div>
            <h3 className="text-[17px] font-black leading-tight text-white mb-2 truncate">{day?.name || 'Cleaning Session'}</h3>
            <p className="text-[11px] font-bold opacity-50 tracking-widest uppercase">{formatDateText(date)}</p>
          </div>
        </div>

        <div className="flex -space-x-3 mt-2">
            {assignedUsers.map((user, i) => (
                <Avatar key={i} className="h-10 w-10 border-4 border-[#1C1C1E] ring-1 ring-white/10 shrink-0 overflow-hidden">
                    {user?.avatar ? (
                        <PixelAvatar avatar={user.avatar} className="w-full h-full" />
                    ) : (
                        <AvatarFallback className="text-[10px] uppercase font-black bg-white/5 text-white">
                        {user?.firstName?.[0] || '?'}
                        </AvatarFallback>
                    )}
                </Avatar>
            ))}
            {assignedUsers.length === 0 && (
                <div className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold opacity-30 italic">No assigned personnel</div>
            )}
        </div>

        <div className="flex items-center justify-between mt-1 group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500 group-hover:text-white transition-colors">
            Access System Status
          </span>
          <ChevronRight className="w-4 h-4 text-emerald-500 opacity-40 group-hover:opacity-100 group-hover:text-white transition-all" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
