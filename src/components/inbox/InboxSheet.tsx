'use client';

import { AnnouncementReactions } from '@/components/announcements/announcement-reactions';
import { EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { LinkifiedText } from '@/components/ui/linkified-text';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useInbox, type InboxTab } from '@/contexts/inbox-context';
import { useNotifications } from '@/hooks/use-notifications';
import { db } from '@/lib/firebase';
import { reviveTimestamp, toDateSafe, toMillisSafe } from '@/lib/firestore-timestamp';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Bell, BellOff, Check, CheckCheck, Loader2, Megaphone, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ViewFilter = 'unread' | 'all';

const HISTORY_LIMITS = {
  announcements: 80,
  personal: 50,
  globals: 40,
} as const;

function sortNewest(a: AppNotification, b: AppNotification) {
  return toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt);
}

function normalize(raw: AppNotification): AppNotification {
  const createdAt = reviveTimestamp(raw.createdAt);
  return {
    ...raw,
    createdAt: createdAt ?? raw.createdAt,
    readBy: Array.isArray(raw.readBy) ? raw.readBy : [],
    reactions: raw.reactions && typeof raw.reactions === 'object' ? raw.reactions : undefined,
  };
}

function mergeById(...lists: AppNotification[][]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  for (const list of lists) {
    for (const item of list) {
      map.set(item.id, normalize(item));
    }
  }
  return [...map.values()].sort(sortNewest);
}

async function fetchInboxHistory(uid: string): Promise<AppNotification[]> {
  const [announcementsSnap, personalSnap, globalsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'notifications'),
        where('type', '==', 'announcement'),
        orderBy('createdAt', 'desc'),
        limit(HISTORY_LIMITS.announcements),
      ),
    ),
    getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(HISTORY_LIMITS.personal),
      ),
    ),
    getDocs(
      query(
        collection(db, 'notifications'),
        where('isGlobal', '==', true),
        orderBy('createdAt', 'desc'),
        limit(HISTORY_LIMITS.globals),
      ),
    ),
  ]);

  const mapDocs = (snap: typeof announcementsSnap) =>
    snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));

  return mergeById(mapDocs(announcementsSnap), mapDocs(personalSnap), mapDocs(globalsSnap));
}

