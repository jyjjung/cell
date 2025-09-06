
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import type { DailyReading, StructuredPassage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, LibraryBig, Info, BookCheck } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useToast } from '@/hooks/use-toast';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import ChapterUnit from '@/components/bible/chapter-unit';
import { isBefore, parseISO, startOfDay } from 'date-fns';

interface ChapterWithStatus {
  chapter: number;
  isCompleted: boolean;
  passages: StructuredPassage[];
  date: string; 
}

interface DailyReadingSection {
    sectionTitle: string; // e.g., "Genesis - Day 1"
    chapters: ChapterWithStatus[];
    completedChapters: number;
    totalChapters: number;
}

interface BookSection {
  bookName: string;
  dailyReadings: DailyReadingSection[];
}


export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
  const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);
  
  const bookSections = useMemo((): BookSection[] => {
    if (!plan?.dailyReadings) return [];

    const sectionsByBook = new Map<string, DailyReadingSection[]>();
    
    // Group daily readings by book first
    for (const dailyReading of plan.dailyReadings) {
        if (!dailyReading.passages || dailyReading.passages.length === 0) continue;

        // All passages in a daily reading should ideally be from the same book
        // for this model to work perfectly, but we'll group by the first passage's book.
        const firstPassage = dailyReading.passages[0];
        if (!firstPassage || !firstPassage.book) continue;
        const bookName = firstPassage.book;

        if (!sectionsByBook.has(bookName)) {
            sectionsByBook.set(bookName, []);
        }

        const chaptersInReading = new Map<number, { passages: StructuredPassage[], date: string }>();
        for (const passage of dailyReading.passages) {
            if (!passage || !passage.book || !passage.chapter) continue;
             if (!chaptersInReading.has(passage.chapter)) {
                chaptersInReading.set(passage.chapter, { passages: [], date: dailyReading.date });
            }
            chaptersInReading.get(passage.chapter)!.passages.push(passage);
        }

        const chaptersWithStatus: ChapterWithStatus[] = Array.from(chaptersInReading.entries())
                .sort(([a], [b]) => a - b)
                .map(([chapter, data]) => {
                    const validPassagesInChapter = data.passages.filter(p => p.displayText && !p.displayText.startsWith("Error:"));
                    const isCompleted = validPassagesInChapter.length > 0 && validPassagesInChapter.every(p => completedPassages.includes(p.displayText));
                    return { chapter, isCompleted, passages: data.passages, date: data.date };
                });

        const completedChapterCount = chaptersWithStatus.filter(c => c.isCompleted).length;
        
        const currentBookSections = sectionsByBook.get(bookName)!;
        currentBookSections.push({
            sectionTitle: `${bookName} - Day ${currentBookSections.length + 1}`,
            chapters: chaptersWithStatus,
            completedChapters: completedChapterCount,
            totalChapters: chaptersWithStatus.length,
        });
    }

    // Convert map to final array structure, maintaining plan order
    const finalStructure: BookSection[] = [];
    const seenBooks = new Set<string>();

    for(const dailyReading of plan.dailyReadings) {
        if (!dailyReading.passages || dailyReading.passages.length === 0) continue;
        const bookName = dailyReading.passages[0].book;
        if (!bookName || seenBooks.has(bookName)) continue;

        const dailySectionsForBook = sectionsByBook.get(bookName);
        if (dailySectionsForBook) {
            finalStructure.push({
                bookName,
                dailyReadings: dailySectionsForBook
            });
            seenBooks.add(bookName);
        }
    }
    
    return finalStructure;

  }, [plan, completedPassages]);
  
  const handleChapterClick = (chapterData: ChapterWithStatus) => {
    const firstPassage = chapterData.passages?.[0];
    if (firstPassage?.displayText) {
      setSelectedPassageRef(firstPassage.displayText);
      setIsPassageViewerOpen(true);
    } else {
        toast({
            title: "No Passage Data",
            description: "Could not find a valid passage reference for this chapter.",
            variant: "destructive"
        });
    }
  };

  const PageSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-2/3 rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );

  if (!isMounted || loadingAuth || (!loadingAuth && !currentUser && isMounted)) {
    return (<div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-xl text-muted-foreground">Loading authentication...</p></div>);
  }
  if (planLoading || loadingChecklist) {
    return <PageSkeleton />;
  }
  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (<div className="space-y-8"><h1 className="text-3xl font-bold tracking-tight">My Reading Checklist</h1><Card className="mt-6 max-w-lg mx-auto"><CardContent className="p-8 text-center"><Info className="mx-auto h-12 w-12 text-destructive mb-4" /><h3 className="text-xl font-semibold">No Plan Available</h3><p className="text-muted-foreground mt-2">No Bible reading plan has been set by the admin.</p></CardContent></Card></div>);
  }

  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center"><BookCheck className="mr-3 h-8 w-8 text-primary"/> My Reading Checklist</h1>
        </div>

        {bookSections.length > 0 ? (
            <div className="space-y-4">
                {bookSections.map((bookSection) => (
                    <div key={bookSection.bookName}>
                        <h2 className="text-2xl font-bold tracking-tight mb-3">{bookSection.bookName}</h2>
                        <Accordion type="multiple" className="w-full space-y-3">
                            {bookSection.dailyReadings.map((readingSection) => (
                                <AccordionItem value={readingSection.sectionTitle} key={readingSection.sectionTitle} className="border-b-0">
                                    <Card className="shadow-sm bg-card/80">
                                        <CardHeader className="p-0">
                                            <AccordionTrigger className="p-4 hover:no-underline">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                                                    <div className="text-left">
                                                        <h3 className="text-lg font-semibold text-card-foreground">{readingSection.sectionTitle.split(" - ")[1]}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto max-w-xs">
                                                        <Progress value={(readingSection.completedChapters / readingSection.totalChapters) * 100} className="w-full" />
                                                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                                            {readingSection.completedChapters} / {readingSection.totalChapters}
                                                        </span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                        </CardHeader>
                                        <AccordionContent>
                                            <div className="p-4 border-t">
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-4 gap-y-6">
                                                    {readingSection.chapters.map((chapter) => {
                                                        const isOverdue = !chapter.isCompleted && isBefore(parseISO(chapter.date), today);
                                                        return (
                                                            <ChapterUnit
                                                                key={`${bookSection.bookName}-${chapter.chapter}`}
                                                                chapterNumber={chapter.chapter}
                                                                isCompleted={chapter.isCompleted}
                                                                isOverdue={isOverdue}
                                                                onClick={() => handleChapterClick(chapter)}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ))}
            </div>
        ) : (
             <Card className="mt-4">
                <CardContent className="p-8 text-center">
                    <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No readings found in the current plan.</p>
                </CardContent>
            </Card>
        )}

      <BiblePassageViewerDialog
        isOpen={isPassageViewerOpen}
        onOpenChange={setIsPassageViewerOpen}
        passageReference={selectedPassageRef}
        completedPassages={completedPassages}
        markMultiplePassages={markMultiplePassages}
      />
    </div>
  );
}

