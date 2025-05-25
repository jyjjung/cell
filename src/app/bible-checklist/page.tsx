
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
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, getISOWeek } from 'date-fns';
import { Loader2, LibraryBig, Info, BookOpenText, CalendarRange, Minimize2, Maximize2, CheckSquare, BookmarkPlus } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { CANONICAL_BIBLE_ORDER, BIBLE_BOOKS_DATA } from '@/lib/bible-data';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

interface GroupedDay extends DailyReading {
  originalDateKey: string; // YYYY-MM-DD
}
interface GroupedWeek {
  weekLabel: string;
  weekKey: string; // RRRR-II (ISO week year and week number)
  days: GroupedDay[];
}

function groupReadingsByWeek(dailyReadings: DailyReading[]): GroupedWeek[] {
  if (!dailyReadings || dailyReadings.length === 0) {
    return [];
  }
  const weeksMap = new Map<string, GroupedDay[]>();
  dailyReadings.forEach((reading) => {
    try {
      const dateObj = parseISO(reading.date);
      const weekKey = format(dateObj, 'RRRR-II'); 
      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, []);
      }
      weeksMap.get(weekKey)!.push({ ...reading, originalDateKey: reading.date });
    } catch (e) {
      console.error("Error parsing date for grouping:", reading.date, e);
    }
  });
  const groupedWeeks: GroupedWeek[] = [];
  Array.from(weeksMap.keys()).sort().forEach(weekKey => {
    const days = weeksMap.get(weekKey)!.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    if (days.length > 0) {
        const firstDayOfWeek = parseISO(days[0].date);
        const weekLabel = `Week of ${format(firstDayOfWeek, "MMM d, yyyy")} (W${getISOWeek(firstDayOfWeek)})`;
        groupedWeeks.push({ weekKey, weekLabel, days });
    }
  });
  return groupedWeeks;
}

const markReadUpToSchema = z.object({
  book: z.string().min(1, "Please select a book."),
  chapter: z.coerce.number().min(1, "Chapter must be at least 1."),
  verse: z.coerce.number().optional(),
});
type MarkReadUpToFormValues = z.infer<typeof markReadUpToSchema>;


