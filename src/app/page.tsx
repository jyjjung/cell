"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { DashboardPreferences } from '@/types';
import { cn } from '@/lib/utils';
import NotificationsWidget from '@/components/dashboard-widgets/notifications-widget';
import TodayReadingWidget from '@/components/dashboard-widgets/today-reading-widget';
import UpcomingEventsWidget from '@/components/dashboard-widgets/upcoming-events-widget';
import NextReadingWidget from '@/components/dashboard-widgets/next-reading-widget';
import VerseOfTheDayWidget from '@/components/dashboard-widgets/verse-of-the-day-widget';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_COMPONENTS: { [key: string]: React.FC } = {
  notifications: NotificationsWidget,
  todayReading: TodayReadingWidget,
  upcomingEvents: UpcomingEventsWidget,
  nextReading: NextReadingWidget,
  verseOfTheDay: VerseOfTheDayWidget,
};

const DEFAULT_LAYOUTS: { [key: string]: Layout[] } = {
  lg: [
    { i: 'notifications', x: 0, y: 0, w: 1, h: 2 },
    { i: 'todayReading', x: 1, y: 0, w: 1, h: 2 },
    { i: 'upcomingEvents', x: 0, y: 2, w: 1, h: 1 },
    { i: 'nextReading', x: 1, y: 2, w: 1, h: 1 },
    { i: 'verseOfTheDay', x: 0, y: 3, w: 1, h: 1 },
  ],
  md: [
    { i: 'notifications', x: 0, y: 0, w: 1, h: 2 },
    { i: 'todayReading', x: 1, y: 0, w: 1, h: 2 },
    { i: 'upcomingEvents', x: 0, y: 2, w: 1, h: 1 },
    { i: 'nextReading', x: 1, y: 2, w: 1, h: 1 },
    { i: 'verseOfTheDay', x: 0, y: 3, w: 1, h: 1 },
  ],
  sm: [
    { i: 'notifications', x: 0, y: 0, w: 1, h: 2 },
    { i: 'todayReading', x: 0, y: 2, w: 1, h: 2 },
    { i: 'upcomingEvents', x: 0, y: 4, w: 1, h: 1 },
    { i: 'nextReading', x: 0, y: 5, w: 1, h: 1 },
    { i: 'verseOfTheDay', x: 0, y: 6, w: 1, h: 1 },
  ]
};

export default function HomePage() {
  const { currentUser, loadingAuth, updateUserProfile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const dashboardPrefs: DashboardPreferences = currentUser?.dashboard || {
    widgetVisibility: {
      notifications: true,
      todayReading: true,
      upcomingEvents: true,
      nextReading: true,
      verseOfTheDay: true,
    },
    layouts: DEFAULT_LAYOUTS,
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLayoutChange = (newLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    if (!currentUser || loadingAuth) return;

    // We only want to save if the layout has actually changed for the current breakpoint
    const currentBreakpoint = getCurrentBreakpoint();
    const oldLayout = dashboardPrefs.layouts?.[currentBreakpoint] || [];
    
    // Naive check, but good enough for this purpose
    if (JSON.stringify(oldLayout) !== JSON.stringify(newLayout)) {
       updateUserProfile(currentUser.uid, {
        dashboard: { ...dashboardPrefs, layouts: allLayouts },
      }).catch((error) => {
        toast({
          title: "Layout Save Failed",
          description: "Could not save your new dashboard layout.",
          variant: "destructive"
        });
      });
    }
  };
  
  const getCurrentBreakpoint = () => {
    if (!isMounted) return 'lg';
    if (window.innerWidth < 768) return 'sm';
    if (window.innerWidth < 1024) return 'md';
    return 'lg';
  };
  
  if (!isMounted || loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Filter out invisible widgets
  const visibleWidgets = Object.keys(WIDGET_COMPONENTS).filter(key => 
    dashboardPrefs.widgetVisibility?.[key] ?? true
  );

  return (
    <div className="space-y-8">
       <ResponsiveGridLayout
        className="layout"
        layouts={dashboardPrefs.layouts || DEFAULT_LAYOUTS}
        breakpoints={{ lg: 1200, md: 768, sm: 0 }}
        cols={{ lg: 2, md: 2, sm: 1 }}
        rowHeight={200}
        onLayoutChange={handleLayoutChange}
        isDraggable={!loadingAuth}
        isResizable={!loadingAuth}
        draggableHandle=".drag-handle"
      >
        {visibleWidgets.map(key => {
          const WidgetComponent = WIDGET_COMPONENTS[key];
          return (
            <div key={key}>
              <WidgetComponent />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}