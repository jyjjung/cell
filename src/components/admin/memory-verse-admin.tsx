
"use client";

import { useState } from 'react';
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

const memoryVerseSchema = z.object({
  reference: z.string().min(3, { message: "Verse reference must be at least 3 characters." }).max(100, {message: "Reference too long."}),
});

type MemoryVerseFormValues = z.infer<typeof memoryVerseSchema>;

export default function MemoryVerseAdmin() {
  const { memoryVerses, addMemoryVerse, addLordsPrayer, deleteMemoryVerse, loading } = useMemoryVerses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingLordsPrayer, setIsAddingLordsPrayer] = useState(false);

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

  const handleDeleteVerse = async (verseId: string, verseRef: string) => {
    try {
      await deleteMemoryVerse(verseId);
    } catch (error: any) {
      console.error("Error Deleting Verse", error);
    }
  };

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Add Verse</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddVerse)} className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-3 p-6 border rounded-lg">
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormLabel>New Verse Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John 3:16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-2 pt-4 md:pt-0">
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add
              </Button>
              <Button type="button" variant="outline" onClick={handleAddLordsPrayer} disabled={isAddingLordsPrayer || loading}>
                {isAddingLordsPrayer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookMarked className="mr-2 h-4 w-4" />}
                Lord's Prayer
              </Button>
            </div>
          </form>
        </Form>
      </section>
      
      <Separator />

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Current Verses</h2>
        {loading ? (
            <div className="h-40 flex items-center justify-center rounded-lg bg-muted/50 border-2 border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : memoryVerses.length === 0 ? (
          <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-40">
            <ListChecks className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold">No memory verses</h3>
            <p className="text-muted-foreground text-sm">Add a verse to get started.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[70%]">Reference</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {memoryVerses.map((verse) => (
                <TableRow key={verse.id}>
                    <TableCell className="font-medium">{verse.reference} {verse.isLordsPrayerChunk && <span className="text-xs text-muted-foreground">(LP)</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                    {verse.addedAt ? format(verse.addedAt.toDate(), 'dd/MM/yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="xs" aria-label="Delete verse">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will permanently delete the memory verse "{verse.reference}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVerse(verse.id, verse.reference)}>
                            Yes, delete verse
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
