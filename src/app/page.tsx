
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Loader2, X, Plus, Check, Edit, GripVertical } from 'lucide-react';
import type { DashboardPreferences } from '@/types';
import { cn } from '@/lib/utils';
import NotificationsWidget from '@/components/dashboard-widgets/notifications-widget';
import TodayReadingWidget from '@/components/dashboard-widgets/today-reading-widget';
import UpcomingEventsWidget from '@/components/dashboard-widgets/upcoming-events-widget';
import NextReadingWidget from '@/components/dashboard-widgets/next-reading-widget';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_COMPONENTS: { [key: string]: { component: React.FC<any>; default: Layout } } = {
  notifications: { 
    component: NotificationsWidget, 
    default: { i: 'notifications', x: 0, y: 0, w: 1, h: 4, isResizable: false } 
  },
  todayReading: { 
    component: TodayReadingWidget, 
    default: { i: 'todayReading', x: 1, y: 0, w: 1, h: 5, isResizable: false }
  },
  upcomingEvents: { 
    component: UpcomingEventsWidget, 
    default: { i: 'upcomingEvents', x: 0, y: 4, w: 1, h: 4, isResizable: false }
  },
  nextReading: { 
    component: NextReadingWidget, 
    default: { i: 'nextReading', x: 1, y: 5, w: 1, h: 7, isResizable: false }
  },
};

const ALL_WIDGET_KEYS = Object.keys(WIDGET_COMPONENTS);

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
      { i: 'notifications', x: 0, y: 0, w: 1, h: 4, isResizable: false },
      { i: 'todayReading', x: 1, y: 0, w: 1, h: 5, isResizable: false },
      { i: 'upcomingEvents', x: 0, y: 4, w: 1, h: 4, isResizable: false },
      { i: 'nextReading', x: 1, y: 5, w: 1, h: 7, isResizable: false },
  ],
  md: [
      { i: 'notifications', x: 0, y: 0, w: 1, h: 4, isResizable: false },
      { i: 'todayReading', x: 1, y: 0, w: 1, h: 5, isResizable: false },
      { i: 'upcomingEvents', x: 0, y: 4, w: 1, h: 4, isResizable: false },
      { i: 'nextReading', x: 1, y: 5, w: 1, h: 7, isResizable: false },
  ],
  sm: [
      { i: 'notifications', x: 0, y: 0, w: 1, h: 4, isResizable: false },
      { i: 'todayReading', x: 0, y: 4, w: 1, h: 5, isResizable: false },
      { i: 'upcomingEvents', x: 0, y: 9, w: 1, h: 4, isResizable: false },
      { i: 'nextReading', x: 0, y: 13, w: 1, h: 7, isResizable: false },
  ]
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
  
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (currentUser) {
       const userVisible = Object.keys(currentUser.dashboard?.widgetVisibility || ALL_WIDGET_KEYS.reduce((acc, key) => ({...acc, [key]: true}), {})).filter(key => currentUser.dashboard?.widgetVisibility[key]);
       setVisibleWidgets(userVisible);
       
       const userLayouts = currentUser.dashboard?.layouts;
       const sanitizedLayouts = userLayouts && Object.keys(userLayouts).length > 0 ? userLayouts : DEFAULT_LAYOUTS;
       setLayouts(sanitizedLayouts);
    }
  }, [currentUser]);
  
  const handleLayoutChange = (newLayout: Layout[], allLayouts: Layouts) => {
    setCurrentLayout(newLayout);
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
    });
    
    setIsCustomizeMode(false);
  };
  
  const handleToggleWidget = (widgetKey: string) => {
    setVisibleWidgets(prev => {
        const isVisible = prev.includes(widgetKey);
        const newVisible = isVisible ? prev.filter(key => key !== widgetKey) : [...prev, widgetKey];
        
        if (!isVisible) {
            const currentBreakpoint = getCurrentBreakpoint();
            setLayouts(currentLayouts => {
                const widgetExistsInLayout = currentLayouts[currentBreakpoint]?.some(l => l.i === widgetKey);
                if (widgetExistsInLayout) return currentLayouts;

                const defaultWidgetLayout = WIDGET_COMPONENTS[widgetKey].default;
                const newY = Math.max(0, ...(currentLayouts[currentBreakpoint] || []).map(l => l.y + l.h));
                const newLayoutForBreakpoint = [...(currentLayouts[currentBreakpoint] || []), { ...defaultWidgetLayout, y: newY }];
                
                return { ...currentLayouts, [currentBreakpoint]: newLayoutForBreakpoint };
            });
        }
        return newVisible;
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

  const existingVisibleWidgets = visibleWidgets.filter(key => ALL_WIDGET_KEYS.includes(key));
  
  const filteredLayouts = Object.keys(layouts).reduce((acc, breakpoint) => {
      acc[breakpoint] = layouts[breakpoint]?.filter(layoutItem => existingVisibleWidgets.includes(layoutItem.i)) || [];
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
                                variant={existingVisibleWidgets.includes(key) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleToggleWidget(key)}
                                className="transition-all"
                            >
                                {existingVisibleWidgets.includes(key) ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
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
        rowHeight={30}
        onLayoutChange={handleLayoutChange}
        isDraggable={isCustomizeMode}
        isResizable={false}
        draggableHandle=".drag-handle"
      >
        {existingVisibleWidgets.map(key => {
          const WidgetComponent = WIDGET_COMPONENTS[key].component;
          const layoutProps = currentLayout.find(l => l.i === key) || WIDGET_COMPONENTS[key].default;
          return (
            <div key={key} className={cn("relative group/widget", isCustomizeMode && "shadow-xl")}>
              {isCustomizeMode && (
                <button className="drag-handle absolute top-2 right-2 z-20 cursor-move text-muted-foreground hover:text-foreground transition-colors">
                    <GripVertical className="h-5 w-5" />
                </button>
              )}
              <WidgetComponent {...layoutProps} />
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

       <div className="mt-8 flex justify-center">
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
