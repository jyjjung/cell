
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEvents } from '@/hooks/use-events';
import { AppEvent, EventCategory } from '@/types';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';

const batchImportSchema = z.object({
  batchText: z.string().max(10000, { message: "Batch text input is too long (max 10000 characters)." }).optional(),
  snackRotaStartDate: z.date().optional(),
  snackRotaNames: z.string().optional(),
}).refine(data => {
  const namesProvided = data.snackRotaNames && data.snackRotaNames.trim() !== '';
  const dateProvided = !!data.snackRotaStartDate;

  if (namesProvided && !dateProvided) return false; 
  if (dateProvided && !namesProvided) return false; 
  return true; 
}, {
  message: "Snack Rota Start Date and Names must be provided together, or neither should be filled.",
  path: ["snackRotaStartDate"], 
});


type BatchImportFormValues = z.infer<typeof batchImportSchema>;

export default function BatchEventImportForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { addEvent } = useEvents();

  const form = useForm<BatchImportFormValues>({
    resolver: zodResolver(batchImportSchema),
    defaultValues: {
      batchText: '',
      snackRotaNames: '',
      snackRotaStartDate: undefined,
    },
  });

  const parseAndCreateEventsFromText = async (rawInput: string, ignoreSnackCategoryFromText: boolean): Promise<{
    eventsAddedFromTextCount: number;
    eventsParsedFromTextCount: number;
  }> => {
    const eventsToCreate: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const lines = rawInput.trim().split('\n');
    let currentCategory: EventCategory | null = null;
    
    let i = 0;
    while (i < lines.length) {
        let line = lines[i]?.trim();
        if (!line) { 
            i++;
            continue;
        }

        const upperLine = line.toUpperCase();
        let newCategory: EventCategory | null = null;

        if (upperLine.startsWith("SNACKS")) newCategory = EventCategory.Snack;
        else if (upperLine.startsWith("QT")) newCategory = EventCategory.QT;
        else if (upperLine.startsWith("BIRTHDAY")) newCategory = EventCategory.Birthday;
        else if (upperLine.startsWith("EVENT")) newCategory = EventCategory.Event;
        
        if (newCategory) {
            currentCategory = newCategory;
            i++;
            continue;
        }

        if (!currentCategory) {
            i++;
            continue;
        }

        if (currentCategory === EventCategory.Snack && ignoreSnackCategoryFromText) {
            i++; 
            continue;
        }
        
        const dateStr = line;
        const dateStrPartsTest = dateStr.split('/');
        if (dateStrPartsTest.length !== 3 || !/^\d{1,2}$/.test(dateStrPartsTest[0]) || !/^\d{1,2}$/.test(dateStrPartsTest[1]) || !/^\d{4}$/.test(dateStrPartsTest[2])) {
            i++;
            continue;
        }

        let title: string | null = null;
        let details: string = "";
        let advanceLines = 0;

        const nameLineCandidate = lines[i+1]?.trim();
        const nextLineIsNewCategoryOrDate = nameLineCandidate && 
                                           (/^(SNACKS|QT|BIRTHDAY|EVENT)/i.test(nameLineCandidate) || 
                                            /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(nameLineCandidate));

        if (nameLineCandidate && !nextLineIsNewCategoryOrDate) {
            title = nameLineCandidate;
            advanceLines = 2; 
            switch(currentCategory) {
                case EventCategory.Snack: details = title; break; 
                case EventCategory.QT: details = `QT with ${title}.`; break;
                case EventCategory.Birthday: details = `Happy Birthday ${title}!`; break;
                case EventCategory.Event: details = ""; break; 
            }
        } else {
            i++; 
            continue;
        }
        
        const day = parseInt(dateStrPartsTest[0], 10);
        const month = parseInt(dateStrPartsTest[1], 10) - 1; 
        const year = parseInt(dateStrPartsTest[2], 10);

        if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            i += advanceLines;
            continue;
        }
        
        const date = new Date(Date.UTC(year, month, day)); 
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
            i += advanceLines;
            continue;
        }
        
        eventsToCreate.push({
            title: title!, 
            date: date.toISOString(), 
            category: currentCategory as EventCategory, 
            details: details,
            summary: '', 
        });
        
        i += advanceLines;
    }

    let eventsAddedFromTextCount = 0;

    if (eventsToCreate.length > 0) {
      const creationPromises = eventsToCreate.map(async eventData => {
        try {
          await addEvent(eventData);
          eventsAddedFromTextCount++;
        } catch (error: any) {
          console.error(`Batch Import: Failed to add event "${eventData.title}"`, error);
        }
      });
      await Promise.allSettled(creationPromises);
    }
    return { 
      eventsAddedFromTextCount, 
      eventsParsedFromTextCount: eventsToCreate.length,
    };
  };

  async function onSubmit(data: BatchImportFormValues) {
    setIsLoading(true);

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
          summary: '', 
        };
        try {
          await addEvent(snackEvent);
        } catch (error: any) {
          console.error(`Rota: Failed to add snack event for ${name}`, error);
        }
        currentDate = addDays(currentDate, 7);
      }
    }

    if (data.batchText && data.batchText.trim() !== '') {
      await parseAndCreateEventsFromText(data.batchText, rotaFieldsAreUsed);
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription className="text-xs">If using the Snack Rota, select the first Sunday/date for snacks.</FormDescription>
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
                <FormDescription className="text-xs">Comma-separated. Events created weekly from start date.</FormDescription>
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
              <FormLabel>Event Data (for QT, Birthday, Event types)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
`Example for QT/Birthday/Event:
QT
01/06/2025
Ada Lovelace

EVENT
04/07/2025
Community BBQ
(Event details are added via Edit Event)

If Snack Rota fields (above) are NOT used, you can also add Snacks here like:
SNACKS
10/06/2025
Bob
`
                  }
                  {...field}
                  value={field.value ?? ''} 
                  rows={10}
                  className="text-sm font-mono"
                />
              </FormControl>
              <FormDescription className="text-xs">
                Define categories (QT, BIRTHDAY, EVENT), then DD/MM/YYYY dates, then names/titles on new lines.
                If Snack Rota fields above are filled, any 'SNACKS' section here will be ignored.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="pt-4 border-t"> 
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Importing Events...' : 'Import Events'}
        </Button>
        </div>
      </form>
    </Form>
  );
}
