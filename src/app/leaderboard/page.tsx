"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useCommunityProgress } from '@/hooks/use-community-progress';
import { useAllUsers } from '@/hooks/use-all-users';
import { startOfDay } from 'date-fns';
import { Trophy, Medal, Award, Users, Search, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import type { AvatarData } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { countPlanPassagesDueThrough } from '@/lib/reading-utils';
import { NavPageHeader, EmptyState, PageShell } from '@/components/ui/page-layout';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { HomeGroupedSection, HomeGroupList } from '@/components/home/home-grouped-section';

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
  { icon: Trophy, color: 'text-primary' },
  { icon: Medal, color: 'text-primary' },
  { icon: Award, color: 'text-primary' },
];

export default function LeaderboardPage() {
  const { currentUser } = useAuth();
  const { plan, loading: planLoading } = useBiblePlan();
  const { allProgress, loading: progressLoading } = useCommunityProgress();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const loading = planLoading || progressLoading || usersLoading;

  const totalPassagesToDate = useMemo(() => {
    return countPlanPassagesDueThrough(plan?.dailyReadings, startOfDay(new Date()));
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
        const progressPercentage = totalPassagesToDate > 0
          ? parseFloat(((completedCount / totalPassagesToDate) * 100).toFixed(1))
          : 0;
        return {
          userId: c.userId,
          displayName: formatUserDisplayName(user),
          completedCount,
          progressPercentage,
          totalPassagesToDate,
          avatar: c.userId === currentUser?.uid ? (currentUser?.avatar ?? user.avatar) : user.avatar,
          isCurrentUser: c.userId === currentUser?.uid,
        } as UserProgressDisplay;
      })
      .filter((x): x is UserProgressDisplay => x !== null)
      .sort((a, b) => b.completedCount - a.completedCount);
  }, [allProgress, allUsers, totalPassagesToDate, progressLoading, usersLoading, currentUser?.uid, currentUser?.avatar]);

  const filteredProgress = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return userProgressData;
    return userProgressData.filter((item) => item.displayName.toLowerCase().includes(query));
  }, [userProgressData, searchTerm]);

  return (
    <PageShell>
      <NavPageHeader />

      {loading ? (
        <ListLoadingSkeleton rows={6} />
      ) : userProgressData.length === 0 ? (
        <EmptyState icon={Users} title={t.noProgressYet} description={t.noReadingData} />
      ) : (
        <div className="page-flow">
          {totalPassagesToDate > 0 ? (
            <p className="px-1 text-stat-label">
              {t.progressBasedOn.replace('{count}', String(totalPassagesToDate))}
            </p>
          ) : null}

          {userProgressData.length >= 4 ? (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder={t.searchMembers}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label={t.searchMembers}
              />
            </div>
          ) : null}

          {filteredProgress.length === 0 ? (
            <EmptyState icon={Users} title={t.noMembersFound} />
          ) : (
            <HomeGroupedSection
              id="leaderboard-members"
              title={t.memberCount.replace('{count}', String(userProgressData.length))}
            >
              <HomeGroupList>
                {filteredProgress.map((item) => {
                  const rankIndex = userProgressData.findIndex((entry) => entry.userId === item.userId);
                  const rank = rankConfig[rankIndex];
                  const RankIcon = rank?.icon;

                  return (
                    <Link
                      key={item.userId}
                      href={`/members/${item.userId}`}
                      className={cn(
                        'home-group-nav-row h-auto py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        item.isCurrentUser && 'bg-primary/5',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted',
                          rank && 'border-border',
                        )}
                        aria-hidden
                      >
                        {RankIcon ? (
                          <RankIcon className={cn('h-4 w-4', rank.color)} />
                        ) : (
                          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                            {rankIndex + 1}
                          </span>
                        )}
                      </div>

                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/30 bg-muted">
                        <PixelAvatar avatar={item.avatar} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{item.displayName}</p>
                          {item.isCurrentUser ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-micro-label text-primary">
                              {t.you}
                            </span>
                          ) : null}
                        </div>
                        <Progress value={Math.min(item.progressPercentage, 100)} className="h-1.5" />
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{item.completedCount}</p>
                        <p className="text-micro-label text-muted-foreground">
                          {Math.round(item.progressPercentage)}%
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/70" aria-hidden />
                    </Link>
                  );
                })}
              </HomeGroupList>
            </HomeGroupedSection>
          )}
        </div>
      )}
    </PageShell>
  );
}
