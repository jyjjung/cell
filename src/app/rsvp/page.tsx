"use client";

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useInvitations } from '@/hooks/use-invitations';
import { MailOpen, ChevronRight, Users, Calendar, MapPin, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';

export default function RSVPPage() {
  const { invitations, loading } = useInvitations();
  const { currentUser } = useAuth();

  const userInvitations = useMemo(() => {
    if (!invitations || !currentUser) return [];
    
    return invitations.filter(invite => {
      // Targeted roles check
      if (!invite.allowedRoleIds || invite.allowedRoleIds.length === 0) return true; // Everyone
      
      const userRoleIds = currentUser.roleIds || [];
      return invite.allowedRoleIds.some((roleId: string) => userRoleIds.includes(roleId));
    });
  }, [invitations, currentUser]);

  if (loading) return null;

  return (
    <div className="relative space-y-12 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12 text-white">
      <PageHeader
        title="Invites"
        description="Scheduling for special events."
        icon={Mail}
        accentColor="text-blue-400"
        iconBgColor="bg-blue-400/10"
      />

      <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
        <AnimatePresence mode="popLayout">
          {userInvitations.length > 0 ? (
            userInvitations.map((invite, i) => {
              const userResponse = currentUser ? invite.responses?.[currentUser.uid] : null;
              
              return (
                <motion.div
                  key={invite.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/rsvp/${invite.id}`} className="block group h-full">
                    <Card className={cn(
                      "relative h-full overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border-white/5 group-hover:border-white/10 group-hover:bg-white/[0.08] transition-all p-5 flex flex-col justify-between shadow-2xl",
                      userResponse?.status === 'accept' && "ring-1 ring-emerald-500/20 bg-emerald-500/[0.02]",
                      userResponse?.status === 'maybe' && "ring-1 ring-amber-500/20 bg-amber-500/[0.02]",
                      userResponse?.status === 'decline' && "ring-1 ring-red-500/20 bg-red-500/[0.02]"
                    )}>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h2 className="text-xl font-black tracking-tight text-foreground group-hover:text-blue-400 transition-colors leading-tight">
                              {invite.title}
                            </h2>
                            {userResponse && (
                              <div className={cn(
                                "flex flex-col gap-2 mt-1"
                              )}>
                                <div className={cn(
                                  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                                  userResponse.status === 'accept' ? "text-emerald-400" : 
                                  userResponse.status === 'maybe' ? "text-amber-400" : "text-red-400"
                                )}>
                                  {userResponse.status === 'accept' && <CheckCircle2 className="w-3 h-3" />}
                                  {userResponse.status === 'maybe' && <HelpCircle className="w-3 h-3" />}
                                  {userResponse.status === 'decline' && <XCircle className="w-3 h-3" />}
                                  {userResponse.status === 'accept' ? 'Going' : userResponse.status === 'maybe' ? 'Maybe' : 'Declined'}
                                </div>
                                
                                {userResponse.status === 'accept' && userResponse.selectedDates.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {userResponse.selectedDates.slice(0, 4).map(iso => {
                                      const [d] = iso.split(' ');
                                      return (
                                        <span key={iso} className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/50 lowercase">
                                          {format(parseDay(d), 'MMM d')}
                                        </span>
                                      )
                                    })}
                                    {userResponse.selectedDates.length > 4 && (
                                      <span className="text-[8px] font-bold text-white/30 self-center">+{userResponse.selectedDates.length - 4} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/5 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all shrink-0">
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-70">
                          {invite.description}
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                             <Calendar className="w-3 h-3" /> {invite.dateOptions.length} Options
                          </div>
                          {invite.location && (
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                              <MapPin className="w-3 h-3" /> {invite.location}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                         <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-400/60" />
                            <span className="text-[10px] font-bold text-muted-foreground/60">
                              {Object.keys(invite.responses || {}).length} Responded
                            </span>
                         </div>
                         
                         <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-[9px] font-bold py-0.5 px-2">
                           {userResponse ? 'Change' : 'Details'}
                         </Badge>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full">
              <EmptyState 
                icon={MailOpen} 
                title="Quiet for now" 
                description="No active invitations were found for your roles. We'll notify you when something new pops up!"
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
