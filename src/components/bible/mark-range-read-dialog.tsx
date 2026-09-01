'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BookUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
import { translations } from '@/lib/translations';

const markRangeSchema = z.object({
  startBook: z.string().min(1),
  startChapterVerse: z.string().optional(),
  endBook: z.string().optional(),
  endChapterVerse: z.string().optional(),
});

type MarkRangeFormValues = z.infer<typeof markRangeSchema>;

interface MarkRangeReadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lang: string;
}

function parseChapterVerse(cv: string, invalidMessage: string) {
  if (!cv || cv.trim() === '') return { chapter: 1, verse: undefined as number | undefined };
  const match = cv.trim().match(/^(\d+)(?::(\d+))?$/);
  if (!match) return { error: invalidMessage };
  return {
    chapter: parseInt(match[1], 10),
    verse: match[2] ? parseInt(match[2], 10) : undefined,
  };
}

export default function MarkRangeReadDialog({ isOpen, onOpenChange, lang }: MarkRangeReadDialogProps) {
  const t = translations[lang === 'ko' ? 'ko' : 'en'];
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { markReadRange } = useUserBibleChecklist();

  const form = useForm<MarkRangeFormValues>({
    resolver: zodResolver(markRangeSchema),
    defaultValues: {
      startBook: '',
      startChapterVerse: '',
      endBook: '',
      endChapterVerse: '',
    },
  });

  const startBookValue = form.watch('startBook');

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        startBook: '',
        startChapterVerse: '',
        endBook: '',
        endChapterVerse: '',
      });
    }
  }, [isOpen, form]);

  async function onSubmit(data: MarkRangeFormValues) {
    setIsLoading(true);
    try {
      const startCV = parseChapterVerse(data.startChapterVerse || '1', t.markRangeInvalidChapter);
      if ('error' in startCV) {
        form.setError('startChapterVerse', { message: startCV.error });
        return;
      }

      let endCV: { chapter: number; verse?: number } | null = null;
      if (data.endChapterVerse?.trim()) {
        const parsed = parseChapterVerse(data.endChapterVerse, t.markRangeInvalidChapter);
        if ('error' in parsed) {
          form.setError('endChapterVerse', { message: parsed.error });
          return;
        }
        endCV = parsed;
      }

      const result = await markReadRange(
        data.startBook,
        startCV.chapter,
        startCV.verse,
        data.endBook || undefined,
        endCV?.chapter,
        endCV?.verse,
      );

      if (!result?.markedCount) {
        toast({ title: t.markRangeNoPassages });
        return;
      }

      toast({
        title: t.markRangeMarkedCount.replace('{count}', String(result.markedCount)),
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking range as read:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookUp className="h-5 w-5" aria-hidden />
            {t.markRangeTitle}
          </DialogTitle>
          <DialogDescription>{t.markRangeDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-micro-label font-medium text-foreground">{t.markRangeStart}</p>
            <FormField id="mark-range-start-book" label={t.markRangeBook} required>
              <Select
                value={startBookValue || undefined}
                onValueChange={(value) => form.setValue('startBook', value, { shouldValidate: true })}
                disabled={isLoading}
              >
                <SelectTrigger id="mark-range-start-book" aria-label={t.markRangeSelectBook}>
                  <SelectValue placeholder={t.markRangeSelectBook} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CANONICAL_BIBLE_ORDER.map((book) => (
                    <SelectItem key={book} value={book}>
                      {book}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              id="mark-range-start-chapter"
              label={t.markRangeChapter}
              description={t.markRangeChapterHint}
              error={form.formState.errors.startChapterVerse?.message}
            >
              <Input
                placeholder="1"
                disabled={isLoading}
                aria-invalid={!!form.formState.errors.startChapterVerse}
                {...form.register('startChapterVerse')}
              />
            </FormField>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 p-3">
            <p className="text-micro-label font-medium text-foreground">{t.markRangeEnd}</p>
            <p className="text-sm text-muted-foreground">{t.markRangeEndOptional}</p>
            <FormField id="mark-range-end-book" label={t.markRangeBook}>
              <Select
                value={form.watch('endBook') || undefined}
                onValueChange={(value) => form.setValue('endBook', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="mark-range-end-book" aria-label={t.markRangeSelectBook}>
                  <SelectValue placeholder={t.markRangeSelectBook} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CANONICAL_BIBLE_ORDER.map((book) => (
                    <SelectItem key={book} value={book}>
                      {book}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              id="mark-range-end-chapter"
              label={t.markRangeChapter}
              description={t.markRangeChapterHint}
              error={form.formState.errors.endChapterVerse?.message}
            >
              <Input
                placeholder="1"
                disabled={isLoading}
                aria-invalid={!!form.formState.errors.endChapterVerse}
                {...form.register('endChapterVerse')}
              />
            </FormField>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isLoading || !startBookValue}>
              {isLoading ? <ButtonSpinner className="mr-2" /> : null}
              {t.markAsRead}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
