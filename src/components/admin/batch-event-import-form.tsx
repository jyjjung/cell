
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
import { useToast } from '@/hooks/use-toast';
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

  if (namesProvided && !dateProvided) return false; // Names given, but no date
  if (dateProvided && !namesProvided) return false; // Date given, but no names
  return true; // Either both provided (and names not just whitespace) or neither provided
}, {
  message: "Snack Rota Start Date and Names must be provided together, or neither should be filled.",
  path: ["snackRotaStartDate"], // Apply error message to one of the fields
});


type BatchImportFormValues = z.infer<typeof batchImportSchema>;

export default function BatchEventImportForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addEvent } = useEvents();

  const form = useForm<BatchImportFormValues>({
    resolver: zodResolver(batchImportSchema),
    defaultValues: {
      batchText: '',
      snackRotaNames: '',
      snackRotaStartDate: undefined,
    },
  });

  const parseAndCreateEventsFromText = async (rawInput: string, ignoreSnackCategoryFromText: boolean) => {
    const eventsToCreate: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const lines = rawInput.trim().split('\n');
    let currentCategory: EventCategory | null = null;
    let localParseErrors: string[] = [];
    
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
            if (currentCategory === EventCategory.Snack && ignoreSnackCategoryFromText) {
                localParseErrors.push(`Info: Switched to category '${currentCategory}', but it will be ignored in the text area due to Rota fields usage.`);
            } else {
                localParseErrors.push(`Info: Switched to category: ${currentCategory}.`);
            }
            i++;
            continue;
        }

        if (!currentCategory) {
            localParseErrors.push(`Skipping line (no active category): "${line}". Ensure a category (SNACKS, QT, BIRTHDAY, EVENT) is defined before dates/names.`);
            i++;
            continue;
        }

        if (currentCategory === EventCategory.Snack && ignoreSnackCategoryFromText) {
            i++; // Skip lines under an ignored Snack category in the text
            continue;
        }
        
        const dateStr = line;
        const dateStrPartsTest = dateStr.split('/');
        if (dateStrPartsTest.length !== 3 || !/^\d{1,2}$/.test(dateStrPartsTest[0]) || !/^\d{1,2}$/.test(dateStrPartsTest[1]) || !/^\d{4}$/.test(dateStrPartsTest[2])) {
            localParseErrors.push(`Skipping line under category "${currentCategory}": "${dateStr}". Not a DD/MM/YYYY date or unrecognised line.`);
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
                case EventCategory.Snack: details = `${title} is bringing snacks.`; break;
                case EventCategory.QT: details = `QT with ${title}.`; break;
                case EventCategory.Birthday: details = `Happy Birthday ${title}!`; break;
                case EventCategory.Event: details = ""; break;
            }
        } else {
            localParseErrors.push(`Missing name/title for date: "${dateStr}" under category "${currentCategory}". Each date needs a name/title on the next line.`);
            i++; 
            continue;
        }
        
        const day = parseInt(dateStrPartsTest[0], 10);
        const month = parseInt(dateStrPartsTest[1], 10) - 1; 
        const year = parseInt(dateStrPartsTest[2], 10);

        if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            localParseErrors.push(`Invalid date components in: "${dateStr}" under category "${currentCategory}". Skipping.`);
            i += advanceLines;
            continue;
        }
        
        const date = new Date(Date.UTC(year, month, day)); 
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
             localParseErrors.push(`Invalid date constructed from: "${dateStr}" (e.g., 31/02/2025) under category "${currentCategory}". Skipping.`);
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
    const textEventAddErrors: string[] = [];

    if (eventsToCreate.length > 0) {
      const creationPromises = eventsToCreate.map(eventData =>
        addEvent(eventData)
          .then(() => {
            eventsAddedFromTextCount++;
          })
          .catch((error: any) => {
            let dateForError = 'unknown date';
            try { dateForError = eventData.date ? new Date(eventData.date).toLocaleDateString() : 'unknown date'; } catch (_) {}
            textEventAddErrors.push(`Text Import: Failed to add event "${eventData.title}" on ${dateForError}: ${error.message}`);
          })
      );
      await Promise.allSettled(creationPromises);
    }
    const combinedTextErrors = [...localParseErrors, ...textEventAddErrors];
    return { 
      eventsAddedFromTextCount, 
      eventsParsedFromTextCount: eventsToCreate.length,
      finalTextErrorMessages: combinedTextErrors
    };
  };

  async function onSubmit(data: BatchImportFormValues) {
    setIsLoading(true);
    let rotaSnacksAdded = 0;
    const rotaSnackErrors: string[] = [];
    let batchTextAdded = 0;
    let batchTextParsed = 0;
    let batchTextErrorMessages: string[] = [];

    const rotaFieldsAreUsed = !!(data.snackRotaNames && data.snackRotaNames.trim() !== '' && data.snackRotaStartDate);

    if (rotaFieldsAreUsed) {
      const names = data.snackRotaNames!.trim().split(',').map(name => name.trim()).filter(name => name);
      let currentDate = data.snackRotaStartDate!;

      for (const name of names) {
        const snackEvent: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'> = {
          title: `${name} is bringing snacks.`,
          date: currentDate.toISOString(),
          category: EventCategory.Snack,
          details: `${name} is bringing snacks.`,
          summary: '',
        };
        try {
          await addEvent(snackEvent);
          rotaSnacksAdded++;
        } catch (error: any) {
          rotaSnackErrors.push(`Rota: Failed to add snack event for ${name} on ${format(currentDate, "PP")}: ${error.message}`);
        }
        currentDate = addDays(currentDate, 7);
      }
    }

    if (data.batchText && data.batchText.trim() !== '') {
      const { eventsAddedFromTextCount, eventsParsedFromTextCount, finalTextErrorMessages } = await parseAndCreateEventsFromText(data.batchText, rotaFieldsAreUsed);
      batchTextAdded = eventsAddedFromTextCount;
      batchTextParsed = eventsParsedFromTextCount;
      batchTextErrorMessages = finalTextErrorMessages;
    }
    
    const totalAdded = rotaSnacksAdded + batchTextAdded;
    const totalRotaProcessed = rotaFieldsAreUsed ? data.snackRotaNames!.trim().split(',').map(name => name.trim()).filter(name => name).length : 0;
    const infoMessages = batchTextErrorMessages.filter(msg => msg.startsWith("Info:"));
    const actualParseAndAddErrors = [
        ...rotaSnackErrors, 
        ...batchTextErrorMessages.filter(msg => !infoMessages.includes(msg))
    ];

    if (actualParseAndAddErrors.length > 0 || (totalRotaProcessed > 0 && rotaSnacksAdded < totalRotaProcessed) || (batchTextParsed > 0 && batchTextAdded < batchTextParsed)) {
      toast({
        title: totalAdded > 0 ? "Batch Import Partially Completed" : ( (totalRotaProcessed > 0 || batchTextParsed > 0) ? "Batch Import Failed" : "Batch Import Notice"),
        description: (
          <div className="max-h-60 overflow-y-auto text-xs">
            {rotaFieldsAreUsed && <p className="mb-1 font-semibold">Rota Snacks: {rotaSnacksAdded} of {totalRotaProcessed} event(s) added.</p>}
            {(data.batchText && data.batchText.trim() !== '') && <p className="mb-1 font-semibold">Text Import: {batchTextAdded} of {batchTextParsed} potential event(s) added.</p>}
            
            {infoMessages.length > 0 && (
              <>
                <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info from Text Import:</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {infoMessages.map((info, idx) => <li key={`info-${idx}`}>{info}</li>)}
                </ul>
              </>
            )}
            {actualParseAndAddErrors.length > 0 && (
              <>
                <p className="mt-2 mb-1 font-semibold">Please review the following issues:</p>
                <ul className="list-disc pl-4">
                  {actualParseAndAddErrors.map((err, idx) => <li key={`err-${idx}`}>{err}</li>)}
                </ul>
              </>
            )}
          </div>
        ),
        variant: actualParseAndAddErrors.length > 0 || (totalRotaProcessed > 0 && rotaSnacksAdded < totalRotaProcessed) || (batchTextParsed > 0 && batchTextAdded < batchTextParsed) ? "destructive" : "default",
        duration: 20000, 
      });
    } else if (totalAdded > 0) {
      toast({
        title: "Batch Import Successful!",
        description: (
           <div className="max-h-60 overflow-y-auto text-xs">
            {rotaFieldsAreUsed && <p className="mb-1 font-semibold">Rota Snacks: {rotaSnacksAdded} event(s) successfully added.</p>}
            {(data.batchText && data.batchText.trim() !== '') && <p className="mb-1 font-semibold">Text Import: {batchTextAdded} event(s) successfully added.</p>}
             {infoMessages.length > 0 && (
              <>
                <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info from Text Import:</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {infoMessages.map((info, idx) => <li key={`info-${idx}`}>{info}</li>)}
                </ul>
              </>
            )}
           </div>
        ),
        duration: 10000,
      });
      form.reset(); 
    } else { 
         toast({
            title: "Batch Import: No Changes",
            description: "No new events were generated from Rota or parsed from the text input.",
            variant: "default", 
            duration: 8000,
        });
    }
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
                  value={field.value ?? ''} // Ensure value is never null/undefined for Textarea
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

    