"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import NotificationsWidget from '@/components/dashboard-widgets/notifications-widget';
import TodayReadingWidget from '@/components/dashboard-widgets/today-reading-widget';
import UpcomingEventsWidget from '@/components/dashboard-widgets/upcoming-events-widget';
import NextReadingWidget from '@/components/dashboard-widgets/next-reading-widget';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';

// Reusable WidgetCard component for a consistent look and feel
const WidgetCard = ({ title, description, footer, children }: { title: string, description?: string, footer?: React.ReactNode, children: React.ReactNode }) => (
  <Card className="h-full flex flex-col shadow-md">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      {description && <CardDescription className="text-xs">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="p-4 pt-0 flex-grow">
      {children}
    </CardContent>
    {footer && <CardFooter className="p-4 pt-2 border-t mt-auto">{footer}</CardFooter>}
  </Card>
);


export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
                    <CardTitle className="text-3xl font-bold">Welcome!</CardTitle>
                    <CardDescription className="text-md">This is a simple app to help you organize your cell group's activities and reading plans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-muted-foreground">Log in or sign up to get started.</p>
                    <div className="flex justify-center gap-4">
                        <Button size="lg" onClick={() => { setIsPageLoading(true); router.push('/login'); }}>Log In</Button>
                        <Button size="lg" variant="outline" onClick={() => { setIsPageLoading(true); router.push('/signup'); }}>Sign Up</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
            <WidgetCard title="Notifications" description="Recent updates and announcements.">
                <NotificationsWidget />
            </WidgetCard>
            <WidgetCard title="Upcoming Events" description="What's happening next.">
                <UpcomingEventsWidget />
            </WidgetCard>
        </div>
        <div className="flex flex-col gap-6">
             <WidgetCard title="Today's Reading">
                <TodayReadingWidget />
            </WidgetCard>
            <WidgetCard title="Next Reading" description="Keep up with the plan.">
                <NextReadingWidget />
            </WidgetCard>
        </div>
    </div>
  );
}
