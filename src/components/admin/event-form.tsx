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
import { addMonths, format, startOfDay } from 'date-fns';
import { 
  CalendarIcon, 
  Loader2, 
  Clock, 
  Type, 
  Tag, 
  MapPin, 
  AlignLeft, 
  Users, 
  Repeat,
  Check
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { parseDay } from '@/lib/event-occurrences';
import { useIsMobile } from '@/hooks/use-mobile';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { useRoles } from '@/hooks/use-roles';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

const WEEKDAY_OPTS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

function createEventFormSchema(messages: {
  titleMin: string;
  dateRequired: string;
  endDateAfterStart: string;
  repeatUntilRequired: string;
  repeatUntilAfterStart: string;
  weekdayRequired: string;
}) {
  return z
    .object({
      title: z.string().min(2, { message: messages.titleMin }),
      date: z.date({ required_error: messages.dateRequired }),
      endDate: z.date().optional(),
      allDay: z.boolean().default(true),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      category: z.nativeEnum(EventCategory),
      details: z.string().optional(),
      location: z.string().optional(),
      allowedRoleIds: z.array(z.string()).default([]),
      recurrence: z.enum(['none', 'daily', 'weekly']).default('none'),
      recurrenceUntil: z.date().optional(),
      weekdays: z.array(z.number().int().min(0).max(6)).default([]),
    })
    .superRefine((data, ctx) => {
      if (data.endDate && data.date && startOfDay(data.endDate) < startOfDay(data.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.endDateAfterStart,
          path: ['endDate'],
        });
      }
      if (data.recurrence !== 'none') {
        if (!data.recurrenceUntil) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.repeatUntilRequired,
            path: ['recurrenceUntil'],
          });
        } else if (startOfDay(data.recurrenceUntil) < startOfDay(data.date)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.repeatUntilAfterStart,
            path: ['recurrenceUntil'],
          });
        }
      }
      if (data.recurrence === 'weekly' && (!data.weekdays || data.weekdays.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.weekdayRequired,
          path: ['weekdays'],
        });
      }
    });
}

