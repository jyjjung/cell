'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useAdmin } from '@/context/AuthProvider';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { WorshipFormat } from '@/types/ndcpc-ported';
import { doc } from 'firebase/firestore';
import { useTranslation } from '@/context/LocaleProvider';
import { WEEKLY_WORSHIP_FORMAT_ID, resolveServiceSteps } from '@/lib/ndcpc/worship-format';
import { LoadingState } from '@/components/ndcpc/LoadingState';
import { WorshipFormatForm } from '@/components/ndcpc/WorshipFormatForm';
import { WorshipFormatList } from '@/components/ndcpc/WorshipFormatList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WorshipFormatManagerProps {
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}

export function WorshipFormatManager({ editOpen, onEditOpenChange }: WorshipFormatManagerProps) {
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const weeklyFormatRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, NDCPc_COLLECTIONS.worshipFormats, WEEKLY_WORSHIP_FORMAT_ID);
  }, [firestore]);

  const { data: weeklyFormat, isLoading } = useDoc<WorshipFormat>(weeklyFormatRef);

  const closeForm = () => {
    onEditOpenChange(false);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  const serviceSteps = resolveServiceSteps(weeklyFormat?.items);

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('worshipFormat.recurring')}</p>
        <WorshipFormatList items={serviceSteps} />
      </div>

      {isAdmin && (
        <Dialog open={editOpen} onOpenChange={(open) => !open && closeForm()}>
          <DialogContent className="flex max-h-[min(90vh,720px)] flex-col sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('worshipFormat.edit')}</DialogTitle>
            </DialogHeader>
            <WorshipFormatForm
              key={weeklyFormat?.updatedAt?.seconds ?? 'default'}
              worshipFormat={weeklyFormat}
              onSuccess={closeForm}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function useWeeklyWorshipFormat() {
  const firestore = useFirestore();

  const weeklyFormatRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, NDCPc_COLLECTIONS.worshipFormats, WEEKLY_WORSHIP_FORMAT_ID);
  }, [firestore]);

  return useDoc<WorshipFormat>(weeklyFormatRef);
}
