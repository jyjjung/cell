
"use client";

import { useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/auth-context';
import WidgetCard from './widget-card';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Check, Loader2, Bell } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useRouter } from 'next/navigation';
import type { Layout } from 'react-grid-layout';

// Approximate heights for calculation
const WIDGET_HEADER_HEIGHT = 60; // px
const WIDGET_FOOTER_HEIGHT = 50; // px
const NOTIFICATION_ITEM_HEIGHT = 72; // px

const NotificationItem = ({ notification, onMarkRead }: { notification: any, onMarkRead: () => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: 50 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    className="relative"
  >
    <Card className="bg-background/50 hover:bg-muted/50 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-grow min-w-0">
            <p className="font-semibold text-sm truncate">{notification.title}</p>
            <p className="text-muted-foreground text-xs truncate">{notification.message}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              {notification.createdAt ? `${formatDistanceToNow(notification.createdAt.toDate())} ago` : 'just now'}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onMarkRead} aria-label="Mark as read">
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function NotificationsWidget(props: Partial<Layout>) {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const unreadNotifications = useMemo(() => {
    if (!currentUser || !notifications) return [];
    return notifications.filter(n => !n.readBy.includes(currentUser.uid));
  }, [notifications, currentUser]);
  
  const maxItemsToShow = useMemo(() => {
    if (!props.h) return 3; // Default
    const widgetHeight = props.h * 1; // rowHeight is 1
    const contentHeight = widgetHeight - WIDGET_HEADER_HEIGHT - WIDGET_FOOTER_HEIGHT;
    return Math.max(1, Math.floor(contentHeight / NOTIFICATION_ITEM_HEIGHT));
  }, [props.h]);
  
  const handleGoToNotifications = () => {
    setIsPageLoading(true);
    router.push('/notifications');
  }

  return (
    <WidgetCard
      title="Notifications"
      titleExtraContent={
        unreadNotifications.length > 0 ? (
          <Button variant="outline" size="xs" onClick={markAllAsRead}>Mark All Read</Button>
        ) : null
      }
      description={unreadNotifications.length > 0 ? `You have ${unreadNotifications.length} unread notifications.` : "You're all caught up."}
      footer={<Button variant="outline" size="sm" className="w-full" onClick={handleGoToNotifications}>View All</Button>}
    >
      {loading ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : unreadNotifications.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
          <Bell className="h-10 w-10 mb-2" />
          <p className="text-sm font-medium">No new notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {unreadNotifications.slice(0, maxItemsToShow).map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </WidgetCard>
  );
}
