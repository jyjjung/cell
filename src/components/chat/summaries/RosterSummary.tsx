"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  ChevronRight,
  User,
  Users,
  ShieldCheck,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllUsers } from '@/hooks/use-all-users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO, isValid } from 'date-fns';
import Link from 'next/link';

interface RosterSummaryProps {
  rosterId: string;
  isSender: boolean;
}

export default function RosterSummary({ rosterId, isSender }: RosterSummaryProps) {
  const { rosters } = useWorshipRosters();
  const { allUsers } = useAllUsers();
  
  const roster = useMemo(() => 
    rosters.find(r => r.id === rosterId), 
    [rosters, rosterId]
  );

  if (!roster) return (
    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl text-[11px] font-bold opacity-30">
        Loading Roster...
    </div>
  );

  const slots = roster.slots || [];
  const totalPositions = slots.reduce((acc, slot) => acc + (slot.members?.length || 0), 0);

  const formatDateText = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, 'EEEE, MMM do');
    } catch {
      return dateStr;
    }
  };

  const dateText = formatDateText(roster.date);

  return (
    <Link href={`/worship?tab=rosters&id=${rosterId}`} className="block transition-transform active:scale-95">
      <div className={cn(
        "flex flex-col gap-4 p-5 rounded-[1.8rem] border shadow-2xl transition-all duration-300 w-full max-w-full",
        isSender 
          ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-white" 
          : "bg-[#3B3B3D]/30 border-white/5 text-white backdrop-blur-2xl"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-lg bg-[#007AFF]/20 flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-[#007AFF]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Service Roster</span>
            </div>
            <h3 className="text-[17px] font-black leading-tight text-white mb-2 truncate">{roster.name}</h3>
            <p className="text-[11px] font-bold opacity-50 tracking-widest uppercase">{dateText}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center shrink-0">
             <Users className="w-4 h-4 text-primary/40" />
             <span className="text-[10px] font-black text-primary">{totalPositions}</span>
          </div>
        </div>

        {/* Roles */}
        <div className="flex flex-col gap-2 pt-2">
           {slots.filter(s => s.members.length > 0).map((slot, i) => {
             const m = slot.members[0];
             const user = m?.userId ? allUsers.find(u => u.uid === m.userId) : null;
             const name = m?.displayName || user?.firstName || 'TBD';

             return (
               <div key={i} className="flex items-center justify-between p-3 rounded-[1.2rem] bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-6 w-6 border border-white/10 shrink-0">
                      {user?.photoURL && <AvatarImage src={user.photoURL} alt={name} />}
                      <AvatarFallback className="text-[8px] uppercase font-black bg-white/5 text-white">
                        {name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold truncate text-white/90">{name}</p>
                      <p className="text-[9px] font-black opacity-40 uppercase tracking-widest truncate">{slot.role}</p>
                    </div>
                  </div>
                  {user && (
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />
                    </div>
                  )}
               </div>
             );
           })}
           {slots.filter(s => s.members.length > 0).length === 0 && (
             <div className="px-4 py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No filled positions</p>
             </div>
           )}
        </div>

        <div className="flex items-center justify-between mt-1 group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#007AFF] group-hover:text-white transition-colors">
            Tap to View Roster
          </span>
          <ChevronRight className="w-4 h-4 text-[#007AFF] opacity-40 group-hover:opacity-100 group-hover:text-white transition-all" strokeWidth={3} />
        </div>
      </div>
    </Link>
  );
}
