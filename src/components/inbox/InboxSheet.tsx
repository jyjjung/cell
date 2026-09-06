'use client';

import { AnnouncementReactions } from '@/components/announcements/announcement-reactions';
import { EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { LinkifiedText } from '@/components/ui/linkified-text';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useAdmin } from '@/context/AuthProvider';
import { useInbox, type InboxTab } from '@/contexts/inbox-context';
import { useNdcpcUnread } from '@/contexts/ndcpc-unread-context';
import { useNotifications } from '@/hooks/use-notifications';
import { hasNdcpcAccess, resolveActiveApp } from '@/lib/app-access';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { getFirestoreMillis } from '@/lib/ndcpc/unread-counts';
import { useTranslation } from '@/context/LocaleProvider';
import { db } from '@/lib/firebase';
import { reviveTimestamp, toDateSafe, toMillisSafe } from '@/lib/firestore-timestamp';
import {
  reactionsMapsEqual,
  toggleReactionMap,
  type ReactionMap,
} from '@/lib/reaction-utils';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { Announcement } from '@/types/ndcpc-ported';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { useDeferredLoading } from '@/hooks/use-deferred-loading';
import { AddAnnouncementForm } from '@/components/ndcpc/AddAnnouncementForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, BellOff, Check, CheckCheck, Megaphone, Plus, X } from 'lucide-react';
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
        'ui-card flex flex-col gap-2 bg-transparent transition-colors',
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
            <IconButton
              type="button"
              size="compact"
              variant="ghost"
              className="rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              aria-label="Mark as read"
              icon={X}
            />
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


function NdcpcAnnouncementCard({
  item,
  isUnread,
  dateLabel,
}: {
  item: Announcement;
  isUnread: boolean;
  dateLabel: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'ui-card flex flex-col gap-2 bg-transparent transition-colors',
        !isUnread && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
              isUnread ? 'bg-chart-4' : 'bg-muted-foreground/30',
            )}
          />
          <div className="min-w-0">
            <p
              className={cn(
                'min-w-0 text-base font-semibold leading-snug',
                isUnread ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {item.title}
            </p>
          </div>
        </div>
        {dateLabel ? (
          <p className="shrink-0 text-xs text-muted-foreground">{dateLabel}</p>
        ) : null}
      </div>
      {item.content ?? item.body ? (
        <p className="whitespace-pre-wrap pl-[18px] text-sm leading-relaxed text-muted-foreground">
          {item.content ?? item.body}
        </p>
      ) : null}
    </motion.div>
  );
}