type EventFormValues = z.infer<ReturnType<typeof createEventFormSchema>>;

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
  const { currentUser, isAdmin } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const eventFormSchema = useMemo(
    () =>
      createEventFormSchema({
        titleMin: t.adminValidationEventTitleMin,
        dateRequired: t.adminValidationDateRequired,
        endDateAfterStart: t.adminValidationEndDateAfterStart,
        repeatUntilRequired: t.adminValidationRepeatUntilRequired,
        repeatUntilAfterStart: t.adminValidationRepeatUntilAfterStart,
        weekdayRequired: t.adminValidationWeekdayRequired,
      }),
    [
      t.adminValidationEventTitleMin,
      t.adminValidationDateRequired,
      t.adminValidationEndDateAfterStart,
      t.adminValidationRepeatUntilRequired,
      t.adminValidationRepeatUntilAfterStart,
      t.adminValidationWeekdayRequired,
    ],
  );

  const defaultRecurrenceUntil = useMemo(() => addMonths(new Date(), 3), []);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? {
          title: event.title,
          date: parseDay(event.date),
          endDate: event.endDate ? parseDay(event.endDate) : undefined,
          allDay: event.allDay ?? true,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          details: event.details || '',
          location: event.location || '',
          allowedRoleIds: event.allowedRoleIds || [],
          category: event.category as EventCategory,
          recurrence: event.recurrence ?? 'none',
          recurrenceUntil: event.recurrenceUntil ? parseDay(event.recurrenceUntil) : defaultRecurrenceUntil,
          weekdays: event.weekdays ?? [],
        }
      : {
          title: '',
          details: '',
          location: '',
          allowedRoleIds: [],
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
      date: format(data.date, 'yyyy-MM-dd'),
      allDay: data.allDay,
      startTime: data.allDay ? undefined : data.startTime,
      endTime: data.allDay ? undefined : data.endTime,
      category: data.category,
      details: data.details || '',
      location: data.location || '',
      allowedRoleIds: data.allowedRoleIds || [],
    };

    if (data.recurrence === 'none') {
      base.endDate = data.endDate ? format(data.endDate, 'yyyy-MM-dd') : undefined;
      if (spansMultipleDays && data.weekdays.length > 0) {
        base.weekdays = [...new Set(data.weekdays)].sort((a, b) => a - b);
      }
    } else {
      base.recurrence = data.recurrence;
      base.recurrenceUntil = format(data.recurrenceUntil!, 'yyyy-MM-dd');
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
        location: '',
        allowedRoleIds: [],
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

  const { roles } = useRoles();
  const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 gap-4 p-1">
          {/* Left Column: Core Identity */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Type className="w-4 h-4" /> Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weekly Meeting" {...field} className="rounded-2xl bg-white/5 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Tag className="w-4 h-4" /> Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-white/10 bg-black/90 backdrop-blur-xl">
                        {Object.values(EventCategory).map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Church Hall" {...field} className="rounded-2xl bg-white/5 border-white/10" />
                    </FormControl>
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
                  <FormLabel className="flex items-center gap-2"><AlignLeft className="w-4 h-4" /> Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What should people know about this event?" 
                      className="min-h-[140px] rounded-2xl bg-white/5 border-white/10 resize-none" 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Right Column: Scheduling & Targeting */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Start Date</FormLabel>
                    <Popover modal={isMobile}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal rounded-2xl border-white/10 bg-white/5 hover:bg-white/10",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-white/10 bg-black/90 backdrop-blur-xl" align="start">
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
                    <FormLabel className="flex items-center gap-2">
                       End Date {recurrence !== 'none' ? '(N/A)' : ''}
                    </FormLabel>
                    <Popover modal={isMobile}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant={"outline"}
                            disabled={recurrence !== 'none'}
                            className={cn(
                              "w-full pl-3 text-left font-normal rounded-2xl border-white/10 bg-white/5 hover:bg-white/10",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Same as start</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-white/10 bg-black/90 backdrop-blur-xl" align="start">
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
            </div>

            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Repeat className="w-4 h-4" /> Recurrence</FormLabel>
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
                      <SelectTrigger className="rounded-2xl bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-white/10 bg-black/90 backdrop-blur-xl">
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recurrence !== 'none' && (
              <FormField
                control={form.control}
                name="recurrenceUntil"
                render={({ field }) => (
                  <FormItem className="flex flex-col animate-in fade-in slide-in-from-top-2">
                    <FormLabel className="flex items-center gap-2">Repeat until</FormLabel>
                    <Popover modal={isMobile}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal rounded-2xl border-white/10 bg-white/5 hover:bg-white/10",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick end of repeat</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-white/10 bg-black/90 backdrop-blur-xl" align="start">
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
                  <FormItem className="animate-in fade-in slide-in-from-top-2">
                    <FormLabel className="flex items-center gap-2">
                      {recurrence === 'weekly' ? 'Repeat on' : 'Active on these weekdays'}
                    </FormLabel>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {WEEKDAY_OPTS.map(({ value, label }) => (
                        <label
                          key={value}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-micro-label !opacity-100 cursor-pointer transition-all",
                            field.value.includes(value) 
                              ? "bg-primary/20 border-primary/40 text-primary" 
                              : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          <Checkbox
                            checked={field.value.includes(value)}
                            className="hidden"
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

            {isAdmin && (
              <FormField
                control={form.control}
                name="allowedRoleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Users className="w-4 h-4" /> Targeted Roles</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={roleOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Everyone (default)"
                        className="rounded-2xl bg-white/5 border-white/10"
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">Leave empty for a public event.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 app-card-sm rounded-2xl bg-muted/40 border border-border/50">
          <FormField
            control={form.control}
            name="allDay"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 shrink-0">
                <FormLabel className="text-sm font-medium">All day</FormLabel>
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
            <div className="flex-1 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
               <div className="h-4 w-px bg-white/10 shrink-0" />
              <div className="flex-1 max-w-[150px]">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-micro-label">Start</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} className="rounded-xl bg-white/10 border-transparent focus:bg-white/20 transition-all h-9 text-xs pl-8" />
                          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex-1 max-w-[150px]">
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-micro-label">End</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} className="rounded-xl bg-white/10 border-transparent focus:bg-white/20 transition-all h-9 text-xs pl-8" />
                          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
          {onCancel && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel} 
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" /> {submitButtonText}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
