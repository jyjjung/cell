"use client";

import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, X, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => { setIsMounted(true) }, []);

  const unreadNotifications = notifications.filter(n => !n.readBy.includes(currentUser?.uid || ''));
  const readNotifications = notifications.filter(n => n.readBy.includes(currentUser?.uid || ''));

  const itemVariants = {
    hidden: { opacity: 0, x: -50, height: 0, marginBottom: 0 },
    visible: { opacity: 1, x: 0, height: 'auto', marginBottom: '1rem' },
    exit: { opacity: 0, x: 100, height: 0, marginBottom: 0, transition: { duration: 0.3 } },
  };
  
  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  const NotificationCard = ({ notification, isRead }: { notification: any, isRead: boolean }) => (
    <motion.div
        layout
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
    >
        <Card className={cn("transition-colors", isRead && "bg-muted/50")}>
        <CardContent className="p-4 flex items-start justify-between gap-4">
            <div className="flex-grow">
            <p className="font-semibold text-sm">{notification.title}</p>
            <p className="text-muted-foreground text-sm">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
                {notification.createdAt ? `${formatDistanceToNow(notification.createdAt.toDate())} ago` : 'just now'}
            </p>
            </div>
            {!isRead && (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => markAsRead(notification.id)}
                aria-label="Mark as read"
            >
                <Check className="h-4 w-4" />
            </Button>
            )}
        </CardContent>
        </Card>
    </motion.div>
  );


  return (
    <div className="container mx-auto py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
                <Bell className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            </div>
            {unreadNotifications.length > 0 && (
                <Button variant="outline" onClick={markAllAsRead}>
                    Mark All as Read
                </Button>
            )}
        </div>

      {notifications.length === 0 ? (
        <Card className="text-center p-12">
            <CardContent>
                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">All caught up!</h3>
                <p className="text-muted-foreground mt-2">You have no new notifications.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
            {unreadNotifications.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">New</h2>
                    <AnimatePresence>
                        {unreadNotifications.map(notification => (
                            <NotificationCard key={notification.id} notification={notification} isRead={false} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
            {readNotifications.length > 0 && (
                 <div>
                    <h2 className="text-lg font-semibold mb-3">Read</h2>
                    <div className="space-y-4">
                        {readNotifications.map(notification => (
                           <NotificationCard key={notification.id} notification={notification} isRead={true} />
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
