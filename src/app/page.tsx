
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, ArrowRight } from 'lucide-react';
import StatCard from '@/components/homepage/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useEvents } from '@/hooks/use-events';
import { findNextUnreadReading } from '@/lib/reading-utils';
import { isAfter, parseISO, startOfToday } from 'date-fns';
import { BookText, CalendarDays } from 'lucide-react';

export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const { plan: biblePlan, loading: planLoading } = useBiblePlan();
  const { completedPassages, loadingChecklist } = useUserBibleChecklist();
  const { events, loading: eventsLoading } = useEvents();


  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const nextReading = findNextUnreadReading(biblePlan?.dailyReadings || [], completedPassages);
  
  const upcomingEventsCount = events.filter(event => {
    try {
      return isAfter(parseISO(event.date), startOfToday());
    } catch {
      return false; // Invalid date format
    }
  }).length;

  const handleLinkClick = (path: string) => {
    setIsPageLoading(true);
    router.push(path);
  };
  

  if (!isMounted || loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!currentUser) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-15rem)]">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Welcome to em.</CardTitle>
                    <CardDescription className="text-md">A simple app for community and faith.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-muted-foreground">Log in or sign up to get started.</p>
                    <div className="flex justify-center gap-4">
                        <Button size="lg" onClick={() => handleLinkClick('/login')}>Log In</Button>
                        <Button size="lg" variant="outline" onClick={() => handleLinkClick('/signup')}>Sign Up</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="lg:col-span-2 xl:col-span-3">
             <Card className="h-full flex flex-col shadow-md">
                <CardHeader>
                    <CardTitle>Welcome back, {currentUser.displayName || 'user'}!</CardTitle>
                    <CardDescription>Here's a quick overview of what's happening.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p>More dashboard content coming soon!</p>
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => handleLinkClick('/bible-checklist')}>
                        View My Reading Plan <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
        <div className="space-y-6">
            <StatCard 
                title="Next Reading"
                value={nextReading?.passages[0]?.displayText ?? 'Completed!'}
                isLoading={planLoading || loadingChecklist}
                buttonText="Go to plan"
                buttonLink="/bible-checklist"
                onLinkClick={() => handleLinkClick('/bible-checklist')}
                IconComponent={BookText}
                buttonDisabled={!nextReading}
            />
            <StatCard 
                title="Upcoming Events"
                value={upcomingEventsCount > 0 ? `${upcomingEventsCount}` : 'None'}
                isLoading={eventsLoading}
                buttonText="View calendar"
                buttonLink="/events"
                onLinkClick={() => handleLinkClick('/events')}
                IconComponent={CalendarDays}
                buttonDisabled={upcomingEventsCount === 0}
            />
        </div>
    </div>
  );
}
