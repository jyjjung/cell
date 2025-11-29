
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import TodayReadingWidget from '@/components/dashboard-widgets/today-reading-widget';
import UpcomingEventsWidget from '@/components/dashboard-widgets/upcoming-events-widget';
import NotificationsWidget from '@/components/dashboard-widgets/notifications-widget';
import NextReadingWidget from '@/components/dashboard-widgets/next-reading-widget';
import { Bell, Calendar, BookOpen, SkipForward } from 'lucide-react';

export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/>Notifications</CardTitle>
                    <CardDescription>Recent updates and announcements.</CardDescription>
                </CardHeader>
                <CardContent>
                    <NotificationsWidget />
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary"/>Today's Reading</CardTitle>
                    <CardDescription>Your daily portion of the reading plan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TodayReadingWidget />
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><Calendar className="mr-2 h-5 w-5 text-primary"/>Upcoming Events</CardTitle>
                    <CardDescription>What's happening next.</CardDescription>
                </CardHeader>
                <CardContent>
                    <UpcomingEventsWidget />
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><SkipForward className="mr-2 h-5 w-5 text-primary"/>Next Reading</CardTitle>
                    <CardDescription>Keep up with the plan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <NextReadingWidget />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
