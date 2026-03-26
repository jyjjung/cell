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
import { CalendarIcon, Loader2, Clock } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const eventFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  date: z.date({ required_error: "A date is required." }),
  endDate: z.date().optional(),
  allDay: z.boolean().default(true),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  category: z.nativeEnum(EventCategory),
  details: z.string().optional(),
  summary: z.string().optional(),
}).refine(data => {
  if (data.endDate && data.date) {
    return data.endDate >= data.date;
  }
  return true;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"]
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: AppEvent | null; // For editing existing event
  onSubmit: (data: AppEvent) => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

export function EventForm({ event, onSubmit, onCancel, submitButtonText = "Save Event" }: EventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? { 
          ...event, 
          date: parseISO(event.date), 
          endDate: event.endDate ? parseISO(event.endDate) : undefined,
          allDay: event.allDay ?? true,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          details: event.details || '', 
          summary: event.summary || '' 
        }
      : { 
          title: '', details: '', summary: '', category: EventCategory.Event, 
          date: new Date(), endDate: undefined, allDay: true, startTime: '09:00', endTime: '10:00' 
        },
  });

  const isAllDay = form.watch('allDay');

  async function handleSubmit(data: EventFormValues) {
    setIsLoading(true);
    const processedData: AppEvent = {
      id: event?.id || '',
      title: data.title,
      date: data.date.toISOString(),
      endDate: data.endDate?.toISOString(),
      allDay: data.allDay,
      startTime: data.allDay ? undefined : data.startTime,
      endTime: data.allDay ? undefined : data.endTime,
      category: data.category,
      details: data.details || '',
      summary: data.summary || '',
    };
    
    onSubmit(processedData);
    if (!event) {
      form.reset({ 
        title: '', details: '', summary: '', category: EventCategory.Event, 
        date: new Date(), endDate: undefined, allDay: true, startTime: '09:00', endTime: '10:00' 
      });
    }
    setIsLoading(false);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover modal={isMobile}>
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
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <Popover modal={isMobile}>
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

        <div className="flex items-center space-x-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <FormField
            control={form.control}
            name="allDay"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
                <FormLabel className="text-base">All Day Event</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!isAllDay && (
            <div className="flex-1 flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Start Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} className="pl-9" />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">End Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} className="pl-9" />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
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
              <FormLabel>Summary (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="A short summary of the event." 
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
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