export function InboxSheet() {
  const { currentUser } = useAuth();
  const { isAdmin } = useAdmin();
  const { isOpen, tab, setTab, closeInbox } = useInbox();
  const { notifications, markAsRead, markAllAsRead, toggleReaction } = useNotifications();
  const {
    announcementsLastReadAt,
    markAnnouncementsRead,
  } = useNdcpcUnread();
  const firestore = useFirestore();
  const { locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const uid = currentUser?.uid || '';
  const canShowNdcpc = hasNdcpcAccess(currentUser);
  const activeApp = resolveActiveApp(pathname);
  const hasAnnouncementsTab = activeApp === 'cell' || activeApp === 'ndcpc';
  const isNdcpcAnnouncements = activeApp === 'ndcpc' && canShowNdcpc;

  const [viewFilter, setViewFilter] = useState<ViewFilter>('unread');
  const [history, setHistory] = useState<AppNotification[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  /** Local optimistic reactions so pills update immediately inside the sheet. */
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, ReactionMap>>({});

  const ndcpcAnnouncementsQuery = useMemoFirebase(() => {
    if (!firestore || !isNdcpcAnnouncements) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.announcements), orderBy('date', 'desc'));
  }, [firestore, isNdcpcAnnouncements]);

  const { data: ndcpcAnnouncements, isLoading: ndcpcAnnouncementsLoading } =
    useCollection<Announcement>(ndcpcAnnouncementsQuery);

  useEffect(() => {
    if (tab === 'prayer') setTab('notifications');
  }, [tab, setTab]);

  useEffect(() => {
    if (!hasAnnouncementsTab && tab === 'announcements') setTab('notifications');
  }, [hasAnnouncementsTab, tab, setTab]);

  // Prefer All when opening with nothing unread, so older items are visible immediately.
  useEffect(() => {
    if (!isOpen || !uid) return;
    const hasUnreadNotifications = notifications.some(
      (n) => n.type !== 'announcement' && !(n.readBy || []).includes(uid),
    );
    const hasUnreadCellAnnouncements =
      activeApp === 'cell' &&
      notifications.some((n) => n.type === 'announcement' && !(n.readBy || []).includes(uid));
    const hasNdcpcUnread =
      isNdcpcAnnouncements &&
      (ndcpcAnnouncements ?? []).some(
        (item) => getFirestoreMillis(item.date) > announcementsLastReadAt,
      );
    setViewFilter(
      hasUnreadNotifications || hasUnreadCellAnnouncements || hasNdcpcUnread ? 'unread' : 'all',
    );
    // Intentionally only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setReactionOverrides({});
      return;
    }
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
  const unreadNdcpcAnnouncements = useMemo(() => {
    if (!isNdcpcAnnouncements) return [];
    return (ndcpcAnnouncements ?? []).filter(
      (item) => getFirestoreMillis(item.date) > announcementsLastReadAt,
    );
  }, [isNdcpcAnnouncements, ndcpcAnnouncements, announcementsLastReadAt]);
  const unreadGeneral = useMemo(
    () => liveGeneral.filter((n) => !(n.readBy || []).includes(uid)),
    [liveGeneral, uid],
  );

  const historyAnnouncements = useMemo(() => {
    const base = (history ?? notifications).filter((n) => n.type === 'announcement');
    const liveById = new Map(notifications.map((n) => [n.id, n]));
    return base
      .map((n) => {
        const live = liveById.get(n.id);
        if (!live) return n;
        return { ...n, reactions: live.reactions, readBy: live.readBy };
      })
      .sort(sortNewest);
  }, [history, notifications]);
  const historyGeneral = useMemo(() => {
    const base = (history ?? notifications).filter((n) => n.type !== 'announcement');
    const liveById = new Map(notifications.map((n) => [n.id, n]));
    return base
      .map((n) => {
        const live = liveById.get(n.id);
        if (!live) return n;
        return { ...n, reactions: live.reactions, readBy: live.readBy };
      })
      .sort(sortNewest);
  }, [history, notifications]);

  const applyReactionOverride = (n: AppNotification): AppNotification => {
    const override = reactionOverrides[n.id];
    return override ? { ...n, reactions: override } : n;
  };

  const shownAnnouncements =
    (viewFilter === 'unread' ? unreadAnnouncements : historyAnnouncements).map(applyReactionOverride);

  const shownNdcpcAnnouncements = useMemo(() => {
    const items = ndcpcAnnouncements ?? [];
    if (viewFilter === 'unread') return unreadNdcpcAnnouncements;
    return items;
  }, [ndcpcAnnouncements, unreadNdcpcAnnouncements, viewFilter]);

  const announcementUnreadCount = isNdcpcAnnouncements
    ? unreadNdcpcAnnouncements.length
    : unreadAnnouncements.length;

  const showActiveAnnouncementContent = isNdcpcAnnouncements
    ? shownNdcpcAnnouncements.length > 0
    : shownAnnouncements.length > 0;

  const formatNdcpcDate = (dateMs: number) => {
    if (!dateMs) return t.justNow;
    return formatAppDate(new Date(dateMs), 'MMMM d, yyyy', locale);
  };

  const shownGeneral =
    viewFilter === 'unread' ? unreadGeneral : historyGeneral;

  const showHistoryLoading = useDeferredLoading(
    viewFilter === 'all' && historyLoading && !history,
  );
  const showNdcpcLoading = useDeferredLoading(
    isNdcpcAnnouncements && ndcpcAnnouncementsLoading && !ndcpcAnnouncements,
  );

  // Drop local overrides once live/history data has caught up.
  useEffect(() => {
    setReactionOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        const server =
          notifications.find((n) => n.id === id)?.reactions ??
          history?.find((n) => n.id === id)?.reactions;
        if (reactionsMapsEqual(server, next[id])) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [notifications, history]);

  const showDismissAll =
    tab === 'announcements'
      ? announcementUnreadCount > 0
      : unreadGeneral.length > 0;

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (tab === 'announcements' && isNdcpcAnnouncements) markAnnouncementsRead();
    closeInbox();
    if (
      pathname === '/announcements' ||
      pathname === '/notifications' ||
      pathname === '/ndcpc/announcements'
    ) {
      if (pathname.startsWith('/ndcpc')) router.replace('/ndcpc');
      else router.replace('/');
    }
  };

  const openItem = (n: AppNotification) => {
    if (!n.relatedUrl) return;
    closeInbox();
    router.push(n.relatedUrl);
  };

  const handleToggleReaction = (notification: AppNotification, emoji: string) => {
    if (!uid) return;
    const base = reactionOverrides[notification.id] ?? notification.reactions;
    const nextReactions = toggleReactionMap(base, emoji, uid);
    setReactionOverrides((prev) => ({ ...prev, [notification.id]: nextReactions }));
    toggleReaction(notification.id, emoji, base);
  };

  const tabButton = (id: InboxTab, label: string, count: number, Icon: typeof Megaphone) => (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setTab(id)}
      className={cn(
        'flex h-auto flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium',
        tab === id
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4', tab === id && (id === 'announcements' ? 'text-chart-4' : 'text-primary'))} />
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
    </Button>
  );

  const filterButton = (id: ViewFilter, label: string) => (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setViewFilter(id)}
      className={cn(
        'h-auto rounded-md px-3 py-1.5 text-xs font-medium',
        viewFilter === id
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Button>
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
              {showDismissAll && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={() => {
                    if (tab === 'announcements') {
                      if (isNdcpcAnnouncements) {
                        markAnnouncementsRead();
                      } else {
                        for (const n of unreadAnnouncements) markAsRead(n.id);
                      }
                    } else {
                      markAllAsRead(unreadGeneral.map((n) => n.id));
                    }
                  }}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t.dismissAll}
                </Button>
              )}
              <IconButton
                type="button"
                variant="ghost"
                className="rounded-lg"
                onClick={() => handleOpenChange(false)}
                aria-label="Close inbox"
                icon={X}
              />
            </div>
          </div>
        </SheetHeader>

        {hasAnnouncementsTab ? (
          <div className="shrink-0 border-b border-border bg-muted/40 p-1.5">
            <div className="flex gap-1">
              {tabButton('announcements', t.announcements, announcementUnreadCount, Megaphone)}
              {tabButton('notifications', t.notifications, unreadGeneral.length, Bell)}
            </div>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
            {filterButton('unread', t.unread)}
            {filterButton('all', t.archive)}
          </div>
          {isNdcpcAnnouncements && isAdmin && tab === 'announcements' ? (
            <Button
              type="button"
              variant="subtle"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs"
              onClick={() => setIsCreateAnnouncementOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t.adminNewAnnouncement}
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {showHistoryLoading ? (
            <ListLoadingSkeleton rows={4} />
          ) : tab === 'announcements' && hasAnnouncementsTab ? (
            showNdcpcLoading ? (
              <ListLoadingSkeleton rows={4} />
            ) : !showActiveAnnouncementContent ? (
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
                  {isNdcpcAnnouncements
                    ? shownNdcpcAnnouncements.map((item) => (
                        <NdcpcAnnouncementCard
                          key={item.id}
                          item={item}
                          isUnread={getFirestoreMillis(item.date) > announcementsLastReadAt}
                          dateLabel={formatNdcpcDate(getFirestoreMillis(item.date))}
                        />
                      ))
                    : shownAnnouncements.map((n) => (
                        <InboxItemCard
                          key={n.id}
                          notification={n}
                          isRead={(n.readBy || []).includes(uid)}
                          uid={uid}
                          justNowLabel={t.justNow}
                          showReactions
                          accentClass="bg-chart-4"
                          onMarkRead={() => markAsRead(n.id)}
                          onToggleReaction={(emoji) => handleToggleReaction(n, emoji)}
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
      <Dialog
        open={isCreateAnnouncementOpen}
        onOpenChange={setIsCreateAnnouncementOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.adminNewAnnouncement}</DialogTitle>
          </DialogHeader>
          <AddAnnouncementForm onSuccess={() => setIsCreateAnnouncementOpen(false)} />
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
