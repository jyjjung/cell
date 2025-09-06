
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
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

interface ChapterWithStatus {
  chapter: number;
  isCompleted: boolean;
  passages: StructuredPassage[];
}

interface BookSection {
  sectionTitle: string; // e.g., "Genesis" or "1 Kings I"
  bookName: string; // The canonical book name, e.g. "Genesis"
  chapters: ChapterWithStatus[];
  completedChapters: number;
  totalChapters: number;
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

    const sections: BookSection[] = [];
    let currentBookName: string | null = null;
    let currentChaptersMap = new Map<number, { passages: StructuredPassage[] }>();
    
    // Helper function to convert a number to a Roman numeral.
    const toRoman = (num: number): string => {
      const romanMap: { [key: number]: string } = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' };
      if (romanMap[num]) return romanMap[num];
      // Fallback for numbers greater than 10, though unlikely for book parts.
      return num.toString();
    };

    const processCurrentSection = () => {
        if (currentBookName && currentChaptersMap.size > 0) {
            const chaptersWithStatus: ChapterWithStatus[] = Array.from(currentChaptersMap.entries())
                .sort(([a], [b]) => a - b)
                .map(([chapter, data]) => {
                    const validPassagesInChapter = data.passages.filter(p => p.displayText && !p.displayText.startsWith("Error:"));
                    const isCompleted = validPassagesInChapter.length > 0 && validPassagesInChapter.every(p => completedPassages.includes(p.displayText));
                    return { chapter, isCompleted, passages: data.passages };
                });
            
            const completedChapterCount = chaptersWithStatus.filter(c => c.isCompleted).length;

            sections.push({
                sectionTitle: currentBookName, // Title will be adjusted later
                bookName: currentBookName,
                chapters: chaptersWithStatus,
                completedChapters: completedChapterCount,
                totalChapters: chaptersWithStatus.length,
            });
        }
    };

    for (const dailyReading of plan.dailyReadings) {
        for (const passage of dailyReading.passages) {
            if (!passage || !passage.book || !passage.chapter) continue;
            
            if (passage.book !== currentBookName) {
                processCurrentSection(); // Finalize and add the previous section
                currentBookName = passage.book;
                currentChaptersMap = new Map();
            }

            if (!currentChaptersMap.has(passage.chapter)) {
                currentChaptersMap.set(passage.chapter, { passages: [] });
            }
            currentChaptersMap.get(passage.chapter)!.passages.push(passage);
        }
    }
    processCurrentSection(); // Add the last section

    // Now, determine which books appear more than once and adjust titles
    const bookAppearanceCounts = sections.reduce((acc, section) => {
        acc.set(section.bookName, (acc.get(section.bookName) || 0) + 1);
        return acc;
    }, new Map<string, number>());

    const bookPartTracker = new Map<string, number>();
    return sections.map(section => {
        if ((bookAppearanceCounts.get(section.bookName) || 0) > 1) {
            const partNumber = (bookPartTracker.get(section.bookName) || 0) + 1;
            bookPartTracker.set(section.bookName, partNumber);
            return { ...section, sectionTitle: `${section.bookName} ${toRoman(partNumber)}` };
        }
        return section;
    });

  }, [plan, completedPassages]);
  
  const handleChapterClick = (chapterData: ChapterWithStatus) => {
    // For now, we will just use the first passage's reference to open the dialog.
    // The dialog itself allows navigation. A more complex approach could pass all passages.
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


  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center"><BookCheck className="mr-3 h-8 w-8 text-primary"/> My Reading Checklist</h1>
        </div>

        {bookSections.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
                {bookSections.map((section, index) => (
                    <AccordionItem value={`item-${index}`} key={section.sectionTitle} className="border-b-0">
                        <Card className="shadow-sm bg-card/80">
                           <CardHeader className="p-0">
                             <AccordionTrigger className="p-4 hover:no-underline">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                                    <div className="text-left">
                                        <p className="text-xs font-semibold uppercase text-primary tracking-wider">Section {index + 1}</p>
                                        <h2 className="text-xl font-bold text-card-foreground">{section.sectionTitle}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto max-w-xs">
                                        <Progress value={(section.completedChapters / section.totalChapters) * 100} className="w-full" />
                                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                            {section.completedChapters} / {section.totalChapters}
                                        </span>
                                    </div>
                                </div>
                             </AccordionTrigger>
                           </CardHeader>
                            <AccordionContent>
                                <div className="p-4 border-t">
                                     <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 justify-center">
                                        {section.chapters.map((chapter) => (
                                            <ChapterUnit
                                                key={`${section.bookName}-${chapter.chapter}`}
                                                chapterNumber={chapter.chapter}
                                                isCompleted={chapter.isCompleted}
                                                onClick={() => handleChapterClick(chapter)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
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

    

    