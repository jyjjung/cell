'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField, formFieldControlProps } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { getPlanDayPassageKeys, getSortedPlanDays } from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import type { DailyReading } from '@/types';

interface MarkDaysReadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  dailyReadings: DailyReading[];
}

function buildSchema(maxDay: number) {
  return z
    .object({
      fromDay: z.coerce.number().int().min(1).max(maxDay),
      toDay: z.coerce.number().int().min(1).max(maxDay),
    })
    .refine((data) => data.toDay >= data.fromDay, {
      message: 'invalid-range',
      path: ['toDay'],
    });
}

export default function MarkDaysReadDialog({
  isOpen,
  onOpenChange,
  lang,
  dailyReadings,
}: MarkDaysReadDialogProps) {
  const t = translations[lang === 'ko' ? 'ko' : 'en'];
  const { toast } = useToast();
  const { markMultiplePassages } = useUserBibleChecklist();
  const [isLoading, setIsLoading] = useState(false);

  const sortedDays = useMemo(() => getSortedPlanDays(dailyReadings), [dailyReadings]);
  const maxDay = sortedDays.length;

  const schema = useMemo(() => buildSchema(Math.max(maxDay, 1)), [maxDay]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fromDay: 1, toDay: maxDay || 1 },
  });

  const fromDay = form.watch('fromDay');
  const toDay = form.watch('toDay');

  const previewKeys = useMemo(() => {
    if (!fromDay || !toDay || fromDay > toDay) return [];
    return getPlanDayPassageKeys(dailyReadings, fromDay, toDay);
  }, [dailyReadings, fromDay, toDay]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({ fromDay: 1, toDay: maxDay || 1 });
      return;
    }
    form.reset({ fromDay: 1, toDay: maxDay || 1 });
  }, [isOpen, maxDay, form]);

  async function onSubmit(data: z.infer<typeof schema>) {
    setIsLoading(true);
    try {
      const keys = getPlanDayPassageKeys(dailyReadings, data.fromDay, data.toDay);
      if (keys.length === 0) {
        toast({ title: t.markDaysNoPassages });
        return;
      }
      await markMultiplePassages(keys, true);
      toast({
        title: t.markDaysMarkedCount.replace('{count}', String(keys.length)),
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking plan days as read:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const toDayError = form.formState.errors.toDay?.message;
  const rangeError =
    toDayError === 'invalid-range' ? t.markDaysInvalidRange : toDayError ? String(toDayError) : undefined;

  const previewFrom = Math.min(fromDay || 1, toDay || 1);
  const previewTo = Math.max(fromDay || 1, toDay || 1);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" aria-hidden />
            {t.markDaysTitle}
          </DialogTitle>
          <DialogDescription>{t.markDaysDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="mark-days-from"
              label={t.markDaysFrom}
              error={form.formState.errors.fromDay?.message as string | undefined}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxDay}
                disabled={isLoading || maxDay === 0}
                {...formFieldControlProps(
                  'mark-days-from',
                  form.formState.errors.fromDay?.message as string | undefined,
                )}
                {...form.register('fromDay', { valueAsNumber: true })}
              />
            </FormField>

            <FormField id="mark-days-to" label={t.markDaysTo} error={rangeError}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxDay}
                disabled={isLoading || maxDay === 0}
                {...formFieldControlProps('mark-days-to', rangeError)}
                {...form.register('toDay', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          {maxDay > 0 && previewKeys.length > 0 && !rangeError ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground" role="status">
              {t.markDaysPreview
                .replace('{count}', String(previewKeys.length))
                .replace('{from}', String(previewFrom))
                .replace('{to}', String(previewTo))}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isLoading || maxDay === 0 || !!rangeError}>
              {isLoading ? <ButtonSpinner className="mr-2" /> : null}
              {t.markAsRead}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
