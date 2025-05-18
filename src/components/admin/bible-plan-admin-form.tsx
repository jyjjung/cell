
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, BookMarked } from 'lucide-react';
import { generateBibleReadingPlan, type GenerateBibleReadingPlanOutput } from '@/ai/flows/generate-bible-reading-plan';
import { useBiblePlan } from '@/hooks/use-bible-plan'; // To save the plan
import type { BibleReadingPlan } from '@/types';

const adminPlanFormSchema = z.object({
  reference: z.string().min(3, { message: "Bible reference(s) must be at least 3 characters." })
    .max(2000, { message: "Reference input is too long."}), // Added max length
  startDate: z.date({ required_error: "A start date is required." }),
});

type AdminPlanFormValues = z.infer<typeof adminPlanFormSchema>;

export default function BiblePlanAdminForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { saveBiblePlan, plan: currentPlan } = useBiblePlan(); // Get current plan for default values

  const form = useForm<AdminPlanFormValues>({
    resolver: zodResolver(adminPlanFormSchema),
    defaultValues: {
      reference: currentPlan?.originalReferenceInput || "Genesis 1-2\nExodus 1:1-10\nJude",
      startDate: currentPlan?.startDate ? new Date(currentPlan.startDate) : new Date(),
    },
  });
  
  // Effect to reset form if currentPlan changes (e.g., after save)
  useEffect(() => {
    if (currentPlan) {
      form.reset({
        reference: currentPlan.originalReferenceInput,
        startDate: new Date(currentPlan.startDate),
      });
    }
  }, [currentPlan, form]);


  async function onSubmit(data: AdminPlanFormValues) {
    setIsLoading(true);
    try {
      const formattedStartDate = format(data.startDate, "yyyy-MM-dd");
      const aiResult: GenerateBibleReadingPlanOutput = await generateBibleReadingPlan({
        reference: data.reference,
        startDate: formattedStartDate,
      });

      if (!aiResult.dailyReadings || aiResult.dailyReadings.length === 0) {
        toast({ title: "Warning", description: "The generated plan has no readings. Please check your input or try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      const newPlan: Omit<BibleReadingPlan, 'id' | 'updatedAt'> = {
        originalReferenceInput: data.reference,
        startDate: data.startDate.toISOString(),
        dailyReadings: aiResult.dailyReadings,
        generatedDate: new Date().toISOString(),
      };

      await saveBiblePlan(newPlan);

      toast({ title: "Success!", description: "New Bible reading plan generated and saved." });
    } catch (error: any) {
      console.error("Error generating or saving Bible plan:", error);
      toast({
        title: "Error",
        description: `Failed to process Bible reading plan. ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1 border rounded-lg shadow-md bg-card mt-1">
        <div className="flex items-center space-x-2 mb-4 p-4">
          <BookMarked className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Set Global Bible Reading Plan</h3>
        </div>
        <div className="px-4 space-y-6">
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bible Reference(s) (one per line)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Genesis 1-5\nJohn 3\nPsalms"
                  {...field}
                  rows={5}
                  className="text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
        </div>
        <div className="p-4 border-t">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Generating & Saving Plan...' : 'Generate & Save Global Plan'}
        </Button>
        </div>
      </form>
    </Form>
  );
}
