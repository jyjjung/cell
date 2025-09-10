
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookUp } from 'lucide-react';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { Autocomplete, type AutocompleteOption } from '@/components/ui/autocomplete';
import { CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';

const markRangeSchema = z.object({
  startBook: z.string().min(1, { message: "Please select a starting book." }),
  startChapterVerse: z.string().optional(),
  endBook: z.string().optional(),
  endChapterVerse: z.string().optional(),
});

type MarkRangeFormValues = z.infer<typeof markRangeSchema>;

interface MarkRangeReadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const bibleBookOptions: AutocompleteOption[] = CANONICAL_BIBLE_ORDER.map(book => ({
  value: book,
  label: book,
}));

// Simple parser for "Chapter:Verse" or "Chapter"
const parseChapterVerse = (cv: string) => {
  if (!cv || cv.trim() === '') return { chapter: 1, verse: undefined }; // Default to chapter 1 if empty
  const match = cv.trim().match(/^(\d+)(?::(\d+))?$/);
  if (!match) return null;
  return {
    chapter: parseInt(match[1], 10),
    verse: match[2] ? parseInt(match[2], 10) : undefined
  };
};

export default function MarkRangeReadDialog({ isOpen, onOpenChange }: MarkRangeReadDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
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
    // When the dialog is closed, reset the form
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
      const startCV = parseChapterVerse(data.startChapterVerse || '1');
      if (!startCV) {
        toast({ title: "Invalid Format", description: "Could not parse the starting chapter/verse. Use 'Chapter' or 'Chapter:Verse'.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      let endCV = null;
      if (data.endChapterVerse) {
        endCV = parseChapterVerse(data.endChapterVerse);
        if (!endCV) {
            toast({ title: "Invalid Format", description: "Could not parse the ending chapter/verse. Use 'Chapter' or 'Chapter:Verse'.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
      }

      const { markedCount } = await markReadRange(
          data.startBook,
          startCV.chapter,
          startCV.verse,
          data.endBook || undefined,
          endCV?.chapter,
          endCV?.verse
      );
      
      toast({
        title: "Range Marked as Read",
        description: `${markedCount} new passage(s) within your specified range have been marked as complete.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error marking range as read:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while marking the range.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center"><BookUp className="mr-2 h-5 w-5"/> Mark Range as Read</DialogTitle>
          <DialogDescription>
            Quickly mark a range of scripture as complete. Any passages from your plan within this range will be checked off.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            
            <FormField
              control={form.control}
              name="startBook"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Starting Book</FormLabel>
                  <Autocomplete
                      options={bibleBookOptions}
                      value={field.value}
                      onChange={field.onChange}
                      label="Select a book"
                      disabled={isLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="startChapterVerse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Chapter & Verse</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1 or 1:15" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endBook"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ending Book (Optional)</FormLabel>
                  <Autocomplete
                    options={bibleBookOptions}
                    value={field.value || ''}
                    onChange={(value) => field.onChange(value || startBookValue)} 
                    label="Select a book"
                    disabled={isLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endChapterVerse"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>Ending Chapter & Verse</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 5 or 5:10" {...field} disabled={isLoading}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark as Read
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
