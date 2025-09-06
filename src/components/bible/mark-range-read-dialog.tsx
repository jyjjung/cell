
"use client";

import { useState } from 'react';
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

const markRangeSchema = z.object({
  startRef: z.string().min(3, { message: "Starting reference is required." }),
  endRef: z.string().optional(),
});

type MarkRangeFormValues = z.infer<typeof markRangeSchema>;

interface MarkRangeReadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Simple parser for "Book Chapter" or "Book Chapter:Verse"
const parseRef = (ref: string) => {
  const match = ref.trim().match(/^([1-3]?\s?[A-Za-z\s]+?)\s*(\d+)(?::(\d+))?$/);
  if (!match) return null;
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verse: match[3] ? parseInt(match[3], 10) : undefined
  };
};

export default function MarkRangeReadDialog({ isOpen, onOpenChange }: MarkRangeReadDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { markReadRange } = useUserBibleChecklist();

  const form = useForm<MarkRangeFormValues>({
    resolver: zodResolver(markRangeSchema),
    defaultValues: {
      startRef: '',
      endRef: '',
    },
  });

  async function onSubmit(data: MarkRangeFormValues) {
    setIsLoading(true);
    try {
      const startParsed = parseRef(data.startRef);
      const endParsed = data.endRef ? parseRef(data.endRef) : null;

      if (!startParsed) {
        toast({ title: "Invalid Format", description: "Could not parse the starting reference. Use format 'Book Chapter' or 'Book Chapter:Verse'.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (data.endRef && !endParsed) {
          toast({ title: "Invalid Format", description: "Could not parse the ending reference. Leave it blank or use format 'Book Chapter' or 'Book Chapter:Verse'.", variant: "destructive" });
          setIsLoading(false);
          return;
      }
      
      const { markedCount } = await markReadRange(
          startParsed.book,
          startParsed.chapter,
          startParsed.verse,
          endParsed?.book,
          endParsed?.chapter,
          endParsed?.verse
      );
      
      toast({
        title: "Range Marked as Read",
        description: `${markedCount} new passage(s) within your specified range have been marked as complete.`,
      });

      form.reset();
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="startRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting From</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Genesis 1" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">e.g., Genesis 1 or Exodus 12:20</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Up To (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Genesis 5" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Leave blank to mark only the starting chapter/passage.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
    