export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markReadUpTo, loadingChecklist } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [isMarkingUpTo, setIsMarkingUpTo] = useState(false);

  const markUpToForm = useForm<MarkReadUpToFormValues>({
    resolver: zodResolver(markReadUpToSchema),
    defaultValues: { book: CANONICAL_BIBLE_ORDER[0], chapter: 1 },
  });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);

  const groupedPlanByWeek = useMemo(() => {
    if (plan?.dailyReadings) {
      return groupReadingsByWeek(plan.dailyReadings);
    }
    return [];
  }, [plan]);

  const totalPassagesInPlan = useMemo(() => {
    return plan?.dailyReadings.reduce((acc, day) => acc + day.passages.length, 0) || 0;
  }, [plan]);

  const overallProgress = totalPassagesInPlan > 0 ? (completedPassages.length / totalPassagesInPlan) * 100 : 0;

  const handleMarkReadUpTo = async (data: MarkReadUpToFormValues) => {
    const bookMeta = BIBLE_BOOKS_DATA[data.book];
    if (!bookMeta) {
        toast({ title: "Invalid Book", description: "Selected book is not recognized.", variant: "destructive" });
        return;
    }
    if (data.chapter > bookMeta.chapters) {
        markUpToForm.setError("chapter", { type: "manual", message: `Max chapter for ${data.book} is ${bookMeta.chapters}.`});
        return;
    }
    // Basic verse validation could be added here if needed, e.g., max verse for a chapter

    setIsMarkingUpTo(true);
    try {
      const result = await markReadUpTo(data.book, data.chapter, data.verse);
      toast({ title: "Checklist Updated", description: `${result?.markedCount || 0} new passage(s) marked as read.` });
      markUpToForm.reset({ book: data.book, chapter: data.chapter, verse: data.verse }); // Keep current values or reset as preferred
    } catch (error: any) {
      toast({ title: "Error Updating Checklist", description: error.message || "Could not mark passages as read.", variant: "destructive" });
    } finally {
      setIsMarkingUpTo(false);
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
          <LibraryBig className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">My Bible Reading Checklist</h1>
        </div>
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader><div className="flex items-center space-x-2"><Info className="h-6 w-6 text-destructive" /><CardTitle className="text-2xl">No Plan Available</CardTitle></div></CardHeader>
          <CardContent><p className="text-muted-foreground">No Bible reading plan has been set by the admin yet.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <LibraryBig className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">My Bible Reading Checklist</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="compact-view-checklist" checked={isCompactView} onCheckedChange={setIsCompactView} aria-label="Toggle compact view" />
          <Label htmlFor="compact-view-checklist" className="flex items-center cursor-pointer">
            {isCompactView ? <Minimize2 className="h-5 w-5 mr-2" /> : <Maximize2 className="h-5 w-5 mr-2" />} Compact View
          </Label>
        </div>
      </div>

      {totalPassagesInPlan > 0 && (
        <Card className="mb-8 shadow-md">
          <CardHeader className={cn(isCompactView ? "p-3" : "p-4")}>
            <CardTitle className={cn("text-xl", isCompactView ? "text-lg" : "")}>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className={cn(isCompactView ? "p-3 pt-0" : "p-4 pt-0")}>
            <Progress value={overallProgress} className={cn("w-full", isCompactView ? "h-3" : "h-4")} />
            <p className={cn("text-muted-foreground mt-2 text-center", isCompactView ? "text-xs" : "text-sm")}>
              {completedPassages.length} of {totalPassagesInPlan} passages completed ({overallProgress.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BookmarkPlus className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Mark Read Up To</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...markUpToForm}>
            <form onSubmit={markUpToForm.handleSubmit(handleMarkReadUpTo)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={markUpToForm.control} name="book"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Book</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select book" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-72">{CANONICAL_BIBLE_ORDER.map(bookName => (<SelectItem key={bookName} value={bookName}>{bookName}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={markUpToForm.control} name="chapter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapter</FormLabel>
                      <FormControl><Input type="number" placeholder="Ch." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={markUpToForm.control} name="verse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verse (Optional)</FormLabel>
                      <FormControl><Input type="number" placeholder="Verse" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={isMarkingUpTo}>
                {isMarkingUpTo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                {isMarkingUpTo ? 'Updating...' : 'Mark as Read Up To This Point'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="p-1 md:p-2 space-y-2">
        {groupedPlanByWeek.map((week) => (
          <AccordionItem value={`week-${week.weekKey}`} key={week.weekKey}
            className="border bg-card text-card-foreground rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <AccordionTrigger className={cn("w-full hover:no-underline text-left rounded-t-lg data-[state=open]:rounded-b-none data-[state=open]:border-b", isCompactView ? "p-3 text-lg" : "p-4 text-xl font-semibold")}>
              <div className="flex items-center justify-between w-full"><span className="flex items-center"><CalendarRange className={cn("mr-2 text-muted-foreground", isCompactView ? "h-4 w-4" : "h-5 w-5")} />{week.weekLabel}</span></div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 rounded-b-lg bg-background/30">
              <div className={cn("space-y-1.5", isCompactView ? "p-2" : "p-3")}>
                <Accordion type="multiple" className="space-y-1.5">
                  {week.days.map((dailyReading) => (
                    <AccordionItem value={`day-${dailyReading.originalDateKey}`} key={dailyReading.originalDateKey}
                      className="border bg-card/90 text-card-foreground rounded shadow-xs hover:shadow-sm transition-shadow">
                      <AccordionTrigger className={cn("w-full hover:no-underline text-left rounded-t data-[state=open]:rounded-b-none data-[state=open]:border-b", isCompactView ? "p-2 text-sm" : "p-3 text-base font-normal")}>
                        <div className="flex items-center justify-between w-full"><span className="flex items-center"><BookOpenText className={cn("mr-2 text-muted-foreground", isCompactView ? "h-3.5 w-3.5" : "h-4 w-4")} />{format(parseISO(dailyReading.date), "EEEE, MMM d")}</span></div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 rounded-b">
                        <div className={cn(isCompactView ? "p-2 pt-1.5" : "p-3 pt-2")}>
                          {dailyReading.passages.length > 0 ? (
                            <ul className={cn("space-y-2", isCompactView ? "space-y-1.5" : "")}>
                              {dailyReading.passages.map((passage, pIndex) => {
                                const isChecked = completedPassages.includes(passage.displayText);
                                const checkboxId = `passage-${dailyReading.originalDateKey}-${passage.book}-${passage.chapter}-${pIndex}`; // More unique ID
                                return (
                                  <li key={checkboxId} className={cn("bg-background/60 border rounded-md flex items-center space-x-2.5 transition-colors hover:bg-muted/50", isCompactView ? "p-1.5 text-xs" : "p-2.5 text-sm")}>
                                    <Checkbox id={checkboxId} checked={isChecked} onCheckedChange={() => togglePassageCompletion(passage.displayText)} aria-label={`Mark ${passage.displayText} as read`} className={cn(isCompactView ? "h-3.5 w-3.5" : "h-4 w-4")} />
                                    <Label htmlFor={checkboxId} className={cn("flex-grow cursor-pointer", isChecked ? 'line-through text-muted-foreground' : '')}>{passage.displayText}</Label>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (<p className={cn("text-muted-foreground", isCompactView ? "text-xs" : "text-sm")}>No passages assigned for this day.</p>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
