'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Edit, Trash2 } from 'lucide-react';
import type { Announcement } from '@/types/ndcpc-ported';
import { useAdmin } from '@/context/AuthProvider';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { IconButton } from '@/components/ui/icon-button';
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
import { AddAnnouncementForm } from '@/components/ndcpc/AddAnnouncementForm';
import { ContentFlow, FlowItem } from '@/components/ndcpc/ContentFlow';

export function AnnouncementList() {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.announcements), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection<Announcement>(
    announcementsQuery,
    { cacheKey: DATA_CACHE_KEYS.announcements }
  );

  const handleDelete = async (announcementId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, NDCPc_COLLECTIONS.announcements, announcementId));
      toast({ title: t('toast.deleted') });
    } catch (error) {
      console.error('Error deleting announcement: ', error);
      toast({ variant: 'destructive', title: t('toast.couldntDelete') });
    }
  };

  if (isLoading) {
    return <LoadingState isLoading delayMs={0} variant="skeleton" skeletonRows={4} />;
  }

  if (!announcements || announcements.length === 0) {
    return <EmptyState message={t('common.empty')} />;
  }

  return (
    <>
      <ContentFlow>
        {announcements.map((announcement) => (
          <FlowItem key={announcement.id}>
            <article>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="font-headline text-lg font-semibold leading-snug">
                    {announcement.title}
                  </h2>
                  <time className="text-xs text-muted-foreground">
                    {announcement.date?.seconds
                      ? formatAppDate(
                          new Date(announcement.date.seconds * 1000),
                          'MMMM d, yyyy',
                          locale
                        )
                      : t('announcements.justNow')}
                  </time>
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      aria-label={t('common.edit')}
                      icon={Edit}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingAnnouncement(announcement)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <IconButton
                          aria-label={t('common.delete')}
                          icon={Trash2}
                          className="text-muted-foreground hover:text-destructive"
                        />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('announcements.deleteConfirm')}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground/85">
                {announcement.content}
              </p>
            </article>
          </FlowItem>
        ))}
      </ContentFlow>

      <Dialog
        open={!!editingAnnouncement}
        onOpenChange={(open) => !open && setEditingAnnouncement(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          {editingAnnouncement && (
            <AddAnnouncementForm
              key={editingAnnouncement.id}
              announcement={editingAnnouncement}
              onSuccess={() => setEditingAnnouncement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
