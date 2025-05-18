
"use client";

import EventList from '@/components/events/event-list';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, BookHeart, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-center space-x-3 mb-6">
          <CalendarCheck className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Upcoming Dates</h2>
        </div>
        <EventList />
      </section>

      <Separator className="my-12" />

      <section>
        <div className="flex items-center space-x-3 mb-6">
          <BookHeart className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-bold tracking-tight">Today's Bible Reading</h2>
        </div>
        {planLoading ? (
          <Card>
            <CardContent className="p-6 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <p className="text-muted-foreground">Loading Bible reading plan...</p>
            </CardContent>
          </Card>
        ) : (
          <BiblePlanDisplay plan={plan} />
        )}
      </section>
    </div>
  );
}
