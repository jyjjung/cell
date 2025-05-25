
"use client";

import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Loader2, LibraryBig, Info, BookOpenText, CheckSquare, Edit } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { CANONICAL_BIBLE_ORDER, BIBLE_BOOKS_DATA } from '@/lib/bible-data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


const markReadRangeSchema = z.object({
  fromBook: z.string().min(1, "Please select a 'From' book."),
  fromChapter: z.coerce.number().min(1, "'From' Chapter must be at least 1."),
  fromVerse: z.coerce.number().optional(),
  toBook: z.string().min(1, "Please select a 'To' book."),
  toChapter: z.coerce.number().min(1, "'To' Chapter must be at least 1."),
  toVerse: z.coerce.number().optional(),
});

type MarkReadRangeFormValues = z.infer<typeof markReadRangeSchema>;


export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markReadRange, loadingChecklist } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isMarkingRange, setIsMarkingRange] = useState(false);
  const [isRangeFormOpen, setIsRangeFormOpen] = useState(false);

  const markRangeForm = useForm<MarkReadRangeFormValues>({
    resolver: zodResolver(markReadRangeSchema),
    defaultValues: {
      fromBook: CANONICAL_BIBLE_ORDER[0],
      fromChapter: 1,
      toBook: CANONICAL_BIBLE_ORDER[0],
      toChapter: 1
    },
  });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);

  useEffect(() => {
    if (plan) {
      // console.log("[BibleChecklistPage] Received plan from useBiblePlan:", JSON.parse(JSON.stringify(plan)));
      let problematicPassages = 0;
      plan.dailyReadings?.forEach(day => {
        if (!day || !day.passages) return;
        day.passages.forEach(p => {
          if (!p || !p.displayText || p.displayText.trim() === "") {
            console.warn(`[BibleChecklistPage] Initial Check: Passage with problematic displayText found in plan for day ${day.date}:`, p ? JSON.parse(JSON.stringify(p)) : "Passage object null/undefined");
            problematicPassages++;
          }
        });
      });
      if (problematicPassages > 0) {
        console.warn(`[BibleChecklistPage] Initial Check: Found ${problematicPassages} passages with problematic displayText in the raw plan.`);
      }
    }
  }, [plan]);

  const totalPassagesInPlan = useMemo(() => {
    if (!plan?.dailyReadings) return 0;
    return plan.dailyReadings.reduce((acc, day) => {
        if (!day || !Array.isArray(day.passages)) return acc;
        const validDayPassages = day.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '');
        return acc + validDayPassages.length;
    }, 0);
  }, [plan]);
  

  const overallProgress = totalPassagesInPlan > 0 ? (completedPassages.length / totalPassagesInPlan) * 100 : 0;

  const handleMarkReadRange = async (data: MarkReadRangeFormValues) => {
    const fromBookMeta = BIBLE_BOOKS_DATA[data.fromBook];
    if (!fromBookMeta) {
        toast({ title: "Invalid 'From' Book", description: "Selected 'From' book is not recognized.", variant: "destructive" });
        return;
    }
    if (data.fromChapter > fromBookMeta.chapters) {
        markRangeForm.setError("fromChapter", { type: "manual", message: `Max chapter for ${data.fromBook} is ${fromBookMeta.chapters}.`});
        return;
    }

    const toBookMeta = BIBLE_BOOKS_DATA[data.toBook];
    if (!toBookMeta) {
        toast({ title: "Invalid 'To' Book", description: "Selected 'To' book is not recognized.", variant: "destructive" });
        return;
    }
    if (data.toChapter > toBookMeta.chapters) {
        markRangeForm.setError("toChapter", { type: "manual", message: `Max chapter for ${data.toBook} is ${toBookMeta.chapters}.`});
        return;
    }

    if (fromBookMeta.order > toBookMeta.order ||
        (fromBookMeta.order === toBookMeta.order && data.fromChapter > data.toChapter) ||
        (fromBookMeta.order === toBookMeta.order && data.fromChapter === data.toChapter && (data.fromVerse || 1) > (data.toVerse || 0))
    ) {
        toast({ title: "Invalid Range", description: "The 'From' point cannot be after the 'To' point.", variant: "destructive"});
        return;
    }

    setIsMarkingRange(true);
    try {
      const result = await markReadRange(
        data.fromBook, data.fromChapter, data.fromVerse,
        data.toBook, data.toChapter, data.toVerse
      );
      toast({ title: "Checklist Updated", description: `${result?.markedCount || 0} new passage(s) marked as read within the specified range.` });
      setIsRangeFormOpen(false); 
    } catch (error: any) {
      toast({ title: "Error Updating Checklist", description: error.message || "Could not mark passages as read.", variant: "destructive" });
    } finally {
      setIsMarkingRange(false);
    }
  };

  if (!isMounted || loadingAuth || (!loadingAuth && !currentUser && isMounted)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  if (planLoading || loadingChecklist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Bible plan and your checklist...</p>
      </div>
    );
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <LibraryBig className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-destructive" /><CardTitle className="text-xl">No Plan Available</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">No Bible reading plan has been set by the admin yet.</p></CardContent>
        </Card>
        <BackToTopButton />
      </div>
    );
  }
  
  const sortedDailyReadings = [...plan.dailyReadings].sort((a, b) => {
    try {
        if (!a || !b || !a.date || !b.date) return 0; // Defensive check
        return parseISO(a.date).getTime() - parseISO(b.date).getTime();
    } catch (e) {
        console.error("[BibleChecklistPage] Error parsing dates for sorting dailyReadings:", a?.date, b?.date, e);
        return 0;
    }
  });


  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div className="flex items-center space-x-2">
          <LibraryBig className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1>
        </div>
      </div>

      {totalPassagesInPlan > 0 && (
        <Card className="mb-3 shadow-sm">
          <CardHeader className="p-2.5">
            <CardTitle className="text-base">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 pt-0">
            <Progress value={overallProgress} className="w-full h-2.5" />
            <p className="text-muted-foreground mt-1 text-center text-xs">
              {completedPassages.length} of {totalPassagesInPlan} passages completed ({overallProgress.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isRangeFormOpen} onOpenChange={setIsRangeFormOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full md:w-auto text-xs py-1.5 h-auto mb-3">
            <Edit className="mr-1.5 h-3 w-3" /> Mark Reading Range
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
              <DialogTitle className="text-xl">Mark Reading Range</DialogTitle>
              <DialogDescription>
                Mark all passages within the specified range (inclusive) as completed.
              </DialogDescription>
            </DialogHeader>
            <Form {...markRangeForm}>
              <form onSubmit={markRangeForm.handleSubmit(handleMarkReadRange)} className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <fieldset className="space-y-4 border p-4 rounded-md">
                    <legend className="text-xs font-medium px-1">From</legend>
                    <FormField control={markRangeForm.control} name="fromBook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Book</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="Select book" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-60">{CANONICAL_BIBLE_ORDER.map(bookName => (<SelectItem key={`from-${bookName}`} value={bookName} className="text-xs">{bookName}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <FormField control={markRangeForm.control} name="fromChapter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Chapter</FormLabel>
                          <FormControl><Input type="number" placeholder="Ch." {...field} className="text-xs" /></FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <FormField control={markRangeForm.control} name="fromVerse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Verse (Optional)</FormLabel>
                          <FormControl><Input type="number" placeholder="Verse" {...field} className="text-xs" /></FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                  </fieldset>

                  <fieldset className="space-y-4 border p-4 rounded-md">
                    <legend className="text-xs font-medium px-1">To</legend>
                    <FormField control={markRangeForm.control} name="toBook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Book</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="Select book" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-60">{CANONICAL_BIBLE_ORDER.map(bookName => (<SelectItem key={`to-${bookName}`} value={bookName} className="text-xs">{bookName}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <FormField control={markRangeForm.control} name="toChapter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Chapter</FormLabel>
                          <FormControl><Input type="number" placeholder="Ch." {...field} className="text-xs" /></FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <FormField control={markRangeForm.control} name="toVerse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Verse (Optional)</FormLabel>
                          <FormControl><Input type="number" placeholder="Verse" {...field} className="text-xs" /></FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                  </fieldset>
                </div>
                <FormDescription className="text-xs px-1">
                  If a verse is not specified for "From", it assumes the beginning of the chapter.
                  If a verse is not specified for "To", it assumes the end of the chapter.
                </FormDescription>
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" size="sm">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isMarkingRange} size="sm">
                    {isMarkingRange ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="mr-2 h-3.5 w-3.5" />}
                    {isMarkingRange ? 'Updating...' : 'Mark Range as Read'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      <div className="space-y-2.5">
        {sortedDailyReadings.map((dailyReading, dayIndex) => {
          if (!dailyReading || !dailyReading.date) {
            console.warn(`[BibleChecklistPage] RENDERING: Invalid dailyReading object at index ${dayIndex}:`, dailyReading);
            return null;
          }
          const dateKey = dailyReading.originalDateKey || dailyReading.date;

          return (
            <Card key={dateKey} className="bg-card/80 text-card-foreground rounded shadow-xs hover:shadow-sm transition-shadow p-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <BookOpenText className="text-muted-foreground h-3 w-3" />
                  <h3 className="text-xs font-medium">
                    {dailyReading.date ? format(parseISO(dailyReading.date), "EEE, MMM d") : "Invalid Date"}
                  </h3>
                </div>
              </div>
              
              {(dailyReading.passages && dailyReading.passages.length > 0) ? (
                <ul className="space-y-1 pl-0.5">
                  {dailyReading.passages.map((passage, pIndex) => {
                    if (!passage) {
                       console.warn(`[BibleChecklistPage] RENDERING LOOP: Passage object is null/undefined. Day: ${dateKey}, Day Index: ${dayIndex}, Passage Index: ${pIndex}`);
                       return (
                         <li key={`error-passage-${dayIndex}-${pIndex}`} className="text-destructive font-semibold p-1.5 text-xs">
                           Error: Corrupt passage data for this slot.
                         </li>
                       );
                    }
                    // console.log(`[BibleChecklistPage] RENDERING PASSAGE for Day ${dateKey} (idx ${pIndex}): `, JSON.parse(JSON.stringify(passage)));

                    const currentPassageDisplayText = (typeof passage.displayText === 'string') ? passage.displayText.trim() : '';
                    const isPassageValid = currentPassageDisplayText !== '';
                    
                    if (!isPassageValid) {
                      console.warn(`[BibleChecklistPage] RENDERING: displayText is invalid for passage on day ${dateKey}. Passage:`, JSON.parse(JSON.stringify(passage)), `Evaluated displayText: "${currentPassageDisplayText}"`);
                    }

                    const bookIdPart = (typeof passage.book === 'string' && passage.book.trim() !== '') ? passage.book.trim().replace(/\s+/g, '-') : `unknown-book-${pIndex}`;
                    const chapterIdPart = (passage.chapter !== undefined && (typeof passage.chapter === 'number' || (typeof passage.chapter === 'string' && String(passage.chapter).trim() !== ''))) ? String(passage.chapter) : `unknown-chapter-${pIndex}`;
                    const checkboxId = `passage-${dateKey}-${bookIdPart}-${chapterIdPart}-${pIndex}`;
                    
                    const isChecked = isPassageValid && completedPassages.includes(currentPassageDisplayText);

                    return (
                      <li key={checkboxId} className="bg-background/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40 p-1.5 text-xs">
                        <Checkbox 
                          id={checkboxId} 
                          checked={isChecked} 
                          onCheckedChange={() => {
                            if (isPassageValid) {
                              togglePassageCompletion(currentPassageDisplayText);
                            } else {
                              toast({title: "Invalid Passage Data", description: "Cannot toggle completion for this passage due to missing text.", variant: "destructive"});
                            }
                          }}
                          aria-label={`Mark ${isPassageValid ? currentPassageDisplayText : 'invalid passage'} as read`} 
                          className="h-3.5 w-3.5"
                          disabled={!isPassageValid}
                        />
                        <Label htmlFor={checkboxId} className={cn("flex-grow cursor-pointer", isChecked ? 'line-through text-muted-foreground' : '', !isPassageValid && 'text-destructive font-semibold italic')}>
                           {isPassageValid ? currentPassageDisplayText : "Error: Passage Data Invalid"}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              ) : (<p className="text-muted-foreground text-xs pl-0.5">No passages assigned for this day.</p>)}
              {dayIndex < sortedDailyReadings.length - 1 && <Separator className="mt-2" />}
            </Card>
          );
        })}
      </div>
      <BackToTopButton />
    </div>
  );
}
