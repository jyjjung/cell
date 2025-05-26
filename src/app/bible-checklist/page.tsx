
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isValid, getISOWeek, startOfWeek, endOfWeek } from 'date-fns';
import { Loader2, LibraryBig, Info, BookOpenText, CheckSquare, Edit, CheckCircle2, ChevronDown } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { CANONICAL_BIBLE_ORDER, BIBLE_BOOKS_DATA } from '@/lib/bible-data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const markReadRangeSchema = z.object({
  fromBook: z.string().min(1, "Please select a 'From' book."),
  fromChapter: z.coerce.number().min(1, "'From' Chapter must be at least 1."),
  fromVerse: z.coerce.number().optional(),
  toBook: z.string().min(1, "Please select a 'To' book."),
  toChapter: z.coerce.number().min(1, "'To' Chapter must be at least 1."),
  toVerse: z.coerce.number().optional(),
});

type MarkReadRangeFormValues = z.infer<typeof markReadRangeSchema>;

interface GroupedWeek {
  weekKey: string;
  weekLabel: string;
  days: DailyReading[];
  allPassagesInWeekObjects: StructuredPassage[];
  isCompleted: boolean;
}

export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markReadRange, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
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
  
  const groupReadingsByWeek = useCallback((dailyReadings: DailyReading[] | undefined): GroupedWeek[] => {
    if (!dailyReadings || dailyReadings.length === 0) return [];

    const weeksMap = new Map<string, { days: DailyReading[], allPassagesInWeekObjects: StructuredPassage[] }>();

    dailyReadings.forEach(reading => {
      if (!reading || !reading.date) return;
      try {
        const dateObj = parseISO(reading.date);
        if (!isValid(dateObj)) throw new Error("Invalid date");
        const weekNumber = getISOWeek(dateObj);
        const year = dateObj.getUTCFullYear();
        const weekKey = `${year}-W${weekNumber}`;

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, { days: [], allPassagesInWeekObjects: [] });
        }
        const weekData = weeksMap.get(weekKey)!;
        weekData.days.push({ ...reading, passages: reading.passages.map(p => ({ ...p })) });
        weekData.allPassagesInWeekObjects.push(...reading.passages.map(p => ({ ...p })));

      } catch (e) {
        console.error(`[BibleChecklistPage] Error processing reading for date ${reading.date} in groupReadingsByWeek:`, e);
      }
    });

    const groupedWeeks: GroupedWeek[] = [];
    weeksMap.forEach((data, weekKey) => {
      data.days.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()); // Sort days within week
      if (data.days.length > 0) {
        const firstDayOfWeek = parseISO(data.days[0].date);
        const weekLabel = `Week of ${format(firstDayOfWeek, "MMM d, yyyy")} (W${getISOWeek(firstDayOfWeek)})`;
        const isCompleted = data.allPassagesInWeekObjects.length > 0 && data.allPassagesInWeekObjects.every(p => completedPassages.includes(p.displayText));
        groupedWeeks.push({ weekKey, weekLabel, days: data.days, allPassagesInWeekObjects: data.allPassagesInWeekObjects, isCompleted });
      }
    });
    
    return groupedWeeks.sort((a,b) => parseISO(a.days[0].date).getTime() - parseISO(b.days[0].date).getTime()); // Sort weeks
  }, [completedPassages]);


  const groupedPlanByWeek = useMemo(() => {
    return groupReadingsByWeek(plan?.dailyReadings);
  }, [plan, groupReadingsByWeek]);

  const totalPassagesInPlan = useMemo(() => {
    if (!plan?.dailyReadings) return 0;
    return plan.dailyReadings.reduce((acc, day) => {
        if (!day || !Array.isArray(day.passages)) return acc;
        const validDayPassages = day.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '' && !p.displayText.startsWith("Error:"));
        return acc + validDayPassages.length;
    }, 0);
  }, [plan]);
  
  const overallProgress = totalPassagesInPlan > 0 ? (completedPassages.length / totalPassagesInPlan) * 100 : 0;

  const handleMarkReadRangeSubmit = async (data: MarkReadRangeFormValues) => {
    const fromBookMeta = BIBLE_BOOKS_DATA[data.fromBook];
    if (!fromBookMeta || data.fromChapter > fromBookMeta.chapters) {
        markRangeForm.setError("fromChapter", { type: "manual", message: `Max chapter for ${data.fromBook} is ${fromBookMeta.chapters}.`}); return;
    }
    const toBookMeta = BIBLE_BOOKS_DATA[data.toBook];
    if (!toBookMeta || data.toChapter > toBookMeta.chapters) {
        markRangeForm.setError("toChapter", { type: "manual", message: `Max chapter for ${data.toBook} is ${toBookMeta.chapters}.`}); return;
    }
    if (fromBookMeta.order > toBookMeta.order || (fromBookMeta.order === toBookMeta.order && data.fromChapter > data.toChapter) || (fromBookMeta.order === toBookMeta.order && data.fromChapter === data.toChapter && (data.fromVerse || 1) > (data.toVerse || 0))) {
        toast({ title: "Invalid Range", description: "The 'From' point cannot be after the 'To' point.", variant: "destructive"}); return;
    }
    setIsMarkingRange(true);
    try {
      const result = await markReadRange(data.fromBook, data.fromChapter, data.fromVerse, data.toBook, data.toChapter, data.toVerse);
      toast({ title: "Checklist Updated", description: `${result?.markedCount || 0} new passage(s) marked as read.` });
      setIsRangeFormOpen(false); 
    } catch (error: any) {
      toast({ title: "Error Updating Checklist", description: error.message || "Could not mark range.", variant: "destructive" });
    } finally {
      setIsMarkingRange(false);
    }
  };

  const handleToggleMultiplePassages = async (passagesToToggle: StructuredPassage[], markAsComplete: boolean) => {
    const passageTexts = passagesToToggle.map(p => p.displayText).filter(Boolean) as string[];
    if (passageTexts.length === 0) return;
    try {
      await markMultiplePassages(passageTexts, markAsComplete);
    } catch (error: any) {
      toast({ title: "Error Updating Checklist", description: error.message || "Could not update multiple passages.", variant: "destructive" });
    }
  };
  
  if (!isMounted || loadingAuth || (!loadingAuth && !currentUser && isMounted)) {
    return (<div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-xl text-muted-foreground">Loading authentication...</p></div>);
  }
  if (planLoading || loadingChecklist) {
    return (<div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Loading Bible plan and checklist...</p></div>);
  }
  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (<div className="space-y-8"><div className="flex items-center space-x-3 mb-6"><LibraryBig className="h-7 w-7 text-primary" /><h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1></div><Card className="mt-6 shadow-lg max-w-lg mx-auto"><CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-destructive" /><CardTitle className="text-xl">No Plan Available</CardTitle></div></CardHeader><CardContent><p className="text-muted-foreground">No Bible reading plan has been set.</p></CardContent></Card><BackToTopButton /></div>);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div className="flex items-center space-x-2"><LibraryBig className="h-6 w-6 text-primary" /><h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1></div>
      </div>

      {totalPassagesInPlan > 0 && (
        <Card className="mb-3 shadow-sm"><CardHeader className="p-2.5"><CardTitle className="text-base">Overall Progress</CardTitle></CardHeader><CardContent className="p-2.5 pt-0"><Progress value={overallProgress} className="w-full h-2.5" /><p className="text-muted-foreground mt-1 text-center text-xs">{completedPassages.length} of {totalPassagesInPlan} passages completed ({overallProgress.toFixed(1)}%)</p></CardContent></Card>
      )}

      <Dialog open={isRangeFormOpen} onOpenChange={setIsRangeFormOpen}>
        <DialogTrigger asChild><Button variant="outline" className="w-full md:w-auto text-xs py-1.5 h-auto mb-3"><Edit className="mr-1.5 h-3 w-3" /> Mark Reading Range</Button></DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-xl">Mark Reading Range</DialogTitle><DialogDescription>Mark all passages within the specified range as completed.</DialogDescription></DialogHeader>
          <Form {...markRangeForm}>
            <form onSubmit={markRangeForm.handleSubmit(handleMarkReadRangeSubmit)} className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <fieldset className="space-y-4 border p-4 rounded-md"><legend className="text-xs font-medium px-1">From</legend>
                  <FormField control={markRangeForm.control} name="fromBook" render={({ field }) => (<FormItem><FormLabel className="text-xs">Book</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="Select book" /></SelectTrigger></FormControl><SelectContent className="max-h-60">{CANONICAL_BIBLE_ORDER.map(bookName => (<SelectItem key={`from-${bookName}`} value={bookName} className="text-xs">{bookName}</SelectItem>))}</SelectContent></Select><FormMessage className="text-xs"/></FormItem>)}/>
                  <FormField control={markRangeForm.control} name="fromChapter" render={({ field }) => (<FormItem><FormLabel className="text-xs">Chapter</FormLabel><FormControl><Input type="number" placeholder="Ch." {...field} className="text-xs" /></FormControl><FormMessage className="text-xs"/></FormItem>)}/>
                  <FormField control={markRangeForm.control} name="fromVerse" render={({ field }) => (<FormItem><FormLabel className="text-xs">Verse (Opt.)</FormLabel><FormControl><Input type="number" placeholder="Verse" {...field} className="text-xs" /></FormControl><FormMessage className="text-xs"/></FormItem>)}/>
                </fieldset>
                <fieldset className="space-y-4 border p-4 rounded-md"><legend className="text-xs font-medium px-1">To</legend>
                  <FormField control={markRangeForm.control} name="toBook" render={({ field }) => (<FormItem><FormLabel className="text-xs">Book</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="Select book" /></SelectTrigger></FormControl><SelectContent className="max-h-60">{CANONICAL_BIBLE_ORDER.map(bookName => (<SelectItem key={`to-${bookName}`} value={bookName} className="text-xs">{bookName}</SelectItem>))}</SelectContent></Select><FormMessage className="text-xs"/></FormItem>)}/>
                  <FormField control={markRangeForm.control} name="toChapter" render={({ field }) => (<FormItem><FormLabel className="text-xs">Chapter</FormLabel><FormControl><Input type="number" placeholder="Ch." {...field} className="text-xs" /></FormControl><FormMessage className="text-xs"/></FormItem>)}/>
                  <FormField control={markRangeForm.control} name="toVerse" render={({ field }) => (<FormItem><FormLabel className="text-xs">Verse (Opt.)</FormLabel><FormControl><Input type="number" placeholder="Verse" {...field} className="text-xs" /></FormControl><FormMessage className="text-xs"/></FormItem>)}/>
                </fieldset>
              </div>
              <FormDescription className="text-xs px-1">Verse defaults: From=start of chapter, To=end of chapter.</FormDescription>
              <DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="outline" size="sm">Cancel</Button></DialogClose><Button type="submit" disabled={isMarkingRange} size="sm">{isMarkingRange ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="mr-2 h-3.5 w-3.5" />}{isMarkingRange ? 'Updating...' : 'Mark Range as Read'}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {groupedPlanByWeek.length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-2">
          {groupedPlanByWeek.map((week) => (
            <AccordionItem key={week.weekKey} value={week.weekKey} className="border bg-card/80 rounded-md shadow-sm">
              <AccordionTrigger asChild className="p-2 hover:bg-muted/50 rounded-t-md transition-colors">
                <div className="flex items-center justify-between w-full cursor-pointer">
                  <div className="flex items-center space-x-2">
                     <Checkbox
                        id={`week-${week.weekKey}-master`}
                        checked={week.isCompleted}
                        onCheckedChange={(checked) => handleToggleMultiplePassages(week.allPassagesInWeekObjects, Boolean(checked))}
                        onClick={(e) => e.stopPropagation()} 
                        aria-label={`Mark all passages in ${week.weekLabel} as complete`}
                        className="h-4 w-4 shrink-0"
                      />
                    <Label htmlFor={`week-${week.weekKey}-master`} className="text-sm font-semibold cursor-pointer">{week.weekLabel}</Label>
                     {week.isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 accordion-chevron" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="divide-y divide-border">
                  {week.days.map((dailyReading) => {
                    if (!dailyReading || !dailyReading.date) return null;
                    let parsedDayDate: Date | null = null;
                    try {
                      parsedDayDate = parseISO(dailyReading.date);
                      if(!isValid(parsedDayDate)) throw new Error("Invalid date after parsing");
                    } catch(e) {
                      console.error(`[BibleChecklistPage] Invalid date for dailyReading: ${dailyReading.date}`, e);
                      return <div key={`error-date-${dailyReading.originalDateKey || dailyReading.date}`} className="p-2 text-destructive text-xs">Error: Invalid date.</div>;
                    }
                    const dateKey = dailyReading.originalDateKey || dailyReading.date;
                    const allPassagesInDayObjects = dailyReading.passages?.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '') || [];
                    const isDayCompleted = allPassagesInDayObjects.length > 0 && allPassagesInDayObjects.every(p => completedPassages.includes(p.displayText));

                    return (
                      <div key={dateKey} className="p-2.5 space-y-1.5 bg-background/30 first:rounded-t-none last:rounded-b-md">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <h4 className="text-xs font-medium flex items-center">
                            {format(parsedDayDate, "EEE, MMM d")}
                            {isDayCompleted && <CheckCircle2 className="ml-1.5 h-3.5 w-3.5 text-green-500" />}
                          </h4>
                           <Checkbox
                              id={`day-${dateKey}-master`}
                              checked={isDayCompleted}
                              onCheckedChange={(checked) => handleToggleMultiplePassages(allPassagesInDayObjects, Boolean(checked))}
                              aria-label={`Mark all passages for ${format(parsedDayDate, "MMM d")} as complete`}
                              className="h-3.5 w-3.5 shrink-0"
                            />
                        </div>
                        {(allPassagesInDayObjects.length > 0) ? (
                          <ul className="space-y-1 pl-0.5">
                            {allPassagesInDayObjects.map((passage, pIndex) => {
                              if (!passage) return <li key={`error-passage-${dateKey}-${pIndex}`} className="text-destructive font-semibold p-1.5 text-xs italic">Error: Passage data corrupt.</li>;
                              const currentPassageDisplayText = (typeof passage.displayText === 'string') ? passage.displayText.trim() : '';
                              const isPassageValid = currentPassageDisplayText !== '' && !currentPassageDisplayText.startsWith("Error:");
                              const bookIdPart = (typeof passage.book === 'string' && passage.book.trim() !== '') ? passage.book.trim().replace(/\s+/g, '-') : `unknown-book-${pIndex}`;
                              const chapterIdPart = (passage.chapter !== undefined && (typeof passage.chapter === 'number' || (typeof passage.chapter === 'string' && String(passage.chapter).trim() !== ''))) ? String(passage.chapter) : `unknown-chapter-${pIndex}`;
                              const checkboxId = `passage-${dateKey}-${bookIdPart}-${chapterIdPart}-${pIndex}`;
                              const isChecked = isPassageValid && completedPassages.includes(currentPassageDisplayText);
                              return (
                                <li key={checkboxId} className="bg-card/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40 p-1.5 text-xs">
                                  <Checkbox id={checkboxId} checked={isChecked} onCheckedChange={() => { if (isPassageValid) { togglePassageCompletion(currentPassageDisplayText); } else { toast({title: "Invalid Passage Data", description: "Cannot toggle completion.", variant: "destructive"}); }}} aria-label={`Mark ${isPassageValid ? currentPassageDisplayText : 'invalid passage'} as read`} className="h-3.5 w-3.5" disabled={!isPassageValid}/>
                                  <Label htmlFor={checkboxId} className={cn("flex-grow cursor-pointer", isChecked && "line-through text-muted-foreground", !isPassageValid && "text-destructive font-semibold italic")}>{isPassageValid ? currentPassageDisplayText : "Error: Passage text missing"}</Label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (<p className="text-muted-foreground text-xs pl-0.5 pt-1">No passages for this day.</p>)}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
         <Card className="mt-4 shadow-sm"><CardContent className="p-6 text-center"><Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No weekly readings found in the current plan.</p></CardContent></Card>
      )}
      <BackToTopButton />
    </div>
  );
}
