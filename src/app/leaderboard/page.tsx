"use client";

import { useState, useMemo, useEffect } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useCommunityProgress } from '@/hooks/use-community-progress';
import { useAllUsers } from '@/hooks/use-all-users';
import { startOfDay, parseISO, isValid, isBefore, isSameDay } from 'date-fns';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import type { AvatarData } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

interface UserProgressDisplay {
  userId: string;
  displayName: string;
  completedCount: number;
  progressPercentage: number;
  totalPassagesToDate: number;
  avatar?: AvatarData;
  isCurrentUser?: boolean;
}

const rankConfig = [
  { icon: Trophy, color: 'text-primary', bg: 'bg-muted border-border', border: 'border-border' },
  { icon: Medal, color: 'text-primary', bg: 'bg-muted border-border', border: 'border-border' },
  { icon: Award, color: 'text-primary', bg: 'bg-muted border-border', border: 'border-border' },
];

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  const { plan, loading: planLoading } = useBiblePlan();
  const { allProgress, loading: progressLoading } = useCommunityProgress();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const totalPassagesToDate = useMemo(() => {
    if (!plan?.dailyReadings) return 0;
    const today = startOfDay(new Date());
    return plan.dailyReadings
      .filter(r => { try { const d = parseISO(r.date); return isValid(d) && (isBefore(d, today) || isSameDay(d, today)); } catch { return false; } })
      .reduce((acc, day) => acc + (day.passages?.filter(p => p?.displayText && !p.displayText.startsWith('Error:'))?.length ?? 0), 0);
  }, [plan]);

  const userProgressData = useMemo((): UserProgressDisplay[] => {
    if (progressLoading || usersLoading || !allProgress || !allUsers) return [];
    const visibleUids = new Set(allUsers.filter(u => u.showInCommunityProgress ?? true).map(u => u.uid));
    const usersMap = new Map(allUsers.map(u => [u.uid, u]));
    return allProgress
      .filter(c => visibleUids.has(c.userId))
      .map(c => {
        const user = usersMap.get(c.userId);
        if (!user?.firstName) return null;
        const completedCount = c.completedCount ?? c.completedPassages?.length ?? 0;
        const progressPercentage = totalPassagesToDate > 0 ? parseFloat(((completedCount / totalPassagesToDate) * 100).toFixed(1)) : 0;
        return { userId: c.userId, displayName: formatUserDisplayName(user), completedCount, progressPercentage, totalPassagesToDate, avatar: c.userId === currentUser?.uid ? (currentUser?.avatar ?? user.avatar) : user.avatar, isCurrentUser: c.userId === currentUser?.uid } as UserProgressDisplay;
      })
      .filter((x): x is UserProgressDisplay => x !== null)
      .sort((a, b) => b.completedCount - a.completedCount);
  }, [allProgress, allUsers, totalPassagesToDate, progressLoading, usersLoading, currentUser?.uid, currentUser?.avatar]);

  if (!isMounted || planLoading || progressLoading || usersLoading) return null;

  return (
    <div className="page-container">
      <NavPageHeader />

      {userProgressData.length === 0 ? (
        <EmptyState icon={Users} title={t.noProgressYet} description={t.noReadingData} />
      ) : (
        <div className="stack-gap-sm">
          {userProgressData.map((item, i) => {
            const rank = rankConfig[i];
            const RankIcon = rank?.icon;
            return (
              <Dialog key={item.userId}>
                <DialogTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className={cn(
                      "ui-card flex items-center gap-3 p-3 transition-shadow hover:shadow-md cursor-pointer",
                      item.isCurrentUser && "ring-1 ring-primary/30"
                    )}
                  >
                    <div className={cn("w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border", rank ? rank.bg : 'bg-muted border-border/20')}>
                      {RankIcon ? <RankIcon className={cn("h-4 w-4", rank.color)} /> : <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>}
                    </div>

                    <div className="h-9 w-9 rounded-full bg-muted border border-border/30 shrink-0">
                      <PixelAvatar avatar={item.avatar} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{item.displayName}</p>
                        {item.isCurrentUser && <span className="text-micro-label text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{t.you}</span>}
                      </div>
                      <Progress value={Math.min(item.progressPercentage, 100)} className="h-1.5" />
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{item.completedCount}</p>
                      <p className="text-micro-label">{Math.round(item.progressPercentage)}%</p>
                    </div>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="w-[92vw] sm:max-w-md max-h-[82vh] overflow-y-auto rounded-xl p-5 sm:p-6">
                    <div className="flex flex-col items-center text-center stack-gap-sm">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-muted border-2 border-background">
                                <PixelAvatar avatar={item.avatar} />
                            </div>
                            {rank && (
                                <div className={cn("absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-background border shadow-sm", rank.border)}>
                                    <RankIcon className={cn("w-4 h-4", rank.color)} />
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <h2 className="text-section-title">{item.displayName}</h2>
                            <p className="text-micro-label mt-1">
                                {item.isCurrentUser ? t.yourProfile : t.communityMember}
                            </p>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-3 mt-2">
                            <div className="widget-surface p-3">
                                <p className="text-micro-label mb-1">{t.passagesRead}</p>
                                <p className="text-xl font-semibold">{item.completedCount}</p>
                            </div>
                            <div className="widget-surface p-3 bg-primary/5">
                                <p className="text-micro-label text-primary mb-1">{t.completion}</p>
                                <p className="text-xl font-semibold text-primary">{Math.round(item.progressPercentage)}%</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      )}
    </div>
  );
}