function InboxItemCard({
  notification,
  isRead,
  uid,
  justNowLabel,
  showReactions,
  accentClass,
  onMarkRead,
  onToggleReaction,
  onOpen,
}: {
  notification: AppNotification;
  isRead: boolean;
  uid: string;
  justNowLabel: string;
  showReactions?: boolean;
  accentClass: string;
  onMarkRead?: () => void;
  onToggleReaction?: (emoji: string) => void;
  onOpen?: () => void;
}) {
  const created = toDateSafe(notification.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border bg-transparent p-4 transition-colors',
        isRead && 'opacity-60',
        onOpen && 'cursor-pointer hover:bg-muted/30',
      )}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
              isRead ? 'bg-muted-foreground/30' : accentClass,
            )}
          />
          <p
            className={cn(
              'min-w-0 text-base font-semibold leading-snug',
              isRead ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {notification.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-xs text-muted-foreground">
            {created ? formatDistanceToNow(created, { addSuffix: true }) : justNowLabel}
          </p>
          {!isRead && onMarkRead && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              aria-label="Mark as read"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <LinkifiedText
        text={notification.message}
        className="block pl-[18px] text-sm leading-relaxed text-muted-foreground"
      />
      {showReactions && onToggleReaction && (
        <div className="pl-[18px]" onClick={(e) => e.stopPropagation()}>
          <AnnouncementReactions
            notification={notification}
            uid={uid}
            onToggle={onToggleReaction}
          />
        </div>
      )}
    </motion.div>
  );
}

export function InboxSheet() {
  const { currentUser } = useAuth();
  const { isOpen, tab, setTab, closeInbox } = useInbox();
  const { notifications, markAsRead, markAllAsRead, toggleReaction } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const uid = currentUser?.uid || '';

  const [viewFilter, setViewFilter] = useState<ViewFilter>('unread');
  const [history, setHistory] = useState<AppNotification[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Prefer All when opening with nothing unread, so older items are visible immediately.
  useEffect(() => {
    if (!isOpen || !uid) return;
    const hasUnread = notifications.some((n) => !(n.readBy || []).includes(uid));
    setViewFilter(hasUnread ? 'unread' : 'all');
    // Intentionally only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !uid || viewFilter !== 'all') return;

    let cancelled = false;
    setHistoryLoading(true);
    void fetchInboxHistory(uid)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch((error) => {
        console.error('Failed to load inbox history:', error);
        if (!cancelled) setHistory(notifications);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Don't re-fetch on every live notification tick — only when opening All.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, uid, viewFilter]);

  const liveAnnouncements = useMemo(
    () => notifications.filter((n) => n.type === 'announcement').sort(sortNewest),
    [notifications],
  );
  const liveGeneral = useMemo(
    () => notifications.filter((n) => n.type !== 'announcement').sort(sortNewest),
    [notifications],
  );

  const unreadAnnouncements = useMemo(
    () => liveAnnouncements.filter((n) => !(n.readBy || []).includes(uid)),
    [liveAnnouncements, uid],
  );
  const unreadGeneral = useMemo(
    () => liveGeneral.filter((n) => !(n.readBy || []).includes(uid)),
    [liveGeneral, uid],
  );

  const historyAnnouncements = useMemo(
    () => (history ?? notifications).filter((n) => n.type === 'announcement').sort(sortNewest),
    [history, notifications],
  );
  const historyGeneral = useMemo(
    () => (history ?? notifications).filter((n) => n.type !== 'announcement').sort(sortNewest),
    [history, notifications],
  );

  const shownAnnouncements =
    viewFilter === 'unread' ? unreadAnnouncements : historyAnnouncements;
  const shownGeneral =
    viewFilter === 'unread' ? unreadGeneral : historyGeneral;

  const activeUnread = tab === 'announcements' ? unreadAnnouncements : unreadGeneral;

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    closeInbox();
    if (pathname === '/announcements' || pathname === '/notifications') {
      router.replace('/');
    }
  };

  const openItem = (n: AppNotification) => {
    if (!n.relatedUrl) return;
    closeInbox();
    router.push(n.relatedUrl);
  };

  const tabButton = (id: InboxTab, label: string, count: number, Icon: typeof Megaphone) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
        tab === id
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', tab === id && (id === 'announcements' ? 'text-chart-4' : 'text-primary'))} />
      {label}
      {count > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
            tab === id
              ? id === 'announcements'
                ? 'bg-chart-4 text-primary-foreground'
                : 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );

  const filterButton = (id: ViewFilter, label: string) => (
    <button
      type="button"
      onClick={() => setViewFilter(id)}
      className={cn(
        'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        viewFilter === id
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-semibold">Inbox</SheetTitle>
            <div className="flex items-center gap-1">
              {activeUnread.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={() => markAllAsRead(activeUnread.map((n) => n.id))}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t.dismissAll}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => handleOpenChange(false)}
                aria-label="Close inbox"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="shrink-0 border-b border-border bg-muted/40 p-1.5">
          <div className="flex gap-1">
            {tabButton('announcements', t.announcements, unreadAnnouncements.length, Megaphone)}
            {tabButton('notifications', t.notifications, unreadGeneral.length, Bell)}
          </div>
        </div>

        <div className="shrink-0 border-b border-border px-4 py-2">
          <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
            {filterButton('unread', t.unread)}
            {filterButton('all', t.archive)}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {viewFilter === 'all' && historyLoading && !history ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tab === 'announcements' ? (
            shownAnnouncements.length === 0 ? (
              <EmptyState
                icon={viewFilter === 'unread' ? Check : Megaphone}
                title={viewFilter === 'unread' ? t.allCaughtUp : t.noAnnouncementsYet}
                description={
                  viewFilter === 'unread' ? t.noUnreadAnnouncements : t.checkBackAnnouncements
                }
              />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {shownAnnouncements.map((n) => (
                    <InboxItemCard
                      key={n.id}
                      notification={n}
                      isRead={(n.readBy || []).includes(uid)}
                      uid={uid}
                      justNowLabel={t.justNow}
                      showReactions
                      accentClass="bg-chart-4"
                      onMarkRead={() => markAsRead(n.id)}
                      onToggleReaction={(emoji) => toggleReaction(n.id, emoji)}
                      onOpen={n.relatedUrl ? () => openItem(n) : undefined}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )
          ) : shownGeneral.length === 0 ? (
            <EmptyState
              icon={viewFilter === 'unread' ? Check : BellOff}
              title={viewFilter === 'unread' ? t.allCaughtUp : t.allSettled}
              description={
                viewFilter === 'unread' ? t.noUnreadNotifications : t.allCaughtUp
              }
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {shownGeneral.map((n) => (
                  <InboxItemCard
                    key={n.id}
                    notification={n}
                    isRead={(n.readBy || []).includes(uid)}
                    uid={uid}
                    justNowLabel={t.justNow}
                    accentClass="bg-primary"
                    onMarkRead={() => markAsRead(n.id)}
                    onOpen={n.relatedUrl ? () => openItem(n) : undefined}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
