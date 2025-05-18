"use client";

import type { BibleReadingPlan } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { BookOpenCheck } from 'lucide-react';

interface BiblePlanDisplayProps {
  plan: BibleReadingPlan | null;
}

export default function BiblePlanDisplay({ plan }: BiblePlanDisplayProps) {
  if (!plan) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-center text-muted-foreground">
          <BookOpenCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
          Generate a Bible reading plan using the form above.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
           <BookOpenCheck className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">Your Reading Plan</CardTitle>
        </div>
        <CardDescription>
          For: {plan.reference} | Starting: {format(parseISO(plan.startDate), "MMMM d, yyyy")} | Generated: {format(parseISO(plan.generatedDate), "PPP p")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-background/50">
          <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {plan.planText}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
