"use client";

import { useEffect, useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Check, Bell, BellOff, CheckCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { translations } from '@/lib/translations';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { LinkifiedText } from '@/components/ui/linkified-text';

function NotificationItem({ notification, isRead, onMarkRead, index }: { notification: any; isRead: boolean; onMarkRead?: () => void; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={cn(
        "flex items-start gap-4 p-5 rounded-2xl border transition-all",
        isRead
          ? "bg-muted/10 border-border/20 opacity-60"
          : "bg-card/50 border-border/40 backdrop-blur-sm hover:shadow-md"
      )}
    >
      <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", isRead ? "bg-muted/30" : "bg-primary/10")}>
        <Bell className={cn("h-3.5 w-3.5", isRead ? "text-muted-foreground/40" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn("font-semibold text-sm", isRead ? "text-muted-foreground" : "text-foreground")}>{notification.title}</p>
        <LinkifiedText text={notification.message} className="block text-sm text-muted-foreground leading-relaxed" />
        <p className="text-[11px] text-muted-foreground/40 font-medium">
          {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
        </p>
      </div>
      {!isRead && onMarkRead && (
        <Button variant="ghost" size="icon" onClick={onMarkRead}
          className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary shrink-0 transition-colors">
          <X className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const relevant = useMemo(() => notifications.filter(n => n.type !== 'announcement'), [notifications]);
  const uid = currentUser?.uid || '';
  const unread = relevant.filter(n => !n.readBy.includes(uid));
  const read = relevant.filter(n => n.readBy.includes(uid));

  if (!isMounted || loading) return null;

  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <PageHeader
        title={t.notifications}
        description="Activity Feed"
        icon={Bell}
        iconBgColor="bg-primary/10"
        accentColor="text-primary"
        action={
          unread.length > 0 ? (
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 font-semibold text-xs"
              onClick={() => markAllAsRead(unread.map(n => n.id))}>
              <CheckCheck className="h-4 w-4" /> Dismiss all
            </Button>
          ) : undefined
        }
      />

      {relevant.length === 0 ? (
        <EmptyState icon={BellOff} title={t.allSettled} description="You're all caught up." />
      ) : (
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-muted/30 border border-border/30 h-11">
            <TabsTrigger value="unread" className="rounded-xl text-sm font-semibold">
              Unread {unread.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{unread.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="archive" className="rounded-xl text-sm font-semibold">Archive</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-6">
            {unread.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {unread.map((n, i) => <NotificationItem key={n.id} notification={n} isRead={false} onMarkRead={() => markAsRead(n.id)} index={i} />)}
                </div>
              </AnimatePresence>
            ) : (
              <EmptyState icon={Check} title="All caught up!" description="No unread notifications." />
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-6">
            {read.length > 0 ? (
              <div className="space-y-3">
                {read.map((n, i) => <NotificationItem key={n.id} notification={n} isRead={true} index={i} />)}
              </div>
            ) : (
              <EmptyState icon={Bell} title="Archive is empty" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
