'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { Check, Heart, Plus } from 'lucide-react';import { useAdmin } from '@/context/AuthProvider';
import { useAuth } from '@/contexts/auth-context';
import { useNdcpcUnread } from '@/contexts/ndcpc-unread-context';
import { useTranslation } from '@/context/LocaleProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { getFirestoreMillis } from '@/lib/ndcpc/unread-counts';
import { translations } from '@/lib/translations';
import type { PrayerTopic } from '@/types/ndcpc-ported';
import { collection, orderBy, query } from 'firebase/firestore';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PrayerTopicForm } from '@/components/ndcpc/PrayerTopicForm';
import { cn } from '@/lib/utils';

type ViewFilter = 'unread' | 'all';

export function PrayerTopicsView() {
  const { currentUser } = useAuth();
  const { isAdmin } = useAdmin();
  const { prayerLastReadAt, markPrayerRead } = useNdcpcUnread();
  const firestore = useFirestore();
  const { t, locale } = useTranslation();
  const cellT = translations[currentUser?.preferredLanguage || 'en'];
  const [viewFilter, setViewFilter] = useState<ViewFilter>('unread');
  const [createOpen, setCreateOpen] = useState(false);

  const prayerQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.prayerTopics), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: prayerTopics, isLoading } = useCollection<PrayerTopic>(prayerQuery);

  useEffect(() => {
    markPrayerRead();
    // Mark preschool prayer topics read when opening the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownTopics = useMemo(() => {
    const items = prayerTopics ?? [];
    if (viewFilter === 'all') return items;
    return items.filter((item) => getFirestoreMillis(item.date) > prayerLastReadAt);
  }, [prayerTopics, viewFilter, prayerLastReadAt]);

  const formatDate = (dateMs: number) => {
    if (!dateMs) return t('announcements.justNow');
    return formatAppDate(new Date(dateMs), 'MMMM d, yyyy', locale);
  };

  return (
    <div className="page-container">
      <NavPageHeader
        title={t('nav.prayer')}
        action={
          isAdmin ? (
            <Button type="button" size="sm" className="rounded-xl" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('prayer.add')}
            </Button>
          ) : undefined
        }
      />

      <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
        {(['unread', 'all'] as const).map((id) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            onClick={() => setViewFilter(id)}
            className={cn(
              'h-auto min-h-11 rounded-md px-3 py-1.5 text-xs font-medium',
              viewFilter === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {id === 'unread' ? cellT.unread : cellT.archive}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <ListLoadingSkeleton rows={4} className="py-4" />
      ) : shownTopics.length === 0 ? (
        <EmptyState
          icon={viewFilter === 'unread' ? Check : Heart}
          title={viewFilter === 'unread' ? cellT.allCaughtUp : t('common.empty')}
          description={viewFilter === 'unread' ? cellT.noUnreadNotifications : t('common.empty')}
        />
      ) : (
        <div className="space-y-2">
          {shownTopics.map((item) => {
            const dateMs = getFirestoreMillis(item.date);
            const isUnread = dateMs > prayerLastReadAt;
            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border border-border p-4 transition-colors',
                  !isUnread && 'opacity-70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        isUnread ? 'bg-primary' : 'bg-muted-foreground/30',
                      )}
                    />
                    <p className="min-w-0 text-base font-semibold leading-snug text-foreground">
                      {item.topic}
                    </p>
                  </div>
                  {dateMs > 0 ? (
                    <p className="shrink-0 text-xs text-muted-foreground">{formatDate(dateMs)}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('nav.prayer')}</DialogTitle>
          </DialogHeader>
          <PrayerTopicForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
