"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, BookMarked } from 'lucide-react';
import { generateBibleReadingPlan } from '@/ai/flows/generate-bible-reading-plan'; // GenAI flow

const planFormSchema = z.object({
  reference: z.string().min(3, { message: "Bible reference must be at least 3 characters." }),
  startDate: z.date({ required_error: "A start date is required." }),
  numDays: z.coerce.number().min(1, {message: "Number of days must be at least 1."}).max(90, {message: "Number of days cannot exceed 90."}),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface BiblePlanFormProps {
  onPlanGenerated: (plan: { reference: string; startDate: string; planText: string; generatedDate: string }) => void;
}

export default function BiblePlanForm({ onPlanGenerated }: BiblePlanFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      reference: "Genesis 1-10", // Example default
      startDate: new Date(),
      numDays: 7, // Default to 7 days
    },
  });

  async function onSubmit(data: PlanFormValues) {
    setIsLoading(true);
    try {
      const formattedStartDate = format(data.startDate, "yyyy-MM-dd");
      const result = await generateBibleReadingPlan({
        reference: data.reference,
        startDate: formattedStartDate,
        numDays: data.numDays,
      });
      onPlanGenerated({
        reference: data.reference,
        startDate: data.startDate.toISOString(),
        planText: result.readingPlan,
        generatedDate: new Date().toISOString(),
      });
      toast({ title: "Success!", description: "Bible reading plan generated." });
    } catch (error) {
      console.error("Error generating Bible plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate Bible reading plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 border rounded-lg shadow-md bg-card">
        <div className="flex items-center space-x-2 mb-4">
          <BookMarked className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Generate Bible Reading Plan</h3>
        </div>
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bible Reference(s)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Genesis 1-5, John 3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
          <FormField
            control={form.control}
            name="numDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Days</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 7" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Plan'}
        </Button>
      </form>
    </Form>
  );
}
