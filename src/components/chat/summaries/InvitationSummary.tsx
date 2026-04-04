"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInvitations } from '@/hooks/use-invitations';
import { useAllUsers } from '@/hooks/use-all-users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

interface InvitationSummaryProps {
  invitationId: string;
  isSender: boolean;
}

export default function InvitationSummary({ invitationId, isSender }: InvitationSummaryProps) {
  const { invitations } = useInvitations();
  const { allUsers } = useAllUsers();
  
  const invitation = useMemo(() => 
    invitations.find(i => i.id === invitationId), 
    [invitations, invitationId]
  );

  if (!invitation) return (
    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl text-[11px] font-bold opacity-30">
        Loading Invitation Summary...
    </div>
  );

  const responses = invitation.responses || {};
  const respondingUids = Object.keys(responses);
  
  const counts = {
    accept: respondingUids.filter(uid => responses[uid].status === 'accept').length,
    maybe: respondingUids.filter(uid => responses[uid].status === 'maybe').length,
    decline: respondingUids.filter(uid => responses[uid].status === 'decline').length,
  };

  const acceptedUsers = respondingUids
    .filter(uid => responses[uid].status === 'accept')
    .map(uid => allUsers.find(u => u.uid === uid))
    .filter(Boolean);

  const maybeUsers = respondingUids
    .filter(uid => responses[uid].status === 'maybe')
    .map(uid => allUsers.find(u => u.uid === uid))
    .filter(Boolean);

  const declinedUsers = respondingUids
    .filter(uid => responses[uid].status === 'decline')
    .map(uid => allUsers.find(u => u.uid === uid))
    .filter(Boolean);

  return (
    <Link href={`/rsvp/${invitationId}`} className="block transition-transform active:scale-95">
      <div className={cn(
        "flex flex-col gap-4 p-5 rounded-[1.8rem] border shadow-2xl transition-all duration-300 w-full max-w-full",
        isSender 
          ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-white" 
          : "bg-[#3B3B3D]/30 border-white/5 text-white backdrop-blur-2xl"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Invitation</span>
            </div>
            <h3 className="text-[17px] font-black leading-tight text-white mb-2">{invitation.title}</h3>
            
            <div className="flex flex-col gap-1.5 opacity-70">
              {invitation.dateOptions.map((date, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[12px] font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{date}</span>
                </div>
              ))}
              {invitation.location && (
                <div className="flex items-center gap-2 text-[12px] font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{invitation.location}</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center shrink-0">
             <Calendar className="w-6 h-6 text-primary/40" />
          </div>
        </div>

        {/* Responses Summary */}
        <div className="flex flex-col gap-3 pt-4 border-t border-white/5 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Who's Coming</span>
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-bold text-emerald-500/80">{counts.accept}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-[11px] font-bold text-amber-500/80">{counts.maybe}</span>
                </div>
            </div>
          </div>

          <div className="flex items-center -space-x-3 overflow-hidden h-8">
            <TooltipProvider delayDuration={0}>
              {acceptedUsers.slice(0, 8).map((user, i) => (
                <Tooltip key={user?.uid || i}>
                  <TooltipTrigger asChild>
                    <div className="relative group">
                       <Avatar className="h-8 w-8 border-2 border-[#1C1C1E] shadow-xl group-hover:scale-110 transition-transform">
                          {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.firstName} />}
                          <AvatarFallback className={cn(
                            "text-[10px] uppercase font-black",
                            isSender ? "bg-[#007AFF]/20 text-white" : "bg-white/5 text-white"
                          )}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-1 -right-1 z-10">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-[#1C1C1E]" />
                        </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl border-white/5 bg-card/90 backdrop-blur-2xl p-2 border">
                    <p className="text-[10px] font-black uppercase">{user?.firstName} {user?.lastName}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {maybeUsers.slice(0, 4).map((user, i) => (
                <Tooltip key={user?.uid || i}>
                  <TooltipTrigger asChild>
                    <div className="relative group opacity-60">
                       <Avatar className="h-8 w-8 border-2 border-[#1C1C1E] shadow-xl group-hover:scale-110 transition-transform">
                          {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.firstName} />}
                          <AvatarFallback className="text-[10px] uppercase font-black bg-white/5 text-white">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-1 -right-1 z-10">
                            <HelpCircle className="w-3 h-3 text-amber-500 fill-[#1C1C1E]" />
                        </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl border-white/5 bg-card/90 backdrop-blur-2xl p-2 border">
                    <p className="text-[10px] font-black uppercase">{user?.firstName} {user?.lastName} (Maybe)</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {respondingUids.length > 12 && (
                <div className="h-8 w-8 rounded-full bg-white/5 border-2 border-[#1C1C1E] flex items-center justify-center text-[10px] font-black text-white/40">
                  +{respondingUids.length - 12}
                </div>
              )}
              {respondingUids.length === 0 && (
                <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest pl-1">No responses yet</span>
              )}
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1 group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#007AFF] group-hover:text-white transition-colors">
            Tap to RSVP
          </span>
          <ChevronRight className="w-4 h-4 text-[#007AFF] opacity-40 group-hover:opacity-100 group-hover:text-white transition-all" strokeWidth={3} />
        </div>
      </div>
    </Link>
  );
}
