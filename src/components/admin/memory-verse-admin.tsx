
"use client";

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, BookMarked, Loader2, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { EmptyState } from '@/components/ui/page-layout';

function createMemoryVerseSchema(messages: { min: string; max: string }) {
  return z.object({
    reference: z.string().min(3, { message: messages.min }).max(100, { message: messages.max }),
  });
}

type MemoryVerseFormValues = z.infer<ReturnType<typeof createMemoryVerseSchema>>;

export default function MemoryVerseAdmin() {
  const { memoryVerses, addMemoryVerse, addLordsPrayer, deleteMemoryVerse, loading } = useMemoryVerses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingLordsPrayer, setIsAddingLordsPrayer] = useState(false);
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const memoryVerseSchema = useMemo(
    () =>
      createMemoryVerseSchema({
        min: t.adminValidationVerseRefMin,
        max: t.adminValidationVerseRefMax,
      }),
    [t.adminValidationVerseRefMin, t.adminValidationVerseRefMax],
  );

  const form = useForm<MemoryVerseFormValues>({
    resolver: zodResolver(memoryVerseSchema),
    defaultValues: {
      reference: '',
    },
  });

  const handleAddVerse = async (data: MemoryVerseFormValues) => {
    setIsSubmitting(true);
    try {
      await addMemoryVerse(data.reference);
      form.reset();
    } catch (error: any) {
      console.error("Error Adding Verse", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLordsPrayer = async () => {
    setIsAddingLordsPrayer(true);
    try {
      await addLordsPrayer();
    } catch (error: any) {
      console.error("Error Adding Lord's Prayer", error);
    } finally {
      setIsAddingLordsPrayer(false);
    }
  };

  const handleDeleteVerse = async (verseId: string) => {
    try {
      await deleteMemoryVerse(verseId);
    } catch (error: any) {
      console.error("Error Deleting Verse", error);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-section-title mb-3">{t.adminAddVerse}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddVerse)} className="widget-surface space-y-3 md:flex md:items-end md:gap-3 md:space-y-0">
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormLabel className="text-micro-label">Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="John 3:16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting || loading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {t.confirm}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLordsPrayer} disabled={isAddingLordsPrayer || loading}>
                {isAddingLordsPrayer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookMarked className="mr-2 h-4 w-4" />}
                Lord&apos;s Prayer
              </Button>
            </div>
          </form>
        </Form>
      </section>
      
      <Separator />

      <section>
        <h2 className="text-section-title mb-3">{t.adminCurrentVerses}</h2>
        {loading ? (
            <div className="empty-inline">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        ) : memoryVerses.length === 0 ? (
          <EmptyState icon={ListChecks} title={t.adminNoMemoryVerses} description={t.adminNoMemoryVersesHint} />
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
            <TableHeader>
                <TableRow>
                <TableHead className="w-[70%]">Reference</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">{t.adminActions}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {memoryVerses.map((verse) => (
                <TableRow key={verse.id}>
                    <TableCell className="font-medium">{verse.reference} {verse.isLordsPrayerChunk && <span className="text-micro-label">(LP)</span>}</TableCell>
                    <TableCell className="text-micro-label !opacity-100">
                    {verse.addedAt ? format(verse.addedAt.toDate(), 'dd/MM/yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8" aria-label={t.adminYesDelete}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-section-title">{t.adminDeleteVerse}</AlertDialogTitle>
                            <AlertDialogDescription>
                            {verse.reference} — {t.adminCannotUndo}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVerse(verse.id)}>
                            {t.adminYesDelete}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
