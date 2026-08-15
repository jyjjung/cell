'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Volunteer } from '@/types/ndcpc-ported';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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
import { LoadingState } from '@/components/ndcpc/LoadingState';
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
        <LoadingState />
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('volunteers.empty')}
            </p>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
