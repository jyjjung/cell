
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Check, Edit } from 'lucide-react';
import type { DashboardPreferences } from '@/types';
import { cn } from '@/lib/utils';
import NotificationsWidget from '@/components/dashboard-widgets/notifications-widget';
import TodayReadingWidget from '@/components/dashboard-widgets/today-reading-widget';
import UpcomingEventsWidget from '@/components/dashboard-widgets/upcoming-events-widget';
import NextReadingWidget from '@/components/dashboard-widgets/next-reading-widget';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_COMPONENTS: { [key: string]: { component: React.FC; default: Layout } } = {
  notifications: { 
    component: NotificationsWidget, 
    default: { i: 'notifications', x: 0, y: 0, w: 1, h: 2, minH: 2, minW: 1 } 
  },
  todayReading: { 
    component: TodayReadingWidget, 
    default: { i: 'todayReading', x: 1, y: 0, w: 1, h: 2, minH: 2, minW: 1 } 
  },
  upcomingEvents: { 
    component: UpcomingEventsWidget, 
    default: { i: 'upcomingEvents', x: 0, y: 2, w: 1, h: 2, minH: 2, minW: 1 } 
  },
  nextReading: { 
    component: NextReadingWidget, 
    default: { i: 'nextReading', x: 1, y: 2, w: 1, h: 2, minH: 2, minW: 1 } 
  },
};

const ALL_WIDGET_KEYS = Object.keys(WIDGET_COMPONENTS);

const DEFAULT_LAYOUTS: Layouts = {
  lg: ALL_WIDGET_KEYS.map(key => WIDGET_COMPONENTS[key].default),
  md: ALL_WIDGET_KEYS.map(key => WIDGET_COMPONENTS[key].default),
  sm: ALL_WIDGET_KEYS.map(key => ({ ...WIDGET_COMPONENTS[key].default, w: 1 })),
};

function sanitizeForFirebase<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeForFirebase(item)) as any;

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
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);

  const dashboardPrefs: DashboardPreferences = currentUser?.dashboard || {
    widgetVisibility: {
      notifications: true,
      todayReading: true,
      upcomingEvents: true,
      nextReading: true,
    },
    layouts: DEFAULT_LAYOUTS,
  };

  const [visibleWidgets, setVisibleWidgets] = useState(
    Object.keys(dashboardPrefs.widgetVisibility || {}).filter(key => dashboardPrefs.widgetVisibility[key])
  );
  const [layouts, setLayouts] = useState(dashboardPrefs.layouts || DEFAULT_LAYOUTS);

  useEffect(() => {
    setIsMounted(true);
    if (currentUser) {
       setVisibleWidgets(Object.keys(currentUser.dashboard?.widgetVisibility || {}).filter(key => currentUser.dashboard?.widgetVisibility[key]));
       setLayouts(currentUser.dashboard?.layouts || DEFAULT_LAYOUTS);
    }
  }, [currentUser]);

  const handleLayoutChange = (newLayout: Layout[], allLayouts: Layouts) => {
    if (!currentUser || loadingAuth || !isCustomizeMode) return;
    const sanitizedLayouts = sanitizeForFirebase(allLayouts);
    setLayouts(sanitizedLayouts);
  };
  
  const saveCustomization = async () => {
    if (!currentUser) return;
    
    const widgetVisibility = ALL_WIDGET_KEYS.reduce((acc, key) => {
        acc[key] = visibleWidgets.includes(key);
        return acc;
    }, {} as { [key: string]: boolean });

    await updateUserProfile(currentUser.uid, {
      dashboard: { widgetVisibility, layouts },
    }).catch((error) => {
      console.error("Error saving layout:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your dashboard customization.",
        variant: "destructive"
      });
    });
    
    setIsCustomizeMode(false);
    toast({ title: "Dashboard Saved", description: "Your new layout has been saved." });
  };
  
  const handleToggleWidget = (widgetKey: string) => {
    setVisibleWidgets(prev => {
        if (prev.includes(widgetKey)) {
            return prev.filter(key => key !== widgetKey);
        } else {
            // Add widget back to a default position if not in layout
            const currentBreakpoint = getCurrentBreakpoint();
            const widgetExistsInLayout = layouts[currentBreakpoint]?.some(l => l.i === widgetKey);

            if (!widgetExistsInLayout) {
                const defaultWidgetLayout = WIDGET_COMPONENTS[widgetKey].default;
                // Add to a new row at the bottom
                const newY = Math.max(0, ...layouts[currentBreakpoint].map(l => l.y + l.h));

                setLayouts(currentLayouts => ({
                    ...currentLayouts,
                    [currentBreakpoint]: [...(currentLayouts[currentBreakpoint] || []), { ...defaultWidgetLayout, y: newY }]
                }));
            }
            return [...prev, widgetKey];
        }
    });
  };

  const removeWidget = (widgetKey: string) => {
     setVisibleWidgets(prev => prev.filter(key => key !== widgetKey));
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
  
  const filteredLayouts = Object.keys(layouts).reduce((acc, breakpoint) => {
      acc[breakpoint] = layouts[breakpoint].filter(layoutItem => visibleWidgets.includes(layoutItem.i));
      return acc;
  }, {} as Layouts);

  return (
    <div className="space-y-4">
        <AnimatePresence>
            {isCustomizeMode && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-4 bg-muted/80 backdrop-blur-sm rounded-lg border sticky top-0 z-10"
                >
                    <h3 className="text-sm font-semibold mb-2">Manage Widgets</h3>
                    <div className="flex flex-wrap gap-2">
                        {ALL_WIDGET_KEYS.map(key => (
                            <Button
                                key={key}
                                variant={visibleWidgets.includes(key) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleToggleWidget(key)}
                                className="transition-all"
                            >
                                {visibleWidgets.includes(key) ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </Button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

       <ResponsiveGridLayout
        className={cn("layout transition-all", isCustomizeMode && "bg-muted/30 rounded-lg border-dashed border-2 p-2")}
        layouts={filteredLayouts}
        breakpoints={{ lg: 1200, md: 768, sm: 0 }}
        cols={{ lg: 2, md: 2, sm: 1 }}
        rowHeight={150}
        onLayoutChange={handleLayoutChange}
        isDraggable={isCustomizeMode}
        isResizable={isCustomizeMode}
        draggableHandle=".drag-handle"
      >
        {visibleWidgets.map(key => {
          const WidgetComponent = WIDGET_COMPONENTS[key].component;
          return (
            <div key={key} className={cn("relative group/widget", isCustomizeMode && "shadow-xl")}>
              <WidgetComponent />
              {isCustomizeMode && (
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 left-2 z-20 h-7 w-7 opacity-0 group-hover/widget:opacity-100 transition-opacity"
                    onClick={() => removeWidget(key)}
                >
                    <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </ResponsiveGridLayout>

       <div className="fixed bottom-6 right-6 z-50">
            {isCustomizeMode ? (
                <Button onClick={saveCustomization} size="lg" className="rounded-full shadow-lg">
                    <Check className="mr-2 h-5 w-5" /> Done
                </Button>
            ) : (
                <Button onClick={() => setIsCustomizeMode(true)} size="lg" variant="outline" className="rounded-full shadow-lg bg-background">
                     <Edit className="mr-2 h-5 w-5" /> Customize
                </Button>
            )}
       </div>
    </div>
  );
}

    