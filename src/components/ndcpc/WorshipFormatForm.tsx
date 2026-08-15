'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { WorshipFormat } from '@/types/ndcpc-ported';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  WEEKLY_WORSHIP_FORMAT_ID,
  formatWorshipFormatLabel,
  resolveServiceSteps,
} from '@/lib/ndcpc/worship-format';
import { useTranslation } from '@/context/LocaleProvider';

interface WorshipFormatFormProps {
  worshipFormat?: WorshipFormat | null;
  onSuccess: () => void;
}

export function WorshipFormatForm({ worshipFormat, onSuccess }: WorshipFormatFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isEditing = !!worshipFormat;

  const [items, setItems] = useState(() => resolveServiceSteps(worshipFormat?.items));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateItemTime = (
    index: number,
    field: 'timeFrom' | 'timeTo',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!firestore) {
      toast({ variant: 'destructive', title: t('common.offline') });
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanedItems = items.map(({ id, timeFrom, timeTo, roles }) => ({
        id,
        ...(timeFrom ? { timeFrom } : {}),
        ...(timeTo ? { timeTo } : {}),
        ...(roles?.length ? { roles } : {}),
      }));

      await setDoc(doc(firestore, NDCPc_COLLECTIONS.worshipFormats, WEEKLY_WORSHIP_FORMAT_ID), {
        items: cleanedItems,
        updatedAt: Timestamp.now(),
      });
      toast({ title: t('common.saved') });
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntSave') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
        <div className="space-y-6 pr-3">
          <p className="text-sm text-muted-foreground">{t('worshipFormat.recurring')}</p>

          <ol className="divide-y divide-border/40 rounded-md border border-border/40">
            {items.map((item, index) => (
              <li key={item.id} className="space-y-2 px-2 py-3 text-sm">
                <p className="font-medium">{formatWorshipFormatLabel(item, t)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label
                      htmlFor={`time-from-${item.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      {t('worshipFormat.timeFrom')}
                    </label>
                    <Input
                      id={`time-from-${item.id}`}
                      type="time"
                      value={item.timeFrom ?? ''}
                      onChange={(e) => updateItemTime(index, 'timeFrom', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`time-to-${item.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      {t('worshipFormat.timeTo')}
                    </label>
                    <Input
                      id={`time-to-${item.id}`}
                      type="time"
                      value={item.timeTo ?? ''}
                      onChange={(e) => updateItemTime(index, 'timeTo', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Button type="submit" className="mt-4 w-full shrink-0" disabled={isSubmitting}>
        {isSubmitting
          ? t('common.saving')
          : isEditing
            ? t('common.save')
            : t('common.create')}
      </Button>
    </form>
  );
}
