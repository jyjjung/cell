
"use client";

import { useBiblePlan } from '@/hooks/use-bible-plan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { BookOpenCheck, Loader2, ListChecks, Info } from 'lucide-react';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();

  if (planLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Bible reading plan...</p>
      </div>
    );
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Info className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">No Plan Available</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No Bible reading plan has been set by the admin yet, or the current plan is empty.
          </p>
          {plan && (
            <p className="text-sm text-muted-foreground mt-2">
              Original reference: "{plan.originalReferenceInput}", Generated: {format(parseISO(plan.generatedDate), "PPP p")}.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <ListChecks className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl tracking-tight">Full Bible Reading Plan</CardTitle>
          </div>
          <CardDescription>
            Based on references: "{plan.originalReferenceInput}"
            <br />
            Plan generated on: {format(parseISO(plan.generatedDate), "PPP p")}.
            Plan starts on: {format(parseISO(plan.startDate), "PPP")}.
          </CardDescription>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[calc(100vh-22rem)] rounded-md border shadow-inner">
        <div className="p-4 space-y-4">
          {plan.dailyReadings.map((reading, index) => (
            <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">
                  {format(parseISO(reading.date), "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reading.passages.length > 0 ? (
                  <ul className="space-y-1.5">
                    {reading.passages.map((passage, pIndex) => (
                      <li key={pIndex} className="p-2.5 bg-background/60 border rounded-md text-sm">
                        <BookOpenCheck className="inline-block h-4 w-4 mr-2 text-muted-foreground" />
                        {passage}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No passages assigned for this day.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
