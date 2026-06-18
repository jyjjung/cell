"use client";

import { useEffect, useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Check, Megaphone, CheckCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { translations } from '@/lib/translations';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { toDateSafe } from '@/lib/firestore-timestamp';

function AnnouncementItem({ notification, isRead, onMarkRead, index }: { notification: any; isRead: boolean; onMarkRead?: () => void; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 transition-colors",
        isRead
          ? "bg-muted border-border/20 opacity-60"
          : "bg-card/60 border-border/40 hover:bg-card/80"
      )}
    >
      <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", isRead ? "bg-muted-foreground/20" : "bg-muted animate-pulse")} />
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn("font-semibold text-sm", isRead ? "text-muted-foreground" : "text-foreground")}>{notification.title}</p>
        <LinkifiedText text={notification.message} className="block text-sm text-muted-foreground leading-relaxed" />
        <p className="text-[11px] text-muted-foreground/40 font-medium">
          {toDateSafe(notification.createdAt)
            ? formatDistanceToNow(toDateSafe(notification.createdAt)!, { addSuffix: true })
            : 'Just now'}
        </p>
      </div>
      {!isRead && onMarkRead && (
        <Button variant="ghost" size="icon" onClick={onMarkRead}
          className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted hover:text-primary transition-colors">
          <X className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

export default function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const announcements = useMemo(() => notifications.filter(n => n.type === 'announcement'), [notifications]);
  const uid = currentUser?.uid || '';
  const unread = announcements.filter(n => !(n.readBy || []).includes(uid));
  const read = announcements.filter(n => (n.readBy || []).includes(uid));

  if (!isMounted || loading) return null;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t.announcements}
        action={
          unread.length > 0 ? (
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 font-semibold text-xs"
              onClick={() => markAllAsRead(unread.map(n => n.id))}>
              <CheckCheck className="h-4 w-4" /> Dismiss all
            </Button>
          ) : undefined
        }
      />

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Check back later for community updates." />
      ) : (
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="h-10">
            <TabsTrigger value="unread" className="rounded-md text-sm font-medium">
              Unread {unread.length > 0 && <span className="ml-1.5 bg-muted text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{unread.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="archive" className="rounded-md text-sm font-medium">Archive</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-6">
            {unread.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {unread.map((n, i) => (
                    <AnnouncementItem key={n.id} notification={n} isRead={false} onMarkRead={() => markAsRead(n.id)} index={i} />
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <EmptyState icon={Check} title="All caught up!" description="No unread announcements." />
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-6">
            {read.length > 0 ? (
              <div className="space-y-3">
                {read.map((n, i) => <AnnouncementItem key={n.id} notification={n} isRead={true} index={i} />)}
              </div>
            ) : (
              <EmptyState icon={Megaphone} title="Archive is empty" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
