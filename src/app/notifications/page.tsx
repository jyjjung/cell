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
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { toDateSafe } from '@/lib/firestore-timestamp';

function NotificationItem({ notification, isRead, onMarkRead, index, justNowLabel }: { notification: any; isRead: boolean; onMarkRead?: () => void; index: number; justNowLabel: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn(
        "flow-list-item transition-colors",
        isRead && "opacity-60"
      )}
    >
      <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", isRead ? "bg-muted" : "bg-primary/10")}>
        <Bell className={cn("h-3.5 w-3.5", isRead ? "text-muted-foreground" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0 stack-gap-sm">
        <p className={cn("font-semibold text-sm", isRead ? "text-muted-foreground" : "text-foreground")}>{notification.title}</p>
        <LinkifiedText text={notification.message} className="block text-sm text-muted-foreground leading-relaxed" />
        <p className="text-micro-label">
          {toDateSafe(notification.createdAt)
            ? formatDistanceToNow(toDateSafe(notification.createdAt)!, { addSuffix: true })
            : justNowLabel}
        </p>
      </div>
      {!isRead && onMarkRead && (
        <Button variant="ghost" size="icon" onClick={onMarkRead}
          className="h-8 w-8 rounded-lg shrink-0 hover:bg-muted">
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
  const unread = relevant.filter(n => !(n.readBy || []).includes(uid));
  const read = relevant.filter(n => (n.readBy || []).includes(uid));

  if (!isMounted || loading) return null;

  return (
    <div className="page-container">
      <NavPageHeader
        action={
          unread.length > 0 ? (
            <Button variant="outline" size="sm" className="rounded-lg h-8 gap-1.5 text-xs"
              onClick={() => markAllAsRead(unread.map(n => n.id))}>
              <CheckCheck className="h-3.5 w-3.5" /> {t.dismissAll}
            </Button>
          ) : undefined
        }
      />

      {relevant.length === 0 ? (
        <EmptyState icon={BellOff} title={t.allSettled} description={t.allCaughtUp} />
      ) : (
        <Tabs defaultValue="unread" className="ui-card">
          <TabsList className="h-9">
            <TabsTrigger value="unread" className="text-sm">
              {t.unread} {unread.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">{unread.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="archive" className="text-sm">{t.archive}</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-4">
            {unread.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="ui-list">
                  {unread.map((n, i) => <NotificationItem key={n.id} notification={n} isRead={false} onMarkRead={() => markAsRead(n.id)} index={i} justNowLabel={t.justNow} />)}
                </div>
              </AnimatePresence>
            ) : (
              <EmptyState icon={Check} title={t.allCaughtUp} description={t.noUnreadNotifications} />
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-4">
            {read.length > 0 ? (
              <div className="ui-list">
                {read.map((n, i) => <NotificationItem key={n.id} notification={n} isRead={true} index={i} justNowLabel={t.justNow} />)}
              </div>
            ) : (
              <EmptyState icon={Bell} title={t.archiveEmpty} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
