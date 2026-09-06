
"use client";

import { useMemo, useState } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/use-events';
import { AppEvent, EventCategory } from '@/types';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';import { useToast } from '@/hooks/use-toast';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

const categoryRegex = /^\s*(SNACKS|BIRTHDAY|EVENT)\s*$/im;

const monthsMap: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11
};

function createBatchImportSchema(messages: {
  batchTextMax: string;
  snackRotaPair: string;
  batchCategoryRequired: string;
}) {
  return z
    .object({
      batchText: z.string().max(10000, { message: messages.batchTextMax }).optional(),
      snackRotaStartDate: z.date().optional(),
      snackRotaNames: z.string().optional(),
      defaultCategory: z.nativeEnum(EventCategory).optional(),
    })
    .refine(
      (data) => {
        const namesProvided = data.snackRotaNames && data.snackRotaNames.trim() !== '';
        const dateProvided = !!data.snackRotaStartDate;
        if ((namesProvided && !dateProvided) || (dateProvided && !namesProvided)) {
          return false;
        }
        return true;
      },
      {
        message: messages.snackRotaPair,
        path: ['snackRotaStartDate'],
      },
    )
    .refine(
      (data) => {
        if (data.batchText && data.batchText.trim() !== '') {
          const hasCategoryHeaders = categoryRegex.test(data.batchText);
          const nameDateRegex = /[^-]+\s*(?:-?\s*)[A-Za-z]+\s+\d{1,2}/;
          if (!hasCategoryHeaders && !data.defaultCategory && !nameDateRegex.test(data.batchText)) {
            return false;
          }
        }
        return true;
      },
      {
        message: messages.batchCategoryRequired,
        path: ['defaultCategory'],
      },
    );
}

type BatchImportFormValues = z.infer<ReturnType<typeof createBatchImportSchema>>;

