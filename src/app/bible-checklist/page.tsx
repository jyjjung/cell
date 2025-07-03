
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isValid, startOfDay, isWithinInterval, isSameDay, startOfWeek, endOfWeek, endOfDay, lastDayOfDecade } from 'date-fns';
import { Loader2, LibraryBig, Info, CheckSquare, Edit, CheckCircle2, CalendarIcon, XCircle, CalendarRange, LayoutList, BookOpen, Clock, Target, List } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { CANONICAL_BIBLE_ORDER, BIBLE_BOOKS_DATA } from '@/lib/bible-data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { findNextUnreadReading } from '@/lib/reading-utils';

const markReadRangeSchema = z.object({
  fromBook: z.string().min(1, "Please select a 'From' book."),
  fromChapter: z.coerce.number().min(1, "'From' Chapter must be at least 1."),
  fromVerse: z.coerce.number().optional(),
  toBook: z.string().min(1, "Please select a 'To' book."),
  toChapter: z.coerce.number().min(1, "'To' Chapter must be at least 1."),
  toVerse: z.coerce.number().optional(),
});

type MarkReadRangeFormValues = z.infer<typeof markReadRangeSchema>;
type FilterMode = 'currentWeek' | 'myNextReading' | 'fullPlan' | 'singleDay';

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
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState<FilterMode>('currentWeek');
  const [markingDayId, setMarkingDayId] = useState<string | null>(null);

  const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
  const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);
  
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

  const sortedDailyReadings = useMemo(() => {
    if (!plan?.dailyReadings) return [];
    return [...plan.dailyReadings].sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return dateA.getTime() - dateB.getTime();
      } catch (e) { 
        console.error("[BibleChecklistPage] Error sorting daily readings by date:", a.date, b.date, e);
        return 0; 
      }
    });
  }, [plan]);

  const nextUnreadReadingDay = useMemo(() => {
    if (planLoading || loadingChecklist) return null;
    return findNextUnreadReading(sortedDailyReadings, completedPassages);
  }, [sortedDailyReadings, completedPassages, planLoading, loadingChecklist]);
  
  const filteredReadings = useMemo(() => {
    let readings: DailyReading[] = [];
    switch (activeTab) {
      case 'currentWeek': {
        const today = new Date();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); 
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 0 });   
        readings = sortedDailyReadings.filter(reading => {
          try {
            const readingDateObj = parseISO(reading.date); 
            if (!isValid(readingDateObj)) return false;
            return isWithinInterval(readingDateObj, { start: startOfDay(currentWeekStart), end: endOfDay(currentWeekEnd) });
          } catch (e) { 
            console.error(`[BibleChecklistPage] Error parsing date for current week filtering: ${reading.date}`, e);
            return false; 
          }
        });
        break;
      }
      case 'myNextReading': {
        if (nextUnreadReadingDay) {
          readings = [nextUnreadReadingDay];
        } else if (sortedDailyReadings.length > 0) {
          // If all readings are done, show the last reading of the plan as a "completed" state.
          readings = [sortedDailyReadings[sortedDailyReadings.length - 1]];
        }
        break;
      }
      case 'singleDay': {
        if (!selectedDate) {
          readings = [];
        } else {
          readings = sortedDailyReadings.filter(reading => {
            try {
                const readingDateObj = parseISO(reading.date);
                if (!isValid(readingDateObj)) return false;
                return isSameDay(readingDateObj, selectedDate);
              } catch (e) { 
                console.error(`[BibleChecklistPage] Error parsing date for single day filtering: ${reading.date}`, e);
                return false; 
              }
          });
        }
        break;
      }
      case 'fullPlan':
      default:
        readings = sortedDailyReadings;
        break;
    }
    return readings;
  }, [sortedDailyReadings, activeTab, selectedDate, nextUnreadReadingDay]);

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
      markRangeForm.reset();
    } catch (error: any) {
      toast({ title: "Error Updating Checklist", description: error.message || "Could not mark range.", variant: "destructive" });
    } finally {
      setIsMarkingRange(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setActiveTab(date ? 'singleDay' : 'currentWeek');
  };

  const handleMarkDayComplete = async (day: DailyReading) => {
    const dateKey = day.originalDateKey || day.date;
    setMarkingDayId(dateKey);
    const passageTexts = day.passages
      .map(p => p.displayText)
      .filter(text => typeof text === 'string' && text.trim() !== '' && !text.startsWith("Error:")) as string[];
    
    if (passageTexts.length === 0) {
      toast({ title: "No Passages", description: "This day has no valid passages to mark.", variant: "default" });
      setMarkingDayId(null);
      return;
    }

    try {
      await markMultiplePassages(passageTexts, true);
      let dayDateFormatted = "this day";
      try {
        const parsedDate = parseISO(day.date);
        if (isValid(parsedDate)) {
          dayDateFormatted = format(parsedDate, "MMM d");
        }
      } catch {}
      toast({ title: "Day Marked Complete", description: `All passages for ${dayDateFormatted} marked as read.` });
    } catch (error: any) {
      toast({ title: "Error", description: `Could not mark day complete: ${error.message}`, variant: "destructive" });
    } finally {
      setMarkingDayId(null);
    }
  };

  const handlePassageClick = (passageDisplayText: string | undefined) => {
    if (passageDisplayText && typeof passageDisplayText === 'string' && !passageDisplayText.toLowerCase().includes("error:")) {
      setSelectedPassageRef(passageDisplayText);
      setIsPassageViewerOpen(true);
    } else {
      toast({
        title: "Invalid Passage",
        description: "Cannot view details for an invalid or error passage.",
        variant: "default"
      });
    }
  };
  
  const DailyReadingSkeleton = () => (
    <Card className="bg-card/80 rounded-md shadow-sm">
      <CardHeader className="p-2 flex flex-row items-center justify-between space-x-2 border-b min-h-[44px]">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="p-2 space-y-1.5">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            <Skeleton className="h-3.5 w-full" />
          </div>
          <div className="flex items-center space-x-2 p-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
          <div className="flex items-center space-x-2 p-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReadings = (readingsToRender: DailyReading[]) => {
    if (readingsToRender.length === 0) {
      return (
        <Card className="shadow-sm mt-4">
          <CardContent className="p-6 text-center">
            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No readings found for this filter.</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-2 mt-4">
        {readingsToRender.map((dailyReading) => {
          if (!dailyReading || !dailyReading.date) return null;
          let parsedDayDate: Date | null = null;
          try {
            parsedDayDate = parseISO(dailyReading.date);
            if(!isValid(parsedDayDate)) throw new Error("Invalid date after parsing");
          } catch(e) {
            console.error(`[BibleChecklistPage] Invalid date for dailyReading: ${dailyReading.date}`, e);
            return <Card key={`error-date-${dailyReading.originalDateKey || dailyReading.date}`} className="p-3 my-2 shadow-sm"><CardContent className="text-destructive text-xs">Error: Invalid date for reading entry.</CardContent></Card>;
          }
          const dateKey = dailyReading.originalDateKey || dailyReading.date;
          const allPassagesInDayObjects = dailyReading.passages?.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '') || [];
          const isDayCompleted = allPassagesInDayObjects.length > 0 && allPassagesInDayObjects.every(p => completedPassages.includes(p.displayText));
          const isLoadingThisDay = markingDayId === dateKey;

          return (
            <Card key={dateKey} className="bg-card/80 rounded-md shadow-sm">
              <CardHeader className="p-2 flex flex-row items-center justify-between space-x-2 border-b min-h-[44px]">
                <h3 className="text-sm font-semibold flex items-center">
                  {format(parsedDayDate, "EEE, MMM d, yyyy")}
                  {isDayCompleted && <CheckCircle2 className="ml-2 h-4 w-4 text-green-500 shrink-0" />}
                </h3>
                {!isDayCompleted && allPassagesInDayObjects.length > 0 && (
                  <Button
                    size="xs" 
                    variant="outline"
                    onClick={() => handleMarkDayComplete(dailyReading)}
                    disabled={isLoadingThisDay}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    {isLoadingThisDay ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <CheckSquare className="mr-1.5 h-3 w-3" />
                    )}
                    Mark Day Complete
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-2 space-y-1.5">
                {(allPassagesInDayObjects.length > 0) ? (
                  <ul className="space-y-1">
                    {allPassagesInDayObjects.map((passage, pIndex) => {
                      if (!passage) {
                        console.warn(`[BibleChecklistPage] RENDERING: Passage object is null/undefined. Date: ${dateKey}, Index: ${pIndex}.`);
                        return <li key={`error-passage-${dateKey}-${pIndex}`} className="text-destructive font-semibold p-1.5 text-xs italic">Error: Passage data corrupt.</li>;
                      }
                      const currentPassageDisplayText = (typeof passage.displayText === 'string') ? passage.displayText.trim() : '';
                      const isPassageValid = currentPassageDisplayText !== '' && !currentPassageDisplayText.startsWith("Error:");
                      
                      const bookIdPart = (typeof passage.book === 'string' && passage.book.trim() !== '') ? passage.book.trim().replace(/\s+/g, '-') : `unknown-book-${pIndex}`;
                      const chapterIdPart = (passage.chapter !== undefined && (typeof passage.chapter === 'number' || (typeof passage.chapter === 'string' && String(passage.chapter).trim() !== ''))) ? String(passage.chapter) : `unknown-chapter-${pIndex}`;
                      const checkboxId = `passage-${dateKey}-${bookIdPart}-${chapterIdPart}-${pIndex}`;
                      
                      const isChecked = isPassageValid && completedPassages.includes(currentPassageDisplayText);

                      if(!isPassageValid && passage){
                            console.warn(`[BibleChecklistPage] RENDERING: Passage displayText is missing or invalid. Date: ${dateKey}, Index: ${pIndex}. Passage data:`, passage ? JSON.parse(JSON.stringify(passage)) : "null/undefined passage");
                      }

                      return (
                        <li key={checkboxId} className="bg-background/50 border rounded-md flex items-center space-x-2 transition-colors hover:bg-muted/40 p-1.5 text-xs">
                          <Checkbox 
                            id={checkboxId} 
                            checked={isChecked} 
                            onCheckedChange={() => { 
                              if (isPassageValid) { 
                                togglePassageCompletion(currentPassageDisplayText); 
                              } else {
                                toast({title: "Invalid Passage Data", description: "Cannot toggle completion for this passage as its text data is missing or invalid.", variant: "destructive"});
                                console.error("Attempted to toggle invalid passage:", passage);
                              }
                            }} 
                            aria-label={`Mark ${isPassageValid ? currentPassageDisplayText : 'invalid passage'} as read`} 
                            className="h-3.5 w-3.5" 
                            disabled={!isPassageValid || isLoadingThisDay}
                          />
                          <Label
                            htmlFor={checkboxId}
                            className={cn("flex-grow cursor-pointer", isChecked && "line-through text-muted-foreground")}
                          >
                            {isPassageValid ? (
                              <Button
                                variant="link"
                                className={cn(
                                  "p-0 h-auto text-xs font-normal text-left justify-start hover:no-underline",
                                  isChecked ? "text-muted-foreground hover:text-muted-foreground/80" : "text-foreground hover:text-primary"
                                )}
                                onClick={() => handlePassageClick(passage.displayText)}
                                title={`View ${currentPassageDisplayText}`}
                                disabled={isLoadingThisDay}
                              >
                                {currentPassageDisplayText}
                              </Button>
                            ) : (
                              <span className="text-destructive font-semibold italic">Error: Passage text missing</span>
                            )}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (<p className="text-muted-foreground text-xs pl-0.5 pt-1">No passages for this day.</p>)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };


  if (!isMounted || loadingAuth || (!loadingAuth && !currentUser && isMounted)) {
    return (<div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-xl text-muted-foreground">Loading authentication...</p></div>);
  }
  if (planLoading || loadingChecklist) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="flex items-center space-x-2"><LibraryBig className="h-6 w-6 text-primary" /><h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1></div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <Skeleton className="h-24 w-full mb-3 rounded-lg" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <Skeleton className="h-10 w-full sm:w-[350px] rounded-md" />
          <Skeleton className="h-10 w-full sm:w-[180px] rounded-md" />
        </div>
        <div className="space-y-2 mt-4">
          <DailyReadingSkeleton />
          <DailyReadingSkeleton />
          <DailyReadingSkeleton />
        </div>
      </div>
    );
  }
  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (<div className="space-y-8"><div className="flex items-center space-x-3 mb-6"><LibraryBig className="h-7 w-7 text-primary" /><h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1></div><Card className="mt-6 shadow-lg max-w-lg mx-auto"><CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-destructive" /><CardTitle className="text-xl">No Plan Available</CardTitle></div></CardHeader><CardContent><p className="text-muted-foreground">No Bible reading plan has been set.</p></CardContent></Card><BackToTopButton /></div>);
  }


  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div className="flex items-center space-x-2"><LibraryBig className="h-6 w-6 text-primary" /><h1 className="text-xl font-bold tracking-tight">My Bible Reading Checklist</h1></div>
        <Dialog open={isRangeFormOpen} onOpenChange={setIsRangeFormOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-1.5 h-3 w-3" /> Mark Range</Button></DialogTrigger>
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
      </div>

      {totalPassagesInPlan > 0 && (
        <Card className="mb-3 shadow-sm"><CardHeader className="p-2.5"><CardTitle className="text-base">Overall Progress</CardTitle></CardHeader><CardContent className="p-2.5 pt-0"><Progress value={overallProgress} className="w-full h-2.5" /><p className="text-muted-foreground mt-1 text-center text-xs">{completedPassages.length} of {totalPassagesInPlan} passages completed ({overallProgress.toFixed(1)}%)</p></CardContent></Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => { setSelectedDate(undefined); setActiveTab(value as FilterMode); }} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="currentWeek" className="flex items-center gap-2"><Clock className="h-4 w-4"/>Current Week</TabsTrigger>
            <TabsTrigger value="myNextReading" className="flex items-center gap-2"><Target className="h-4 w-4"/>My Next Reading</TabsTrigger>
            <TabsTrigger value="fullPlan" className="flex items-center gap-2"><List className="h-4 w-4"/>Full Plan</TabsTrigger>
            </TabsList>
            <Popover>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", activeTab === 'singleDay' && "ring-2 ring-ring")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {activeTab === 'singleDay' && selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus/>
            </PopoverContent>
            </Popover>
        </div>
        <TabsContent value="currentWeek">{renderReadings(filteredReadings)}</TabsContent>
        <TabsContent value="myNextReading">{renderReadings(filteredReadings)}</TabsContent>
        <TabsContent value="fullPlan">{renderReadings(filteredReadings)}</TabsContent>
        <TabsContent value="singleDay">{renderReadings(filteredReadings)}</TabsContent>
      </Tabs>

      <BiblePassageViewerDialog
        isOpen={isPassageViewerOpen}
        onOpenChange={setIsPassageViewerOpen}
        passageReference={selectedPassageRef}
        completedPassages={completedPassages}
        markMultiplePassages={markMultiplePassages}
      />
      <BackToTopButton />
    </div>
  );
}
