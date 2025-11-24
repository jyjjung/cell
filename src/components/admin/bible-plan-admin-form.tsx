
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon, BookOpen, ListOrdered } from 'lucide-react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { BibleReadingPlan, DailyReading, PlanType } from '@/types';
import { CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
import { 
  generateReadingUnitsForCanonical, 
  generateReadingUnitsForCustomPreset, 
  scheduleReadings,
  type ReadingUnit
} from '@/lib/plan-generator';

const adminPlanFormSchema = z.object({
  planType: z.enum(['canonical', 'custom'], { required_error: "Please select a plan type." }),
  startBook: z.string().optional(), // Required if planType is 'canonical'
  startDate: z.date({ required_error: "A start date is required." }),
}).refine(data => {
    if (data.planType === 'canonical' && !data.startBook) {
        return false;
    }
    return true;
}, {
    message: "Starting book is required for Canonical Order plan.",
    path: ["startBook"], // Point error to startBook field
});

type AdminPlanFormValues = z.infer<typeof adminPlanFormSchema>;

export default function BiblePlanAdminForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveBiblePlan, plan: currentPlan, loading: planLoading } = useBiblePlan();

  const form = useForm<AdminPlanFormValues>({
    resolver: zodResolver(adminPlanFormSchema),
    defaultValues: {
      planType: currentPlan?.planType || 'canonical',
      startBook: currentPlan?.planType === 'canonical' && currentPlan.planDescription.startsWith("Canonical order starting from ") 
                 ? currentPlan.planDescription.replace("Canonical order starting from ", "") 
                 : CANONICAL_BIBLE_ORDER[0],
      startDate: currentPlan?.startDate ? new Date(currentPlan.startDate) : new Date(),
    },
  });

  const selectedPlanType = form.watch('planType');

  useEffect(() => {
    if (!planLoading && currentPlan) {
      let defaultStartBook = CANONICAL_BIBLE_ORDER[0];
      if (currentPlan.planType === 'canonical' && currentPlan.planDescription.startsWith("Canonical order starting from ")) {
        const bookNameFromDesc = currentPlan.planDescription.replace("Canonical order starting from ", "");
        if (CANONICAL_BIBLE_ORDER.includes(bookNameFromDesc)) {
          defaultStartBook = bookNameFromDesc;
        }
      }
      form.reset({
        planType: currentPlan.planType,
        startBook: defaultStartBook,
        startDate: new Date(currentPlan.startDate),
      });
    } else if (!planLoading && !currentPlan) {
        // Set defaults if no current plan
        form.reset({
            planType: 'canonical',
            startBook: CANONICAL_BIBLE_ORDER[0],
            startDate: new Date(),
        });
    }
  }, [currentPlan, form, planLoading]);

  async function onSubmit(data: AdminPlanFormValues) {
    setIsLoading(true);
    try {
      let readingUnits: ReadingUnit[] = [];
      let planDescription = "";

      if (data.planType === 'canonical') {
        if (!data.startBook) {
          setIsLoading(false);
          return;
        }
        readingUnits = generateReadingUnitsForCanonical(data.startBook);
        planDescription = `Canonical order starting from ${data.startBook}`;
      } else if (data.planType === 'custom') {
        readingUnits = generateReadingUnitsForCustomPreset();
        planDescription = "Preset Custom Chronological Order";
      }

      if (readingUnits.length === 0) {
        setIsLoading(false);
        return;
      }
      
      const dailyReadings: DailyReading[] = scheduleReadings(readingUnits, data.startDate, 4);

      if (dailyReadings.length === 0) {
        setIsLoading(false);
        return;
      }
      
      const newPlan: Omit<BibleReadingPlan, 'id' | 'updatedAt'> = {
        planType: data.planType,
        planDescription: planDescription,
        startDate: data.startDate.toISOString(),
        dailyReadings: dailyReadings,
        generatedDate: new Date().toISOString(),
      };

      await saveBiblePlan(newPlan);
    } catch (error: any) {
      console.error("Error generating or saving Bible plan:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="planType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="canonical">
                    <div className="flex items-center">
                        <ListOrdered className="mr-2 h-4 w-4" /> Canonical Order
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                     <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4" /> Preset Custom List
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose 'Canonical Order' to read from a start book onwards, or 'Preset Custom List' for the specific pre-defined reading order.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedPlanType === 'canonical' && (
          <FormField
            control={form.control}
            name="startBook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting Book (for Canonical Order)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select starting book" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72"> {/* Make dropdown scrollable */}
                    {CANONICAL_BIBLE_ORDER.map(bookName => (
                      <SelectItem key={bookName} value={bookName}>{bookName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date for the Plan</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4 border-t"> 
            <Button type="submit" className="w-full" disabled={isLoading || planLoading}>
            {isLoading ? 'Generating & Saving Plan...' : (planLoading ? 'Loading current plan...' : 'Generate & Save Global Plan')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
