
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CalendarIcon, BookOpen, ListOrdered } from 'lucide-react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import type { BibleReadingPlan, DailyReading } from '@/types';
import { CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
import { 
  generateReadingUnitsForCanonical, 
  generateReadingUnitsForCustomPreset, 
  scheduleReadings,
  scheduleFixedDayReadings,
  type ReadingUnit
} from '@/lib/plan-generator';
import { MCHEYNE_PLAN_DATA } from '@/lib/mcheyne-data';

const adminPlanFormSchema = z.object({
  planType: z.enum(['canonical', 'custom', 'mcheyne'], { required_error: "Please select a plan type." }),
  startBook: z.string().optional(),
  startDate: z.date({ required_error: "A start date is required." }),
  readingsPerDay: z.coerce.number().int().min(1, "Must have at least 1 reading per day.").max(10, "Cannot have more than 10 readings per day."),
  readingDays: z.array(z.string()).refine(val => val.length > 0, {
    message: "You must select at least one reading day.",
  }),
}).refine(data => {
    if (data.planType === 'canonical' && !data.startBook) {
        return false;
    }
    return true;
}, {
    message: "Starting book is required for Canonical Order plan.",
    path: ["startBook"],
});

type AdminPlanFormValues = z.infer<typeof adminPlanFormSchema>;

const daysOfWeek = [
  { label: "S", value: "0" },
  { label: "M", value: "1" },
  { label: "T", value: "2" },
  { label: "W", value: "3" },
  { label: "T", value: "4" },
  { label: "F", value: "5" },
  { label: "S", value: "6" },
];

export default function BiblePlanAdminForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveBiblePlan, plan: currentPlan, loading: planLoading } = useBiblePlan();

  const form = useForm<AdminPlanFormValues>({
    resolver: zodResolver(adminPlanFormSchema),
    defaultValues: {
      planType: 'canonical',
      startBook: CANONICAL_BIBLE_ORDER[0],
      startDate: new Date(),
      readingsPerDay: 4,
      readingDays: ['1', '2', '3', '4', '5', '6'], // Default to Mon-Sat
    },
  });

  const selectedPlanType = form.watch('planType');

  useEffect(() => {
    if (!planLoading && currentPlan) {
      let defaultStartBook = CANONICAL_BIBLE_ORDER[0];
      if (currentPlan.planType === 'canonical' && currentPlan.planDescription?.startsWith("Canonical order starting from ")) {
        const bookNameFromDesc = currentPlan.planDescription.replace("Canonical order starting from ", "");
        if (CANONICAL_BIBLE_ORDER.includes(bookNameFromDesc)) {
          defaultStartBook = bookNameFromDesc;
        }
      }
      form.reset({
        planType: currentPlan.planType,
        startBook: defaultStartBook,
        startDate: currentPlan.startDate ? new Date(currentPlan.startDate) : new Date(),
        readingsPerDay: currentPlan.readingsPerDay || 4,
        readingDays: currentPlan.readingDays?.map(String) || ['1', '2', '3', '4', '5', '6'],
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
      } else if (data.planType === 'mcheyne') {
        planDescription = "M'Cheyne Bible Reading Plan";
      }

      const numericReadingDays = data.readingDays.map(d => parseInt(d, 10));
      let dailyReadings: DailyReading[] = [];

      if (data.planType === 'mcheyne') {
        dailyReadings = scheduleFixedDayReadings(MCHEYNE_PLAN_DATA, data.startDate, numericReadingDays);
      } else {
        if (readingUnits.length === 0) {
          setIsLoading(false);
          return;
        }
        dailyReadings = scheduleReadings(readingUnits, data.startDate, data.readingsPerDay, numericReadingDays);
      }

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
        readingsPerDay: data.readingsPerDay,
        readingDays: numericReadingDays,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6 border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <SelectItem value="mcheyne">
                        <div className="flex items-center">
                            <BookOpen className="mr-2 h-4 w-4" /> M'Cheyne Reading Plan (365 days)
                        </div>
                    </SelectItem>
                    </SelectContent>
                </Select>
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
                    <FormLabel>Starting Book</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select starting book" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
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
        </div>
        
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Plan Start Date</FormLabel>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              control={form.control}
              name="readingsPerDay"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Readings Per Day</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 4" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="readingDays"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Reading Days</FormLabel>
                    <FormControl>
                         <ToggleGroup 
                            type="multiple" 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            className="justify-start flex-wrap"
                         >
                            {daysOfWeek.map(day => (
                                <ToggleGroupItem key={day.value} value={day.value} aria-label={day.label} className="w-10 h-10">
                                    {day.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || planLoading}>
        {isLoading ? 'Generating & Saving Plan...' : (planLoading ? 'Loading current plan...' : 'Generate & Save Global Plan')}
        </Button>
      </form>
    </Form>
  );
}
