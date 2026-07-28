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
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { toDateSafe } from '@/lib/firestore-timestamp';
import type { AppNotification } from '@/types';

const ANNOUNCEMENT_EMOJIS = ['👍', '❤️', '🙏', '🎉', '😮'] as const;

function AnnouncementItem({
  notification,
  isRead,
  onMarkRead,
  onToggleReaction,
  currentUserId,
  index,
  justNowLabel,
}: {
  notification: AppNotification;
  isRead: boolean;
  onMarkRead?: () => void;
  onToggleReaction: (emoji: string) => void;
  currentUserId: string;
  index: number;
  justNowLabel: string;
}) {
  const reactions = notification.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

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
      <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", isRead ? "bg-muted-foreground/30" : "bg-primary")} />
      <div className="flex-1 min-w-0 stack-gap-sm">
        <p className={cn("font-semibold text-sm", isRead ? "text-muted-foreground" : "text-foreground")}>{notification.title}</p>
        <LinkifiedText text={notification.message} className="block text-sm text-muted-foreground leading-relaxed" />
        <p className="text-micro-label">
          {toDateSafe(notification.createdAt)
            ? formatDistanceToNow(toDateSafe(notification.createdAt)!, { addSuffix: true })
            : justNowLabel}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {ANNOUNCEMENT_EMOJIS.map((emoji) => {
            const uids = reactions[emoji] || [];
            const mine = uids.includes(currentUserId);
            const count = uids.length;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(emoji)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
                  mine
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50",
                )}
                aria-pressed={mine}
              >
                <span>{emoji}</span>
                {count > 0 ? <span className="tabular-nums">{count}</span> : null}
              </button>
            );
          })}
          {reactionEntries.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              {reactionEntries.reduce((sum, [, uids]) => sum + uids.length, 0)} reacted
            </span>
          )}
        </div>
      </div>
      {!isRead && onMarkRead && (
        <Button variant="ghost" size="icon" onClick={onMarkRead}
          className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted">
          <X className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

export default function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, toggleAnnouncementReaction } = useNotifications();
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
                      onToggleReaction={(emoji) => toggleAnnouncementReaction(n.id, emoji)}
                      currentUserId={uid}
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
                    onToggleReaction={(emoji) => toggleAnnouncementReaction(n.id, emoji)}
                    currentUserId={uid}
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
