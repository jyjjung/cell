
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
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
    { i: 'notifications', x: 0, y: 0, w: 1, h: 2, static: false },
    { i: 'todayReading', x: 1, y: 0, w: 1, h: 2, static: false },
    { i: 'upcomingEvents', x: 0, y: 2, w: 1, h: 1, static: false },
    { i: 'nextReading', x: 1, y: 2, w: 1, h: 1, static: false },
    { i: 'verseOfTheDay', x: 0, y: 3, w: 1, h: 1, static: false },
  ],
  md: [
    { i: 'notifications', x: 0, y: 0, w: 1, h: 2, static: false },
    { i: 'todayReading', x: 1, y: 0, w: 1, h: 2, static: false },
    { i: 'upcomingEvents', x: 0, y: 2, w: 1, h: 1, static: false },
    { i: 'nextReading', x: 1, y: 2, w: 1, h: 1, static: false },
    { i: 'verseOfTheDay', x: 0, y: 3, w: 1, h: 1, static: false },
  ],
  sm: [
    { i: 'notifications', x: 0, y: 0, w: 1, h: 2, static: false },
    { i: 'todayReading', x: 0, y: 2, w: 1, h: 2, static: false },
    { i: 'upcomingEvents', x: 0, y: 4, w: 1, h: 1, static: false },
    { i: 'nextReading', x: 0, y: 5, w: 1, h: 1, static: false },
    { i: 'verseOfTheDay', x: 0, y: 6, w: 1, h: 1, static: false },
  ]
};

// Helper function to remove undefined values from objects, which Firestore doesn't support
function sanitizeForFirebase<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirebase(item)) as any;
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        newObj[key] = sanitizeForFirebase(value);
      }
    }
  }
  return newObj as T;
}


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

  const handleLayoutChange = (newLayout: Layout[], allLayouts: Layouts) => {
    if (!currentUser || loadingAuth) return;
  
    // Sanitize the layouts object to remove any `undefined` values
    const sanitizedLayouts = sanitizeForFirebase(allLayouts);
  
    updateUserProfile(currentUser.uid, {
      dashboard: { ...dashboardPrefs, layouts: sanitizedLayouts },
    }).catch((error) => {
      console.error("Error saving layout:", error);
      toast({
        title: "Layout Save Failed",
        description: "Could not save your new dashboard layout. The previous layout will be restored on refresh.",
        variant: "destructive"
      });
    });
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
