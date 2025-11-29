
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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const form = useForm<BatchImportFormValues>({
    resolver: zodResolver(batchImportSchema),
    defaultValues: {
      batchText: '',
      snackRotaNames: '',
      snackRotaStartDate: undefined,
    },
  });

  const parseAndCreateEventsFromText = async (rawInput: string, ignoreSnackCategoryFromText: boolean): Promise<{ eventsAdded: number; eventsParsed: number; errors: string[] }> => {
    const eventsToCreate: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const errors: string[] = [];
    let currentCategory: EventCategory | null = null;
  
    const categoryRegex = /^(SNACKS|QT|BIRTHDAY|EVENT)\s*$/im;
    const hasCategoryHeaders = categoryRegex.test(rawInput);
  
    const processBlock = (dataBlock: string, category: EventCategory | null) => {
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
  
        // Default to 'Event' if no category is specified
        const finalCategory = category || EventCategory.Event;

        // Skip snacks from text if rota is used
        if (finalCategory === EventCategory.Snack && ignoreSnackCategoryFromText) continue;

        eventsToCreate.push({
          title,
          date: date.toISOString(),
          category: finalCategory,
          details: finalCategory === EventCategory.Birthday ? `Happy Birthday ${title}!` : '',
          summary: '',
        });
      }
    };
  
    if (hasCategoryHeaders) {
      const parts = rawInput.trim().split(categoryRegex).filter(p => p.trim() !== '');
      for (let i = 0; i < parts.length; i += 2) {
        const categoryStr = parts[i].trim().toUpperCase();
        const dataBlock = parts[i+1]?.trim();
  
        if (!dataBlock) continue;
  
        if (categoryStr === "SNACKS") currentCategory = EventCategory.Snack;
        else if (categoryStr === "QT") currentCategory = EventCategory.QT;
        else if (categoryStr === "BIRTHDAY") currentCategory = EventCategory.Birthday;
        else if (categoryStr === "EVENT") currentCategory = EventCategory.Event;
        else continue;
  
        processBlock(dataBlock, currentCategory);
      }
    } else {
      // No category headers found, treat the whole text as a single block
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
          summary: '', 
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
      const textResult = await parseAndCreateEventsFromText(data.batchText, rotaFieldsAreUsed);
      totalAdded += textResult.eventsAdded;
      totalParsed += textResult.eventsParsed;
      allErrors.push(...textResult.errors);
    }
    
    if (totalParsed > 0 || allErrors.length > 0) {
      if (allErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Import Complete with Errors",
          description: `Added ${totalAdded} of ${totalParsed} events. Errors: ${allErrors.join(', ')}`,
        });
      } else {
        toast({
          title: "Import Successful",
          description: `Successfully added ${totalAdded} events.`,
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
`EVENT
04/07/2025
Community BBQ
This is a multi-line detail.
Everyone is welcome.

QT
01/06/2025
Ada Lovelace

BIRTHDAY
09/12/2025
Grace Hopper

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
                Use category headers (QT, BIRTHDAY, EVENT). Each event requires a DD/MM/YYYY date and a title on new lines. Multi-line details are optional.
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
