'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Edit, Trash2 } from 'lucide-react';
import type { PrayerTopic } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ndcpc/EmptyState';
import { DATA_CACHE_KEYS } from '@/lib/ndcpc/data-cache';
import { ContentFlow, FlowItem } from '@/components/ndcpc/ContentFlow';
import { PrayerTopicForm } from '@/components/ndcpc/PrayerTopicForm';

function TopicActions({
  topic,
  onEdit,
  onDelete,
}: {
  topic: PrayerTopic;
  onEdit: (topic: PrayerTopic) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(topic)}
      >
        <Edit className="h-3.5 w-3.5" />
        <span className="sr-only">{t('common.edit')}</span>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">{t('common.delete')}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('announcements.deleteConfirm')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(topic.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PrayerTopicList() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [editingTopic, setEditingTopic] = useState<PrayerTopic | null>(null);

  const topicsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.prayerTopics), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: topics, isLoading } = useCollection<PrayerTopic>(topicsQuery, {
    cacheKey: DATA_CACHE_KEYS.prayerTopics,
  });

  const handleDelete = async (topicId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, NDCPc_COLLECTIONS.prayerTopics, topicId));
      toast({ title: t('toast.deleted') });
    } catch (error) {
      console.error('Error deleting prayer topic: ', error);
      toast({ variant: 'destructive', title: t('toast.couldntDelete') });
    }
  };

  if (isLoading) {
    return <LoadingState isLoading delayMs={0} variant="skeleton" skeletonRows={4} />;
  }

  if (!topics || topics.length === 0) {
    return <EmptyState message={t('common.empty')} />;
  }

  const [current, ...previous] = topics;

  return (
    <>
      <section className="mb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('prayer.thisWeek')}
            </p>
            <p className="font-headline text-2xl leading-snug sm:text-3xl">{current.topic}</p>
            <p className="text-sm text-muted-foreground">
              {current.date?.seconds
                ? formatAppDate(new Date(current.date.seconds * 1000), 'MMMM d, yyyy', locale)
                : t('prayer.justPosted')}
            </p>
          </div>
          <TopicActions topic={current} onEdit={setEditingTopic} onDelete={handleDelete} />
        </div>
      </section>

      {previous.length > 0 && (
        <section className="mt-10">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('prayer.earlier')}
          </p>
          <ContentFlow>
            {previous.map((topic) => (
              <FlowItem key={topic.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="text-base leading-relaxed">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic.date?.seconds
                        ? formatAppDate(new Date(topic.date.seconds * 1000), 'MMMM d, yyyy', locale)
                        : '—'}
                    </p>
                  </div>
                  <TopicActions topic={topic} onEdit={setEditingTopic} onDelete={handleDelete} />
                </div>
              </FlowItem>
            ))}
          </ContentFlow>
        </section>
      )}

      <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          {editingTopic && (
            <PrayerTopicForm
              key={editingTopic.id}
              prayerTopic={editingTopic}
              onSuccess={() => setEditingTopic(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
