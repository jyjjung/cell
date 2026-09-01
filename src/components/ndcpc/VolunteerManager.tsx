'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Volunteer } from '@/types/ndcpc-ported';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { IconButton } from '@/components/ui/icon-button';
import { Trash2 } from 'lucide-react';
import { VolunteerForm } from '@/components/ndcpc/VolunteerForm';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/page-layout';
import { ContentFlow, FlowItem } from '@/components/ndcpc/ContentFlow';
import { useTranslation } from '@/context/LocaleProvider';

export function VolunteerManager() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const volunteersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.volunteers), orderBy('name'));
  }, [firestore]);

  const { data: volunteers, isLoading } = useCollection<Volunteer>(volunteersQuery);

  const handleDelete = async (volunteer: Volunteer) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, NDCPc_COLLECTIONS.volunteers, volunteer.id));
  };

  return (
    <div className="space-y-6">
      <VolunteerForm />
      {isLoading ? (
        <LoadingState isLoading delayMs={0} variant="skeleton" skeletonRows={4} />
      ) : (
        <ScrollArea className="h-64">
          {volunteers && volunteers.length > 0 ? (
            <ContentFlow>
              {volunteers.map((v) => (
                <FlowItem key={v.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">{v.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <IconButton
                          aria-label={t('common.remove')}
                          icon={Trash2}
                          className="text-muted-foreground hover:text-destructive"
                        />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('volunteers.removeConfirm', { name: v.name })}
                          </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(v)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {t('common.remove')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </FlowItem>
              ))}
            </ContentFlow>
          ) : (
            <EmptyState title={t('volunteers.empty')} />
          )}
        </ScrollArea>
      )}
    </div>
  );
}
