
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, BookMarked, Loader2, ListChecks } from 'lucide-react';
import { format } from 'date-fns';

const memoryVerseSchema = z.object({
  reference: z.string().min(3, { message: "Verse reference must be at least 3 characters." }).max(100, {message: "Reference too long."}),
});

type MemoryVerseFormValues = z.infer<typeof memoryVerseSchema>;

export default function MemoryVerseAdmin() {
  const { memoryVerses, addMemoryVerse, addLordsPrayer, deleteMemoryVerse, loading } = useMemoryVerses();
  const { toast } = useToast();
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
      toast({ title: "Verse Added", description: `"${data.reference}" has been added.` });
      form.reset();
    } catch (error: any) {
      toast({ title: "Error Adding Verse", description: error.message || "Could not add verse.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLordsPrayer = async () => {
    setIsAddingLordsPrayer(true);
    try {
      const result = await addLordsPrayer();
      toast({ title: "Lord's Prayer", description: `${result.addedCount} verse(s) of The Lord's Prayer added.` });
    } catch (error: any) {
      toast({ title: "Error Adding Lord's Prayer", description: error.message || "Could not add The Lord's Prayer.", variant: "destructive" });
    } finally {
      setIsAddingLordsPrayer(false);
    }
  };

  const handleDeleteVerse = async (verseId: string, verseRef: string) => {
    try {
      await deleteMemoryVerse(verseId);
      toast({ title: "Verse Deleted", description: `"${verseRef}" has been deleted.` });
    } catch (error: any) {
      toast({ title: "Error Deleting Verse", description: error.message || "Could not delete verse.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAddVerse)} className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-3">
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormLabel>New Memory Verse Reference</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., John 3:16 or Psalm 23:1-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex space-x-2">
            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Verse
            </Button>
            <Button type="button" variant="outline" onClick={handleAddLordsPrayer} disabled={isAddingLordsPrayer || loading}>
              {isAddingLordsPrayer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookMarked className="mr-2 h-4 w-4" />}
              Add Lord's Prayer
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Current Memory Verses</h3>
        {loading ? (
          <div className="flex items-center justify-center p-6"><Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />Loading verses...</div>
        ) : memoryVerses.length === 0 ? (
          <div className="p-6 text-center border rounded-md">
            <ListChecks className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No memory verses added yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] border rounded-md">
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
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
