
"use client";

import { useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Check, Loader2, Bell } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useRouter } from 'next/navigation';

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

export default function NotificationsWidget() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const unreadNotifications = useMemo(() => {
    if (!currentUser || !notifications) return [];
    return notifications.filter(n => !n.readBy.includes(currentUser.uid));
  }, [notifications, currentUser]);
  
  const handleGoToNotifications = () => {
    setIsPageLoading(true);
    router.push('/notifications');
  }

  return (
    <div className="h-full flex flex-col">
        <div className="flex-grow">
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
                {unreadNotifications.slice(0, 2).map(notification => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => markAsRead(notification.id)}
                />
                ))}
            </AnimatePresence>
            </div>
        )}
        </div>
        <div className="pt-4 border-t mt-4">
            <div className="flex items-center justify-between">
                 <Button variant="outline" size="sm" className="w-full" onClick={handleGoToNotifications}>
                   {unreadNotifications.length > 2 ? `View all ${unreadNotifications.length} notifications` : 'View All'}
                 </Button>
                 {unreadNotifications.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="ml-2">Mark All Read</Button>
                 )}
            </div>
        </div>
    </div>
  );
}
