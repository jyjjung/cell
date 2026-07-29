"use client";

import { useEffect, useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { AnnouncementReactions } from '@/components/announcements/announcement-reactions';
import { Check, Megaphone, CheckCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { translations } from '@/lib/translations';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { toDateSafe } from '@/lib/firestore-timestamp';
import type { AppNotification } from '@/types';

function AnnouncementItem({
  notification,
  isRead,
  onMarkRead,
  onToggleReaction,
  uid,
  index,
  justNowLabel,
}: {
  notification: AppNotification;
  isRead: boolean;
  onMarkRead?: () => void;
  onToggleReaction: (emoji: string) => void;
  uid: string;
  index: number;
  justNowLabel: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors",
        isRead && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn("min-w-0 text-base font-semibold", isRead ? "text-muted-foreground" : "text-foreground")}>{notification.title}</p>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-xs text-muted-foreground">
            {toDateSafe(notification.createdAt)
              ? formatDistanceToNow(toDateSafe(notification.createdAt)!, { addSuffix: true })
              : justNowLabel}
          </p>
          {!isRead && onMarkRead && (
            <Button variant="ghost" size="icon" onClick={onMarkRead}
              className="h-7 w-7 rounded-lg hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <LinkifiedText text={notification.message} className="block text-sm leading-relaxed text-muted-foreground" />
      <AnnouncementReactions notification={notification} uid={uid} onToggle={onToggleReaction} />
    </motion.div>
  );
}

export default function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, toggleReaction } = useNotifications();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const announcements = useMemo(() => notifications.filter(n => n.type === 'announcement'), [notifications]);
  const uid = currentUser?.uid || '';
  const unread = announcements.filter(n => !(n.readBy || []).includes(uid));
  const read = announcements.filter(n => (n.readBy || []).includes(uid));

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

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title={t.noAnnouncementsYet} description={t.checkBackAnnouncements} />
      ) : (
        <Tabs defaultValue="unread" className="ui-card">
          <TabsList className="h-9">
            <TabsTrigger value="unread" className="rounded-md text-sm">
              {t.unread} {unread.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">{unread.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="archive" className="rounded-md text-sm">{t.archive}</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-4">
            {unread.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="flow-list">
                  {unread.map((n, i) => (
                    <AnnouncementItem
                      key={n.id}
                      notification={n}
                      isRead={false}
                      onMarkRead={() => markAsRead(n.id)}
                      onToggleReaction={(emoji) => toggleReaction(n.id, emoji)}
                      uid={uid}
                      index={i}
                      justNowLabel={t.justNow}
                    />
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <EmptyState icon={Check} title={t.allCaughtUp} description={t.noUnreadAnnouncements} />
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-4">
            {read.length > 0 ? (
              <div className="flow-list">
                {read.map((n, i) => (
                  <AnnouncementItem
                    key={n.id}
                    notification={n}
                    isRead={true}
                    onToggleReaction={(emoji) => toggleReaction(n.id, emoji)}
                    uid={uid}
                    index={i}
                    justNowLabel={t.justNow}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Megaphone} title={t.archiveEmpty} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