export default function BatchEventImportForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { addEvent } = useEvents();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { allUsers } = useAllUsers();

  const batchImportSchema = useMemo(
    () =>
      createBatchImportSchema({
        batchTextMax: t.adminValidationBatchTextMax,
        snackRotaPair: t.adminValidationSnackRotaPair,
        batchCategoryRequired: t.adminValidationBatchCategoryRequired,
      }),
    [
      t.adminValidationBatchTextMax,
      t.adminValidationSnackRotaPair,
      t.adminValidationBatchCategoryRequired,
    ],
  );

  const form = useForm<BatchImportFormValues>({
    resolver: zodResolver(batchImportSchema),
    defaultValues: {
      batchText: '',
      snackRotaNames: '',
      snackRotaStartDate: undefined,
      defaultCategory: undefined,
    },
  });

  const batchTextValue = form.watch('batchText');
  const showDefaultCategorySelector = batchTextValue && batchTextValue.trim() !== '' && !categoryRegex.test(batchTextValue);

  const parseAndCreateEventsFromText = async (rawInput: string, defaultCategory: EventCategory | undefined): Promise<{ eventsAdded: number; eventsParsed: number; errors: string[] }> => {
    const eventsToCreate: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const errors: string[] = [];
  
    const hasCategoryHeaders = categoryRegex.test(rawInput);

    const findUserIdForName = (name: string): string | undefined => {
        if (!allUsers) return undefined;
        const normalizedInput = name.toLowerCase().trim().replace(/\s+/g, ' ');
        const matchedUser = allUsers.find(u => {
            if (!u.firstName) return false;
            const fullName = `${u.firstName} ${u.lastName || ''}`.toLowerCase().trim().replace(/\s+/g, ' ');
            return fullName === normalizedInput;
        });
        return matchedUser?.uid;
    };
  
    const processBlock = (dataBlock: string, category: EventCategory | null) => {
      // Format 1: DD/MM/YYYY \n Title
      const eventRegex = /(\d{1,2}\/\d{1,2}\/\d{4})\s*\n([^\n]+)/g;
      let match;
      while ((match = eventRegex.exec(dataBlock)) !== null) {
        const dateStr = match[1];
        const title = match[2].trim();
        
        const [day, month, year] = dateStr.split('/').map(Number);
        if (!day || !month || !year || year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
          errors.push(`Invalid date format or value: "${dateStr}"`);
          continue;
        }
  
        const date = new Date(Date.UTC(year, month - 1, day));
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
          errors.push(`Invalid date (e.g., Feb 30): "${dateStr}"`);
          continue;
        }
  
        const finalCategory = category || defaultCategory || EventCategory.Event;

        eventsToCreate.push({
          title,
          date: date.toISOString(),
          category: finalCategory,
          details: finalCategory === EventCategory.Birthday ? `Happy Birthday ${title}!` : '',
          allDay: true,
          userId: finalCategory === EventCategory.Birthday ? findUserIdForName(title) : undefined,
        });
      }

      // Format 2: NAME - Month DD, YYYY or NAME Month DD, YYYY
      const birthdayLineRegex = /^([^-\n]+?)\s*(?:-?\s*)([A-Za-z]+)\s+(\d{1,2})(?:,?\s*\d{4})?\s*$/gm;
      let bMatch;
      const currentYear = new Date().getFullYear();
      while ((bMatch = birthdayLineRegex.exec(dataBlock)) !== null) {
        const name = bMatch[1].trim();
        const monthStr = bMatch[2].toLowerCase();
        const day = parseInt(bMatch[3], 10);
        
        const month = monthsMap[monthStr];
        if (month !== undefined && day >= 1 && day <= 31) {
            const date = new Date(Date.UTC(currentYear, month, day));
            if (date.getUTCMonth() === month && date.getUTCDate() === day) {
                eventsToCreate.push({
                    title: name,
                    date: date.toISOString(),
                    category: EventCategory.Birthday,
                    details: `Happy Birthday ${name}!`,
                    allDay: true,
                    userId: findUserIdForName(name),
                });
            } else {
                errors.push(`Invalid birthday date: ${bMatch[2]} ${day}`);
            }
        } else {
            // Only push error if it looks like it was meant to be a birthday but failed
            if (bMatch[0].includes(' ') || bMatch[0].includes('-')) {
                errors.push(`Could not parse month or day in: "${bMatch[0].trim()}"`);
            }
        }
      }
    };
  
    if (hasCategoryHeaders) {
      const parts = rawInput.trim().split(categoryRegex).filter(p => p.trim() !== '');
      for (let i = 0; i < parts.length; i += 2) {
        const categoryStr = parts[i].trim().toUpperCase();
        const dataBlock = parts[i+1]?.trim();
  
        if (!dataBlock) continue;
        
        let currentCategory: EventCategory | null = null;
        if (categoryStr === "SNACKS") currentCategory = EventCategory.Snack;
        else if (categoryStr === "BIRTHDAY") currentCategory = EventCategory.Birthday;
        else if (categoryStr === "EVENT") currentCategory = EventCategory.Event;
        else continue;
  
        processBlock(dataBlock, currentCategory);
      }
    } else {
      processBlock(rawInput.trim(), null);
    }
    
    let eventsAddedCount = 0;
    if (eventsToCreate.length > 0) {
      for (const eventData of eventsToCreate) {
        try {
          await addEvent(eventData);
          eventsAddedCount++;
        } catch (error: any) {
          console.error(`Batch Import: Failed to add event "${eventData.title}"`, error);
          errors.push(`Failed to add: ${eventData.title} on ${eventData.date.substring(0, 10)}`);
        }
      }
    }
    
    return { 
      eventsAdded: eventsAddedCount, 
      eventsParsed: eventsToCreate.length,
      errors
    };
  };

  async function onSubmit(data: BatchImportFormValues) {
    setIsLoading(true);
    let totalAdded = 0;
    let totalParsed = 0;
    const allErrors: string[] = [];

    const rotaFieldsAreUsed = !!(data.snackRotaNames && data.snackRotaNames.trim() !== '' && data.snackRotaStartDate);

    if (rotaFieldsAreUsed) {
      const names = data.snackRotaNames!.trim().split(',').map(name => name.trim()).filter(name => name);
      let currentDate = data.snackRotaStartDate!;

      for (const name of names) {
        const snackEvent: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'> = {
          title: name, 
          date: currentDate.toISOString(),
          category: EventCategory.Snack,
          details: name,
          allDay: true,
        };
        try {
          await addEvent(snackEvent);
          totalAdded++;
          totalParsed++;
        } catch (error: any) {
          console.error(`Rota: Failed to add snack event for ${name}`, error);
          allErrors.push(`Failed to add snack for: ${name}`);
        }
        currentDate = addDays(currentDate, 7);
      }
    }

    if (data.batchText && data.batchText.trim() !== '') {
      const textResult = await parseAndCreateEventsFromText(data.batchText, data.defaultCategory);
      totalAdded += textResult.eventsAdded;
      totalParsed += textResult.eventsParsed;
      allErrors.push(...textResult.errors);
    }
    
    if (totalParsed > 0 || allErrors.length > 0) {
      if (allErrors.length > 0) {
        toast({
          variant: "destructive",
          title: t.adminImportWithErrors,
          description: t.adminImportWithErrorsDesc
            .replace('{added}', String(totalAdded))
            .replace('{parsed}', String(totalParsed))
            .replace('{errors}', allErrors.join(', ')),
        });
      } else {
        toast({
          title: t.adminImportSuccessful,
          description: t.adminImportSuccessfulDesc.replace('{count}', String(totalAdded)),
        });
      }
    }
    
    form.reset(); 
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="snackRotaStartDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Snack Rota Start Date (Optional)</FormLabel>
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
                        {field.value ? format(field.value, "PPP") : <span>Pick a start date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="snackRotaNames"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Snack Rota Names (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Alice, Bob, Charlie" 
                    {...field} 
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="batchText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Data</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
`BIRTHDAY (Current Year)
Aiden Park July 12, 2005
Grace Jung March 22

EVENT
04/07/2025
Community BBQ
`
                  }
                  {...field}
                  value={field.value ?? ''} 
                  rows={10}
                  className="text-sm font-mono"
                />
              </FormControl>
              <FormDescription className="text-xs">
                Use category headers (BIRTHDAY, EVENT, SNACKS) or Name Month DD format.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {showDefaultCategorySelector && (
            <FormField
              control={form.control}
              name="defaultCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Category for Text Import</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a default category" />
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
        )}
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <ButtonSpinner className="mr-2" />}
          {isLoading ? 'Importing Events...' : 'Import Events'}
        </Button>
      </form>
    </Form>
  );
}
