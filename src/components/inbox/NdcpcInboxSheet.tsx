'use client';

import { AddAnnouncementForm } from '@/components/ndcpc/AddAnnouncementForm';
import { PrayerTopicForm } from '@/components/ndcpc/PrayerTopicForm';
import { EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAdmin } from '@/context/AuthProvider';
import { useAuth } from '@/contexts/auth-context';
import { useInbox, type InboxTab } from '@/contexts/inbox-context';
import { useNdcpcUnread } from '@/contexts/ndcpc-unread-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { getFirestoreMillis } from '@/lib/ndcpc/unread-counts';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { Announcement, PrayerTopic } from '@/types/ndcpc-ported';
import { collection, orderBy, query } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, Loader2, Megaphone, Plus, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ViewFilter = 'unread' | 'all';
type NdcpcInboxTab = Extract<InboxTab, 'announcements' | 'prayer'>;

function normalizeTab(tab: InboxTab): NdcpcInboxTab {
  return tab === 'prayer' ? 'prayer' : 'announcements';
}

function NdcpcInboxItem({
  title,
  body,
  dateMs,
  isUnread,
  accentClass,
  dateLabel,
}: {
  title: string;
  body?: string;
  dateMs: number;
  isUnread: boolean;
  accentClass: string;
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
        'flex flex-col gap-2 rounded-lg border border-border bg-transparent p-4 transition-colors',
        !isUnread && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
              isUnread ? accentClass : 'bg-muted-foreground/30',
            )}
          />
          <p
            className={cn(
              'min-w-0 text-base font-semibold leading-snug',
              isUnread ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {title}
          </p>
        </div>
        {dateMs > 0 ? (
          <p className="shrink-0 text-xs text-muted-foreground">{dateLabel}</p>
        ) : null}
      </div>
      {body ? (
        <p className="whitespace-pre-wrap pl-[18px] text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
    </motion.div>
  );
}

export function NdcpcInboxSheet() {
  const { currentUser } = useAuth();
  const { isAdmin } = useAdmin();
  const { isOpen, tab, setTab, closeInbox } = useInbox();
  const {
    announcementsUnread,
    prayerUnread,
    announcementsLastReadAt,
    prayerLastReadAt,
    markAnnouncementsRead,
    markPrayerRead,
  } = useNdcpcUnread();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const cellT = translations[currentUser?.preferredLanguage || 'en'];
  const activeTab = normalizeTab(tab);
  const uid = currentUser?.uid || '';

  const [viewFilter, setViewFilter] = useState<ViewFilter>('unread');
  const [createOpen, setCreateOpen] = useState(false);

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.announcements), orderBy('date', 'desc'));
  }, [firestore]);

  const prayerQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.prayerTopics), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: announcements, isLoading: announcementsLoading } =
    useCollection<Announcement>(announcementsQuery);
  const { data: prayerTopics, isLoading: prayerLoading } =
    useCollection<PrayerTopic>(prayerQuery);

  useEffect(() => {
    if (tab === 'notifications') setTab('prayer');
  }, [tab, setTab]);

  useEffect(() => {
    if (!isOpen || !uid) return;
    const hasUnread = announcementsUnread > 0 || prayerUnread > 0;
    setViewFilter(hasUnread ? 'unread' : 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const shownAnnouncements = useMemo(() => {
    const items = announcements ?? [];
    if (viewFilter === 'all') return items;
    return items.filter((item) => getFirestoreMillis(item.date) > announcementsLastReadAt);
  }, [announcements, viewFilter, announcementsLastReadAt]);

  const shownPrayerTopics = useMemo(() => {
    const items = prayerTopics ?? [];
    if (viewFilter === 'all') return items;
    return items.filter((item) => getFirestoreMillis(item.date) > prayerLastReadAt);
  }, [prayerTopics, viewFilter, prayerLastReadAt]);

  const markActiveTabRead = () => {
    if (activeTab === 'announcements') markAnnouncementsRead();
    if (activeTab === 'prayer') markPrayerRead();
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    markActiveTabRead();
    closeInbox();
    if (pathname === '/ndcpc/announcements' || pathname === '/ndcpc/prayer') {
      router.replace('/ndcpc');
    }
  };

  const selectTab = (id: NdcpcInboxTab) => {
    if (id !== activeTab) markActiveTabRead();
    setTab(id);
  };

  const tabButton = (
    id: NdcpcInboxTab,
    label: string,
    count: number,
    Icon: typeof Megaphone,
    activeIconClass: string,
    activeBadgeClass: string,
  ) => (
    <button
      type="button"
      onClick={() => selectTab(id)}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
        activeTab === id
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', activeTab === id && activeIconClass)} />
      {label}
      {count > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
            activeTab === id ? activeBadgeClass : 'bg-muted text-muted-foreground',
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

  const formatDate = (dateMs: number) => {
    if (!dateMs) return t('announcements.justNow');
    return formatAppDate(new Date(dateMs), 'MMMM d, yyyy', locale);
  };

  const isLoading = activeTab === 'announcements' ? announcementsLoading : prayerLoading;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-semibold">Inbox</SheetTitle>
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
        </SheetHeader>

        <div className="shrink-0 border-b border-border bg-muted/40 p-1.5">
          <div className="flex gap-1">
            {tabButton(
              'announcements',
              t('nav.announcements'),
              announcementsUnread,
              Megaphone,
              'text-chart-4',
              'bg-chart-4 text-primary-foreground',
            )}
            {tabButton(
              'prayer',
              t('nav.prayer'),
              prayerUnread,
              Heart,
              'text-primary',
              'bg-primary text-primary-foreground',
            )}
          </div>
        </div>

        <div className="shrink-0 border-b border-border px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
              {filterButton('unread', cellT.unread)}
              {filterButton('all', cellT.archive)}
            </div>
            {isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setCreateOpen(true)}
                aria-label={
                  activeTab === 'announcements' ? 'Add announcement' : 'Add prayer topic'
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === 'announcements' ? (
            shownAnnouncements.length === 0 ? (
              <EmptyState
                icon={viewFilter === 'unread' ? Check : Megaphone}
                title={viewFilter === 'unread' ? cellT.allCaughtUp : cellT.noAnnouncementsYet}
                description={
                  viewFilter === 'unread' ? cellT.noUnreadAnnouncements : cellT.checkBackAnnouncements
                }
              />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {shownAnnouncements.map((item) => {
                    const dateMs = getFirestoreMillis(item.date);
                    return (
                      <NdcpcInboxItem
                        key={item.id}
                        title={item.title}
                        body={item.content ?? item.body}
                        dateMs={dateMs}
                        isUnread={dateMs > announcementsLastReadAt}
                        accentClass="bg-chart-4"
                        dateLabel={formatDate(dateMs)}
                      />
                    );
                  })}
                </div>
              </AnimatePresence>
            )
          ) : shownPrayerTopics.length === 0 ? (
            <EmptyState
              icon={viewFilter === 'unread' ? Check : Heart}
              title={viewFilter === 'unread' ? cellT.allCaughtUp : t('common.empty')}
              description={viewFilter === 'unread' ? cellT.noUnreadNotifications : t('common.empty')}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {shownPrayerTopics.map((item) => {
                  const dateMs = getFirestoreMillis(item.date);
                  return (
                    <NdcpcInboxItem
                      key={item.id}
                      title={item.topic}
                      dateMs={dateMs}
                      isUnread={dateMs > prayerLastReadAt}
                      accentClass="bg-primary"
                      dateLabel={formatDate(dateMs)}
                    />
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'announcements' ? t('nav.announcements') : t('nav.prayer')}
              </DialogTitle>
            </DialogHeader>
            {activeTab === 'announcements' ? (
              <AddAnnouncementForm onSuccess={() => setCreateOpen(false)} />
            ) : (
              <PrayerTopicForm onSuccess={() => setCreateOpen(false)} />
            )}
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
