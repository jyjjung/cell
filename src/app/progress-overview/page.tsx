
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
import { Loader2, Users, Info, BarChart3 } from 'lucide-react';

interface UserProgressDisplay {
  userId: string;
  completedCount: number;
  progressPercentage: number;
  totalPassagesInPlan: number;
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

  const totalPassagesInPlan = useMemo(() => {
    return plan?.dailyReadings.reduce((acc, day) => acc + day.passages.length, 0) || 0;
  }, [plan]);

  const userProgressData = useMemo(() => {
    if (!allChecklists || totalPassagesInPlan === 0) {
      return [];
    }
    return allChecklists.map(checklist => {
      const completedCount = checklist.completedPassages.length;
      const progressPercentage = totalPassagesInPlan > 0 ? (completedCount / totalPassagesInPlan) * 100 : 0;
      return {
        userId: checklist.userId,
        completedCount,
        progressPercentage,
        totalPassagesInPlan,
      };
    }).sort((a, b) => b.progressPercentage - a.progressPercentage); // Sort by progress desc
  }, [allChecklists, totalPassagesInPlan]);

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
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Community Progress Overview</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-destructive" /><CardTitle className="text-2xl">No Plan Available</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">A Bible reading plan needs to be set by the admin first.</p></CardContent>
        </Card>
      </div>
    );
  }
  
  if (userProgressData.length === 0) {
     return (
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Community Progress Overview</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Users className="h-6 w-6 text-muted-foreground" /><CardTitle className="text-2xl">No Progress Yet</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">No users have started tracking their progress on the checklist, or no checklists were found.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Community Progress Overview</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User Reading Progress</CardTitle>
          <CardDescription>
            Overview of how many passages each user has completed in the current plan.
            Users are identified by their unique ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">User ID (UID)</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Completed / Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProgressData.map((progressItem) => (
                <TableRow key={progressItem.userId}>
                  <TableCell className="font-medium text-xs truncate">{progressItem.userId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={progressItem.progressPercentage} className="w-full h-3" />
                        <span className="text-xs text-muted-foreground w-12 text-right">{progressItem.progressPercentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {progressItem.completedCount} / {progressItem.totalPassagesInPlan}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <Card className="mt-4 bg-background/50 border-dashed">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Important Note on Data Access</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For this page to function correctly, Firestore security rules need to allow logged-in users to list documents from the <code>userBibleChecklists</code> collection.
            If you see no data or errors, please ensure your rules permit <code>list</code> access on <code>/userBibleChecklists</code> for authenticated users.
            Example rule: <code>match /userBibleChecklists/{docId} {'{ allow list: if request.auth != null; }'}</code> (applied at collection group level or specific path).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
