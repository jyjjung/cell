"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { addMonths, format, parseISO, startOfDay } from 'date-fns';
import { CalendarIcon, Loader2, Clock } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

const WEEKDAY_OPTS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

const eventFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  date: z.date({ required_error: "A date is required." }),
  endDate: z.date().optional(),
  allDay: z.boolean().default(true),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  category: z.nativeEnum(EventCategory),
  details: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly']).default('none'),
  recurrenceUntil: z.date().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
}).superRefine((data, ctx) => {
  if (data.endDate && data.date && startOfDay(data.endDate) < startOfDay(data.date)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date must be on or after start date", path: ['endDate'] });
  }
  if (data.recurrence !== 'none') {
    if (!data.recurrenceUntil) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Repeat until date is required", path: ['recurrenceUntil'] });
    } else if (startOfDay(data.recurrenceUntil) < startOfDay(data.date)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be on or after start date", path: ['recurrenceUntil'] });
    }
  }
  if (data.recurrence === 'weekly' && (!data.weekdays || data.weekdays.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pick at least one weekday", path: ['weekdays'] });
  }
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: AppEvent | null;
  onSubmit: (data: AppEvent) => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

function toggleWeekday(current: number[], value: number, checked: boolean): number[] {
  const set = new Set(current);
  if (checked) set.add(value);
  else set.delete(value);
  return [...set].sort((a, b) => a - b);
}

export function EventForm({ event, onSubmit, onCancel, submitButtonText = "Save Event" }: EventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  const defaultRecurrenceUntil = useMemo(() => addMonths(new Date(), 3), []);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? {
          title: event.title,
          date: parseISO(event.date),
          endDate: event.endDate ? parseISO(event.endDate) : undefined,
          allDay: event.allDay ?? true,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          details: event.details || '',
          category: event.category,
          recurrence: event.recurrence ?? 'none',
          recurrenceUntil: event.recurrenceUntil ? parseISO(event.recurrenceUntil) : defaultRecurrenceUntil,
          weekdays: event.weekdays ?? [],
        }
      : {
          title: '',
          details: '',
          category: EventCategory.Event,
          date: new Date(),
          endDate: undefined,
          allDay: true,
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'none',
          recurrenceUntil: defaultRecurrenceUntil,
          weekdays: [],
        },
  });

  const isAllDay = form.watch('allDay');
  const recurrence = form.watch('recurrence');
  const startDateVal = form.watch('date');
  const endDateVal = form.watch('endDate');

  const spansMultipleDays =
    recurrence === 'none' &&
    endDateVal &&
    startDateVal &&
    startOfDay(endDateVal).getTime() > startOfDay(startDateVal).getTime();

  async function handleSubmit(data: EventFormValues) {
    setIsLoading(true);
    const base: AppEvent = {
      id: event?.id || '',
      title: data.title,
      date: data.date.toISOString(),
      allDay: data.allDay,
      startTime: data.allDay ? undefined : data.startTime,
      endTime: data.allDay ? undefined : data.endTime,
      category: data.category,
      details: data.details || '',
    };

    if (data.recurrence === 'none') {
      base.endDate = data.endDate?.toISOString();
      if (spansMultipleDays && data.weekdays.length > 0) {
        base.weekdays = [...new Set(data.weekdays)].sort((a, b) => a - b);
      }
    } else {
      base.recurrence = data.recurrence;
      base.recurrenceUntil = data.recurrenceUntil!.toISOString();
      let wd = [...new Set(data.weekdays ?? [])].sort((a, b) => a - b);
      if (data.recurrence === 'weekly' && wd.length === 0) {
        wd = [startOfDay(data.date).getDay()];
      }
      if (data.recurrence === 'daily') {
        base.weekdays = wd.length > 0 ? wd : undefined;
      } else {
        base.weekdays = wd;
      }
    }

    onSubmit(base);
    if (!event) {
      form.reset({
        title: '',
        details: '',
        category: EventCategory.Event,
        date: new Date(),
        endDate: undefined,
        allDay: true,
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'none',
        recurrenceUntil: defaultRecurrenceUntil,
        weekdays: [],
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
                        type="button"
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
                <FormLabel>End Date {recurrence !== 'none' ? '(N/A for repeating)' : '(Optional)'}</FormLabel>
                <Popover modal={isMobile}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant={"outline"}
                        disabled={recurrence !== 'none'}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Same as start</span>}
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
                <Select onValueChange={field.onChange} value={field.value}>
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
          name="recurrence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repeat</FormLabel>
              <Select
                onValueChange={(v) => {
                  field.onChange(v);
                  if (v !== 'none') {
                    form.setValue('endDate', undefined);
                    if (v === 'weekly') {
                      const d = form.getValues('date');
                      const cur = form.getValues('weekdays');
                      if (!cur?.length) {
                        form.setValue('weekdays', [startOfDay(d).getDay()]);
                      }
                    }
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Daily: every matching day until “Repeat until”. Weekly: on selected weekdays until that date.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {recurrence !== 'none' && (
          <FormField
            control={form.control}
            name="recurrenceUntil"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Repeat until</FormLabel>
                <Popover modal={isMobile}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick end of repeat</span>}
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
        )}

        {(spansMultipleDays || recurrence === 'weekly' || recurrence === 'daily') && (
          <FormField
            control={form.control}
            name="weekdays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {recurrence === 'weekly'
                    ? 'Repeat on'
                    : recurrence === 'daily'
                      ? 'Only on these weekdays (optional)'
                      : 'Occurs on these weekdays'}
                </FormLabel>
                <FormDescription>
                  {spansMultipleDays && recurrence === 'none'
                    ? 'Leave all unchecked to count every day from start through end date.'
                    : recurrence === 'daily'
                      ? 'Leave all unchecked for every day of the week.'
                      : null}
                </FormDescription>
                <div className="flex flex-wrap gap-3 pt-2">
                  {WEEKDAY_OPTS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm font-medium cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={field.value.includes(value)}
                        onCheckedChange={(checked) =>
                          field.onChange(toggleWeekday(field.value, value, checked === true))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Details, location, links…" className="resize-y" {...field} value={field.value ?? ''} />
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
