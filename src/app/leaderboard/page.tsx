"use client";

import { useState, useMemo, useEffect } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useAllUserChecklists } from '@/hooks/use-all-user-checklists';
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
import { PageHeader, EmptyState } from '@/components/ui/page-layout';

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
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/30' },
  { icon: Award, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
];

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  const { plan, loading: planLoading } = useBiblePlan();
  const { allChecklists, loading: checklistsLoading } = useAllUserChecklists();
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
    if (checklistsLoading || usersLoading || !allChecklists || !allUsers) return [];
    const visibleUids = new Set(allUsers.filter(u => u.showInCommunityProgress ?? true).map(u => u.uid));
    const usersMap = new Map(allUsers.map(u => [u.uid, u]));
    return allChecklists
      .filter(c => visibleUids.has(c.userId))
      .map(c => {
        const user = usersMap.get(c.userId);
        if (!user?.firstName) return null;
        const completedCount = c.completedPassages.length;
        const progressPercentage = totalPassagesToDate > 0 ? parseFloat(((completedCount / totalPassagesToDate) * 100).toFixed(1)) : 0;
        return { userId: c.userId, displayName: `${user.firstName} ${user.lastName}`, completedCount, progressPercentage, totalPassagesToDate, avatar: user.avatar, isCurrentUser: c.userId === currentUser?.uid } as UserProgressDisplay;
      })
      .filter((x): x is UserProgressDisplay => x !== null)
      .sort((a, b) => b.completedCount - a.completedCount);
  }, [allChecklists, allUsers, totalPassagesToDate, checklistsLoading, usersLoading, currentUser?.uid]);

  if (!isMounted || planLoading || checklistsLoading || usersLoading) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24">
      <PageHeader title={t.communityProgressTitle} subtitle="Reading Leaderboard" accentColor="text-yellow-500" />

      {totalPassagesToDate > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground">
          {t.progressBasedOn.replace('{count}', totalPassagesToDate.toString())}
        </motion.p>
      )}

      {userProgressData.length === 0 ? (
        <EmptyState icon={Users} title={t.noProgressYet} description="No reading data yet." />
      ) : (
        <div className="space-y-3">
          {userProgressData.map((item, i) => {
            const rank = rankConfig[i];
            const RankIcon = rank?.icon;
            return (
              <motion.div
                key={item.userId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                  item.isCurrentUser
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-card/50 border-border/40 backdrop-blur-sm hover:shadow-sm"
                )}
              >
                {/* Rank */}
                <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border", rank ? rank.bg : 'bg-muted/30 border-border/20')}>
                  {RankIcon ? <RankIcon className={cn("h-5 w-5", rank.color)} /> : <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>}
                </div>

                {/* Avatar */}
                <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted border border-border/30 shrink-0">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
