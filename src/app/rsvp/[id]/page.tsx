
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useInvitations } from '@/hooks/use-invitations';
import { useAllUsers } from '@/hooks/use-all-users';
import { format } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  XCircle, 
  Calendar as CalendarIcon,
  Users,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

export default function InvitationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { invitations, respondToInvitation, loading: invitesLoading } = useInvitations();
  const { allUsers, loading: usersLoading } = useAllUsers();

  const invitation = useMemo(() => invitations.find(i => i.id === id), [invitations, id]);
  const userResponse = useMemo(() => invitation?.responses?.[currentUser?.uid || ''], [invitation, currentUser]);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userResponse) {
      setSelectedDates(userResponse.selectedDates || []);
    }
  }, [userResponse]);

  const handleResponse = async (status: 'accept' | 'maybe' | 'decline') => {
    if (!currentUser || !invitation) return;
    setIsSubmitting(true);
    try {
      await respondToInvitation(invitation.id, {
        uid: currentUser.uid,
        status,
        selectedDates: status === 'decline' ? [] : selectedDates,
        updatedAt: null as any // handled by server
      });
    } catch (error) {
      console.error("Error responding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDate = (iso: string) => {
    setSelectedDates(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso]);
  };

  const respondersGrouped = useMemo(() => {
    if (!invitation || !allUsers) return { accept: [], maybe: [], decline: [] };
    
    const groups: { accept: any[], maybe: any[], decline: any[] } = { accept: [], maybe: [], decline: [] };
    
    Object.entries(invitation.responses || {}).forEach(([uid, response]) => {
      const user = allUsers.find(u => u.uid === uid);
      if (user) {
        groups[response.status].push({
          ...response,
          name: `${user.firstName} ${user.lastName}`,
          user
        });
      }
    });
    
    return groups;
  }, [invitation, allUsers]);

  if (invitesLoading || usersLoading) return null;
  if (!invitation) return <div className="p-20 text-center">Invitation not found</div>;

  return (
    <div className="relative pb-32 max-w-4xl mx-auto px-4 md:px-8 mt-12 text-white">
      {/* Back Button */}
      <Link href="/rsvp" className="inline-flex items-center gap-2 mb-6 group text-muted-foreground hover:text-blue-400 transition-colors">
        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-blue-500/10 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back to Invites</span>
      </Link>

      <div className="max-w-2xl mx-auto space-y-12">
        {/* Main Content Area */}
        <div className="space-y-12">
          {userResponse && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-2xl border flex items-center justify-between",
                userResponse.status === 'accept' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                userResponse.status === 'maybe' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                "bg-red-500/10 border-red-500/20 text-red-400"
              )}
            >
              <div className="flex items-center gap-3">
                {userResponse.status === 'accept' ? <CheckCircle2 className="w-5 h-5" /> :
                 userResponse.status === 'maybe' ? <HelpCircle className="w-5 h-5" /> :
                 <XCircle className="w-5 h-5" />}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">Your current status</p>
                  <p className="text-sm font-black uppercase tracking-widest leading-none">
                    {userResponse.status === 'accept' ? 'Going' : userResponse.status === 'maybe' ? 'Maybe' : 'Declined'}
                  </p>
                </div>
              </div>
              {userResponse.status === 'accept' && (
                <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/5 text-[9px] font-bold py-0.5 px-2">
                  {userResponse.selectedDates.length} selected
                </Badge>
              )}
            </motion.div>
          )}
          <header className="space-y-4">
            <h1 className="text-3xl font-black tracking-tight leading-tight text-foreground select-none">
              {invitation.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              {invitation.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500/60" />
                  {invitation.location}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500/60" />
                {Object.keys(invitation.responses || {}).length} People
              </div>
            </div>

            <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">
              {invitation.description}
            </p>
          </header>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-foreground/40">Choose Availability</h3>

            <div className="grid grid-cols-1 gap-3">
              {Object.entries(
                invitation.dateOptions.reduce((acc, iso) => {
                  const [d, t] = iso.split(' ');
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(iso);
                  return acc;
                }, {} as Record<string, string[]>)
              ).map(([date, options]) => (
                <div key={date} className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                  <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                      {format(parseDay(date), 'EEEE, MMMM d')}
                    </p>
                  </div>
                  <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((iso) => {
                      const hasTime = iso.includes(' ');
                      const [, time] = iso.split(' ');
                      return (
                        <div 
                          key={iso} 
                          onClick={() => toggleDate(iso)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all select-none border border-transparent",
                            selectedDates.includes(iso) ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <span className="text-xs font-bold text-foreground">
                            {hasTime ? time.replace('-', ' - ') : "Full Day"}
                          </span>
                          <Checkbox checked={selectedDates.includes(iso)} className="h-4 w-4 rounded-full border-white/20 data-[state=checked]:bg-blue-500" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
            <Button
              disabled={isSubmitting || selectedDates.length === 0}
              onClick={() => handleResponse('accept')}
              className={cn("h-12 flex-1 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest", 
                userResponse?.status === 'accept' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept
            </Button>

            <Button
              disabled={isSubmitting}
              onClick={() => handleResponse('maybe')}
              className={cn("h-12 flex-1 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest", 
                userResponse?.status === 'maybe' ? "bg-amber-500 hover:bg-amber-600" : "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500"
              )}
            >
              <HelpCircle className="w-4 h-4" />
              Maybe
            </Button>

            <Button
              disabled={isSubmitting}
              onClick={() => handleResponse('decline')}
              className={cn("h-12 flex-1 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest", 
                userResponse?.status === 'decline' ? "bg-red-500 hover:bg-red-600" : "bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500"
              )}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </Button>
          </div>
        </div>

          {/* Responder Section - Now below the voting */}
          <div className="pt-12 border-t border-white/5">
            <aside className="space-y-8">
              <div className="rounded-3xl bg-white/5 border border-white/5 p-6 space-y-6 backdrop-blur-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 text-center">Responders</h3>
                
                {/* Accepted Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Accepted</span>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-1.5 py-0 text-[9px]">{respondersGrouped.accept.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {respondersGrouped.accept.map((resp: any) => (
                      <div key={resp.uid} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <p className="text-xs font-bold text-foreground">{resp.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {resp.selectedDates.map((iso: string) => {
                            const [d, t] = iso.split(' ');
                            return (
                              <span key={iso} className="text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded-md">
                                {format(parseDay(d), 'MMM d')}{t ? ` ${t.replace('-', ' - ')}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maybe Section */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Maybe</span>
                    <Badge className="bg-amber-500/10 text-amber-500 border-none px-1.5 py-0 text-[9px]">{respondersGrouped.maybe.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {respondersGrouped.maybe.map((resp: any) => (
                      <div key={resp.uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                        <span className="text-xs font-bold">{resp.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Declined Section */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Declined</span>
                    <Badge className="bg-red-500/10 text-red-500 border-none px-1.5 py-0 text-[9px]">{respondersGrouped.decline.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {respondersGrouped.decline.map((resp: any) => (
                      <div key={resp.uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5 opacity-50">
                        <span className="text-xs font-bold">{resp.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {Object.keys(invitation.responses || {}).length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No responses yet</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
      </div>
    </div>
  );
}
