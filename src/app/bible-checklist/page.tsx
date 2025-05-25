
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import { Loader2, CheckSquare, BookOpenText, Info, LibraryBig } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

export default function BibleChecklistPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, loadingChecklist } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, isMounted, setIsPageLoading]);

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
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-6 w-6 text-destructive" />
              <CardTitle className="text-2xl">No Plan Available</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No Bible reading plan has been set by the admin yet. The checklist will appear once a plan is active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPassages = plan.dailyReadings.reduce((acc, day) => acc + day.passages.length, 0);
  const totalCompleted = completedPassages.length;
  const overallProgress = totalPassages > 0 ? (totalCompleted / totalPassages) * 100 : 0;
  const defaultOpenItems = plan.dailyReadings.map((_, index) => `item-${index}`);

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <LibraryBig className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">My Bible Reading Checklist</h1>
      </div>

      {totalPassages > 0 && (
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="w-full h-4" />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {totalCompleted} of {totalPassages} passages completed ({overallProgress.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[calc(100vh-25rem)] rounded-md">
        <Accordion type="multiple" defaultValue={defaultOpenItems} className="p-1 md:p-4 space-y-3">
          {plan.dailyReadings.map((dailyReading, index) => (
            <AccordionItem 
              value={`item-${index}`} 
              key={index} 
              className="border bg-card text-card-foreground rounded-lg shadow-md hover:shadow-lg transition-shadow data-[state=closed]:shadow-md data-[state=open]:shadow-lg"
            >
              <AccordionTrigger className="w-full p-4 md:p-6 pb-3 hover:no-underline text-left rounded-t-lg data-[state=open]:rounded-b-none data-[state=open]:border-b">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl font-semibold flex items-center">
                    <BookOpenText className="h-5 w-5 mr-2 text-muted-foreground" />
                    {format(parseISO(dailyReading.date), "EEEE, MMMM d, yyyy")}
                  </span>
                  {/* AccordionTrigger automatically adds its own chevron icon */}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 rounded-b-lg">
                <div className="p-4 md:p-6 pt-3">
                  {dailyReading.passages.length > 0 ? (
                    <ul className="space-y-2.5">
                      {dailyReading.passages.map((passage, pIndex) => {
                        const isChecked = completedPassages.includes(passage);
                        const checkboxId = `passage-${index}-${pIndex}`;
                        return (
                          <li key={pIndex} className="p-3 bg-background/60 border rounded-md text-sm flex items-center space-x-3 transition-colors hover:bg-muted/50">
                            <Checkbox
                              id={checkboxId}
                              checked={isChecked}
                              onCheckedChange={() => togglePassageCompletion(passage)}
                              aria-label={`Mark ${passage} as read`}
                            />
                            <Label htmlFor={checkboxId} className={cn(
                              "flex-grow cursor-pointer",
                              isChecked ? 'line-through text-muted-foreground' : ''
                            )}>
                              {passage}
                            </Label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No passages assigned for this day.</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

