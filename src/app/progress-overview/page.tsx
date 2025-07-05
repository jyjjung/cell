
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useAllUserChecklists } from '@/hooks/use-all-user-checklists';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, Info } from 'lucide-react';
import { startOfDay, parseISO, isBefore, isSameDay, isValid as isDateValid } from 'date-fns';

interface UserProgressDisplay {
  userId: string;
  userDisplayName: string | null;
  completedCount: number;
  progressPercentage: number;
  totalPassagesToDate: number;
}

export default function ProgressOverviewPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);

  const { plan, loading: planLoading } = useBiblePlan();
  const { allChecklists, loading: checklistsLoading } = useAllUserChecklists();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);

  const totalPassagesUpToToday = useMemo(() => {
    if (!isMounted || !plan?.dailyReadings) return 0;
    const today = startOfDay(new Date());
    
    const relevantReadings = plan.dailyReadings.filter(reading => {
      try {
        const readingDate = parseISO(reading.date);
        return isDateValid(readingDate) && (isBefore(readingDate, today) || isSameDay(readingDate, today));
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
    if (!allChecklists || totalPassagesUpToToday === 0) {
      return [];
    }
    return allChecklists.map(checklist => {
      const completedCount = checklist.completedPassages.length;
      const progressPercentage = totalPassagesUpToToday > 0 ? parseFloat(((completedCount / totalPassagesUpToToday) * 100).toFixed(1)) : 0;
      return {
        userId: checklist.userId,
        userDisplayName: checklist.userDisplayName || checklist.userId.substring(0, 8),
        completedCount,
        progressPercentage,
        totalPassagesToDate: totalPassagesUpToToday,
      };
    }).sort((a, b) => b.progressPercentage - a.progressPercentage);
  }, [allChecklists, totalPassagesUpToToday]);

  if (!isMounted || loadingAuth || (!currentUser && isMounted)) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  if (planLoading || checklistsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading progress overview...</p>
      </div>
    );
  }

  if (!plan || plan.dailyReadings.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Community Progress Overview</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-destructive" /><CardTitle className="text-xl">No Plan Available</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">A Bible reading plan needs to be set by the admin first.</p></CardContent>
        </Card>
      </div>
    );
  }
  
  if (totalPassagesUpToToday === 0 && isMounted) {
     return (
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Community Progress Overview</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-muted-foreground" /><CardTitle className="text-xl">No Readings Scheduled Yet</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">There are no Bible readings scheduled up to today in the current plan, or the plan has not started.</p></CardContent>
        </Card>
      </div>
    );
  }


  if (userProgressData.length === 0 && isMounted) {
     return (
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Community Progress Overview</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Users className="h-6 w-6 text-muted-foreground" /><CardTitle className="text-xl">No Progress Yet</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">No users have started tracking their progress, or no checklists were found for readings scheduled to date.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <Users className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Community Progress Overview</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Detailed Progress</CardTitle>
          <CardDescription>
            Overview of passages each user has completed out of those scheduled up to today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">User</TableHead>
                <TableHead>Progress (% of readings due)</TableHead>
                <TableHead className="text-right">Completed / Expected by Today</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProgressData.map((progressItem) => (
                <TableRow key={progressItem.userId}>
                  <TableCell className="font-medium text-xs truncate max-w-[200px] sm:max-w-xs">
                    {progressItem.userDisplayName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={progressItem.progressPercentage} className="w-full h-3" />
                        <span className="text-xs text-muted-foreground w-12 text-right">{progressItem.progressPercentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {progressItem.completedCount} / {progressItem.totalPassagesToDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
