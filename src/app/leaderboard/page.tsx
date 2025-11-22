
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useAllUserChecklists } from '@/hooks/use-all-user-checklists';
import { useAllUsers } from '@/hooks/use-all-users';
import { startOfDay, parseISO, isValid, isBefore, isSameDay } from 'date-fns';
import { Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';

interface UserProgressDisplay {
  userId: string;
  userDisplayName: string | null;
  completedCount: number;
  progressPercentage: number;
  totalPassagesToDate: number;
}

export default function LeaderboardPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { allChecklists, loading: checklistsLoading } = useAllUserChecklists();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalPassagesUpToToday = useMemo(() => {
    if (!isMounted || !plan?.dailyReadings) return 0;
    const today = startOfDay(new Date());
    
    const relevantReadings = plan.dailyReadings.filter(reading => {
      try {
        const readingDate = parseISO(reading.date);
        return isValid(readingDate) && (isBefore(readingDate, today) || isSameDay(readingDate, today));
      } catch (e) {
        console.error("Error parsing reading date for progress calculation:", reading.date, e);
        return false;
      }
    });

    return relevantReadings.reduce((acc, day) => {
        if (!day || !Array.isArray(day.passages)) return acc;
        const validDayPassages = day.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '' && !p.displayText.startsWith("Error:"));
        return acc + validDayPassages.length;
    }, 0);
  }, [plan, isMounted]);

  const userProgressData = useMemo(() => {
    if (checklistsLoading || usersLoading || totalPassagesUpToToday === 0 || !allChecklists || !allUsers) {
      return [];
    }
  
    const visibleUsers = new Set(allUsers.filter(u => u.showInCommunityProgress ?? true).map(u => u.uid));
    const usersMap = new Map(allUsers.map(user => [user.uid, user]));
  
    return allChecklists
      .filter(checklist => visibleUsers.has(checklist.userId))
      .map(checklist => {
        const user = usersMap.get(checklist.userId);
        if (!user) return null;
  
        const completedCount = checklist.completedPassages.length;
        const progressPercentage = totalPassagesUpToToday > 0 ? parseFloat(((completedCount / totalPassagesUpToToday) * 100).toFixed(1)) : 0;
        
        return {
          userId: checklist.userId,
          userDisplayName: user.displayName || user.email?.split('@')[0] || 'User',
          completedCount,
          progressPercentage,
          totalPassagesToDate: totalPassagesUpToToday,
        };
      })
      .filter((item): item is UserProgressDisplay => item !== null)
      .sort((a, b) => b.progressPercentage - a.progressPercentage);
  }, [allChecklists, allUsers, totalPassagesUpToToday, checklistsLoading, usersLoading]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (!isMounted || planLoading || checklistsLoading || usersLoading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center space-x-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Community Progress</h1>
      </div>
      
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Card className="shadow-lg overflow-hidden">
            <CardHeader className="py-4">
                <CardTitle className="text-xl font-semibold tracking-tight">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {userProgressData.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <p>No community progress to show yet. Complete some readings to get started!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] sm:w-[150px] px-4">Person</TableHead>
                      <TableHead className="text-right px-4">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProgressData.map((progressItem, index) => (
                      <motion.tr key={progressItem.userId} variants={itemVariants} className="w-full">
                        <TableCell className="font-medium text-sm truncate max-w-[100px] sm:max-w-xs px-4 py-2">{progressItem.userDisplayName}</TableCell>
                        <TableCell className="text-right px-4 py-2">
                           <div className="flex items-baseline justify-end gap-x-2">
                            <span className="font-semibold text-foreground text-sm tabular-nums">{progressItem.completedCount} / {progressItem.totalPassagesToDate}</span>
                            <span className="text-muted-foreground text-base tabular-nums">({progressItem.progressPercentage}%)</span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
