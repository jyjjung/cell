
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { DailyReading } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, startOfDay, isValid, isWithinInterval, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { Loader2, Info } from 'lucide-react';
import BackToTopButton from '@/components/ui/back-to-top-button';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';

type FilterMode = 'currentWeek' | 'fullPlan';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [activeTab, setActiveTab] = useState<FilterMode>('currentWeek');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
  const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);
  
  const { completedPassages, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedDailyReadings = useMemo(() => {
    if (!plan?.dailyReadings) return [];
    return [...plan.dailyReadings].sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return dateA.getTime() - dateB.getTime();
      } catch (e) { 
         console.error("[FullBiblePlanPage] Error sorting daily readings by date:", a.date, b.date, e);
        return 0; 
      }
    });
  }, [plan]);

  const sortedAndFilteredDailyReadings = useMemo(() => {
     switch (activeTab) {
      case 'currentWeek': {
        const today = new Date();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); 
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 0 });   
        return sortedDailyReadings.filter(reading => {
          try {
            const readingDateObj = parseISO(reading.date); 
            if (!isValid(readingDateObj)) return false;
            return isWithinInterval(readingDateObj, { start: startOfDay(currentWeekStart), end: endOfDay(currentWeekEnd) });
          } catch (e) { 
            console.error(`[FullBiblePlanPage] Error parsing date for current week filtering: ${reading.date}`, e);
            return false; 
          }
        });
      }
      case 'fullPlan':
      default:
        return sortedDailyReadings;
    }
  }, [sortedDailyReadings, activeTab]);


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

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading page content...</p>
      </div>
    );
  }

  if (planLoading || loadingChecklist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Bible reading plan...</p>
      </div>
    );
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Full Bible Reading Plan</h1>
        <Card className="mt-6 max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <Info className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-semibold">No Plan Available</h3>
              <p className="text-muted-foreground mt-2">
                No Bible reading plan has been set by the admin yet.
              </p>
            </CardContent>
        </Card>
        <BackToTopButton />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Full Bible Reading Plan</h1>

       <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterMode)} className="w-full">
         <TabsList className="w-full sm:w-auto grid grid-cols-2">
           <TabsTrigger value="currentWeek">Current Week</TabsTrigger>
           <TabsTrigger value="fullPlan">Full Plan</TabsTrigger>
         </TabsList>
        <div className="space-y-3 mt-4">
          {sortedAndFilteredDailyReadings.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No readings found for this filter.</p></CardContent></Card>
          ) : (
            sortedAndFilteredDailyReadings.map((reading) => (
                <Card key={reading.date} className="bg-card/90 rounded-lg shadow-sm">
                    <CardHeader className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-primary">{format(parseISO(reading.date), "EEEE").toUpperCase()}</p>
                                <CardTitle className="text-xl">{format(parseISO(reading.date), "MMMM d, yyyy")}</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                        {reading.passages.length > 0 ? (
                            <ul className="space-y-2 text-sm">
                                {reading.passages.map((passage, pIndex) => {
                                    const passageTextToDisplay = (passage && typeof passage.displayText === 'string' && passage.displayText.trim() !== '') ? passage.displayText : "Error: Passage text data is missing.";
                                    const isPassageValid = passageTextToDisplay && !passageTextToDisplay.toLowerCase().includes("error:");
                                    return (
                                        <li key={pIndex} className="bg-background/70 border rounded-md flex items-center p-3 transition-colors hover:bg-muted/40">
                                            {isPassageValid ? (
                                                <Button
                                                    variant="link"
                                                    className="p-0 h-auto font-medium text-base text-left justify-start text-foreground hover:text-primary hover:no-underline"
                                                    onClick={() => handlePassageClick(passageTextToDisplay)}
                                                    title={`View ${passageTextToDisplay}`}
                                                >
                                                    {passageTextToDisplay}
                                                </Button>
                                            ) : (
                                                <span className="text-destructive italic font-semibold">{passageTextToDisplay}</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (<p className="text-sm text-muted-foreground p-2">No passages assigned.</p>)}
                    </CardContent>
                </Card>
            ))
          )}
        </div>
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
