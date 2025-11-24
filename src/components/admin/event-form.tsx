
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { summarizeDateDetails } from '@/ai/flows/summarize-date-details';

const eventFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  date: z.date({ required_error: "A date is required." }),
  category: z.nativeEnum(EventCategory),
  details: z.string().optional(),
  summary: z.string().optional(), // Added summary field
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: AppEvent | null; // For editing existing event
  onSubmit: (data: AppEvent) => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

export function EventForm({ event, onSubmit, onCancel, submitButtonText = "Save Event" }: EventFormProps) {
  const [isSummarizing, setIsSummarizing] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? { ...event, date: parseISO(event.date), details: event.details || '', summary: event.summary || '' }
      : { title: '', details: '', summary: '', category: EventCategory.Event, date: new Date() },
  });

  async function handleSubmit(data: EventFormValues) {
    let finalSummary = data.summary || '';

    // Condition to generate summary: details exist, and the summary field is empty.
    const shouldGenerateSummary = data.details && data.details.trim() !== '' && (!data.summary || data.summary.trim() === '');
    
    if (shouldGenerateSummary) {
      setIsSummarizing(true);
      try {
        const summaryResult = await summarizeDateDetails({ notes: data.details! });
        finalSummary = summaryResult.summary;
      } catch (error: any) {
        console.error("Error generating summary:", error);
        // Let finalSummary remain as it was (empty string)
      } finally {
        setIsSummarizing(false);
      }
    }

    const processedData: AppEvent = {
      id: event?.id || '',
      title: data.title,
      date: data.date.toISOString(),
      category: data.category,
      details: data.details || '',
      summary: finalSummary,
    };
    
    onSubmit(processedData);
    if (!event) {
      form.reset({ title: '', details: '', summary: '', category: EventCategory.Event, date: new Date() });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekly Meeting" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
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
                      disabled={(date) => date < new Date("1900-01-01")}
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(EventCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional information..." className="resize-y" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Summary (Editable)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="A short summary will be generated if details are provided and this field is left empty. You can also write your own." 
                  className="resize-y" 
                  {...field} 
                  value={field.value ?? ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSummarizing}>Cancel</Button>}
          <Button type="submit" disabled={isSummarizing}>
            {isSummarizing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...</> : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
