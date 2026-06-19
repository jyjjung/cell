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
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import HiddenAchievements from '@/components/profile/hidden-achievements';
import { useGrantSecretAchievement } from '@/hooks/use-grant-secret-achievement';

interface UserProgressDisplay {
  userId: string;
  displayName: string;
  completedCount: number;
  completedPassageKeys: string[];
  progressPercentage: number;
  totalPassagesToDate: number;
  avatar?: AvatarData;
  isCurrentUser?: boolean;
  unlockedSecrets?: string[];
}

const rankConfig = [
  { icon: Trophy, color: 'text-primary', bg: 'bg-muted border-border', border: 'border-border' },
  { icon: Medal, color: 'text-primary', bg: 'bg-muted border-border', border: 'border-border' },
  { icon: Award, color: 'text-primary', bg: 'bg-muted border-border', border: 'border-border' },
];

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  useGrantSecretAchievement('leaderboard', !!currentUser);
  const { plan, loading: planLoading } = useBiblePlan();
  const { allProgress, loading: progressLoading, refresh: refreshProgress } = useCommunityProgress();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

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
        return { userId: c.userId, displayName: formatUserDisplayName(user), completedCount, completedPassageKeys: c.completedPassages || [], progressPercentage, totalPassagesToDate, avatar: c.userId === currentUser?.uid ? (currentUser?.avatar ?? user.avatar) : user.avatar, isCurrentUser: c.userId === currentUser?.uid, unlockedSecrets: user.unlockedSecrets } as UserProgressDisplay;
      })
      .filter((x): x is UserProgressDisplay => x !== null)
      .sort((a, b) => b.completedCount - a.completedCount);
  }, [allProgress, allUsers, totalPassagesToDate, progressLoading, usersLoading, currentUser?.uid]);

  if (!isMounted || planLoading || progressLoading || usersLoading) return null;

  return (
    <div className="page-container space-y-8 pb-32">
      <PageHeader 
        title={t.communityProgressTitle} 
      />



      {userProgressData.length === 0 ? (
        <EmptyState icon={Users} title={t.noProgressYet} description="No reading data yet." />
      ) : (
        <div className="space-y-3">
          {userProgressData.map((item, i) => {
            const rank = rankConfig[i];
            const RankIcon = rank?.icon;
            return (
              <Dialog key={item.userId}>
                <DialogTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                      item.isCurrentUser
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : "bg-card/50 border-border/40 backdrop-blur-sm hover:shadow-md hover:bg-card/80"
                    )}
                  >
                    {/* Rank */}
                    <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border", rank ? rank.bg : 'bg-muted border-border/20')}>
                      {RankIcon ? <RankIcon className={cn("h-5 w-5", rank.color)} /> : <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>}
                    </div>

                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-muted border border-border/30 shrink-0">
                      <PixelAvatar avatar={item.avatar} />
                    </div>

                    {/* Name + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-semibold text-sm truncate">{item.displayName}</p>
                        {item.isCurrentUser && <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>}
                      </div>
                      <Progress value={Math.min(item.progressPercentage, 100)} className="h-1.5" />
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{item.completedCount}</p>
                      <p className="text-[11px] text-muted-foreground">{Math.round(item.progressPercentage)}%</p>
                    </div>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="w-[92vw] sm:max-w-md max-h-[82vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border-border/50 bg-card/95 backdrop-blur-3xl shadow-2xl">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-xl">
                                <PixelAvatar avatar={item.avatar} />
                            </div>
                            {rank && (
                                <div className={cn("absolute -bottom-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center bg-background border-2 shadow-lg", rank.border)}>
                                    <RankIcon className={cn("w-5 h-5", rank.color)} />
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{item.displayName}</h2>
                            <p className="text-muted-foreground font-medium text-sm mt-1">
                                {item.isCurrentUser ? "Your Profile" : "Community Member"}
                            </p>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4 mt-4">
                            <div className="p-4 rounded-2xl bg-muted border border-border/50">
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Passages Read</p>
                                <p className="text-2xl font-black">{item.completedCount}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-1">Completion</p>
                                <p className="text-2xl font-black text-primary">{Math.round(item.progressPercentage)}%</p>
                            </div>
                        </div>

                        <div className="w-full text-left mt-6">
                          <HiddenAchievements
                            userId={item.userId}
                            completedPassageKeys={item.completedPassageKeys}
                            unlockedSecrets={item.unlockedSecrets}
                          />
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
