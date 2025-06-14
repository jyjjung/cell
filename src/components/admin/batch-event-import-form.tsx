
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input'; // Added Input
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/hooks/use-events';
import { AppEvent, EventCategory } from '@/types';

const batchImportSchema = z.object({
  batchText: z.string().min(10, { message: "Batch text must be at least 10 characters." })
    .max(10000, { message: "Batch text input is too long (max 10000 characters)." }),
  snackRota: z.string().optional(), // Comma-separated list of names for snack rota
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
      snackRota: '',
    },
  });

  const parseAndCreateEvents = async (rawInput: string, snackRotaStr?: string) => {
    const eventsToCreate: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const lines = rawInput.trim().split('\n');
    let currentCategory: EventCategory | null = null;
    let localParseErrors: string[] = [];
    
    const rotaNames = snackRotaStr ? snackRotaStr.split(',').map(name => name.trim()).filter(name => name) : [];
    let rotaIndex = 0;
    
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
            localParseErrors.push(`Switched to category: ${currentCategory}`);
            i++;
            continue;
        }

        if (!currentCategory) {
            localParseErrors.push(`Skipping line (no active category): "${line}". Ensure a category is defined.`);
            i++;
            continue;
        }
        
        // Check if the current line is a date
        const dateStr = line;
        const dateStrPartsTest = dateStr.split('/');
        if (dateStrPartsTest.length !== 3 || !/^\d{1,2}$/.test(dateStrPartsTest[0]) || !/^\d{1,2}$/.test(dateStrPartsTest[1]) || !/^\d{4}$/.test(dateStrPartsTest[2])) {
            localParseErrors.push(`Skipping line under category "${currentCategory}": "${dateStr}". Not a DD/MM/YYYY date or unrecognised line.`);
            i++;
            continue;
        }

        // Date line confirmed
        let title: string | null = null;
        let details: string = "";
        let advanceLines = 0;

        const nameLineCandidate = lines[i+1]?.trim();
        const nextLineIsNewCategoryOrDate = nameLineCandidate && 
                                           (/^(SNACKS|QT|BIRTHDAY|EVENT)/i.test(nameLineCandidate) || 
                                            /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(nameLineCandidate));

        if (currentCategory === EventCategory.Snack && rotaNames.length > 0 && (!nameLineCandidate || nextLineIsNewCategoryOrDate)) {
            // Snack Rota case: Name is missing or next line is not a name. Use rota.
            title = rotaNames[rotaIndex % rotaNames.length];
            details = `${title} is bringing snacks.`;
            rotaIndex++;
            advanceLines = 1; // Consumed only the date line from input
        } else if (nameLineCandidate && !nextLineIsNewCategoryOrDate) {
            // Normal case: Name is provided on the next line
            title = nameLineCandidate;
            advanceLines = 2; // Consumed date and name lines
            // Generate details based on category and title
            switch(currentCategory) {
                case EventCategory.Snack: details = `${title} is bringing snacks.`; break;
                case EventCategory.QT: details = `QT with ${title}.`; break;
                case EventCategory.Birthday: details = `Happy Birthday ${title}!`; break;
                case EventCategory.Event: details = ""; break; // Event details are typically longer, start empty
            }
        } else {
            // Date line, but no name line available and not a snack rota case.
            localParseErrors.push(`Missing name/title for date: "${dateStr}" under category "${currentCategory}".`);
            i++; // Skip this problematic date line
            continue;
        }
        
        const day = parseInt(dateStrPartsTest[0], 10);
        const month = parseInt(dateStrPartsTest[1], 10) - 1; 
        const year = parseInt(dateStrPartsTest[2], 10);

        if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            localParseErrors.push(`Invalid date components in: "${dateStr}" under category "${currentCategory}". Skipping.`);
            i += advanceLines; // Advance past consumed lines before continuing
            continue;
        }
        
        const date = new Date(Date.UTC(year, month, day)); 
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
             localParseErrors.push(`Invalid date constructed from: "${dateStr}" (e.g., 31/02/2025) under category "${currentCategory}". Skipping.`);
            i += advanceLines;
            continue;
        }
        
        eventsToCreate.push({
            title: title!, // title will be set by logic above
            date: date.toISOString(), 
            category: currentCategory as EventCategory, // currentCategory is guaranteed non-null here
            details: details,
            summary: '', // Batch imported events start with no summary
        });
        
        i += advanceLines;
    }

    let eventsSuccessfullyAddedCount = 0;
    const eventAddErrors: string[] = [];

    if (eventsToCreate.length > 0) {
      const creationPromises = eventsToCreate.map(eventData =>
        addEvent(eventData)
          .then(() => {
            eventsSuccessfullyAddedCount++;
          })
          .catch((error: any) => {
            let dateForError = 'unknown date';
            try {
              dateForError = eventData.date ? new Date(eventData.date).toLocaleDateString() : 'unknown date';
            } catch (_) { /* ignore */ }
            eventAddErrors.push(`Failed to add event "${eventData.title}" on ${dateForError}: ${error.message}`);
          })
      );
      await Promise.allSettled(creationPromises);
    }

    const combinedErrors = [...localParseErrors, ...eventAddErrors];
    return { 
      eventsSuccessfullyAddedCount, 
      eventsParsedCount: eventsToCreate.length,
      finalErrorMessages: combinedErrors
    };
  };

  async function onSubmit(data: BatchImportFormValues) {
    setIsLoading(true);
    
    const { eventsSuccessfullyAddedCount, eventsParsedCount, finalErrorMessages } = await parseAndCreateEvents(data.batchText, data.snackRota);

    const infoMessages = finalErrorMessages.filter(msg => msg.startsWith("Switched to category:") || msg.startsWith("Skipping line (no active category):"));
    const actualErrors = finalErrorMessages.filter(msg => !infoMessages.includes(msg));


    if (actualErrors.length > 0 || eventsSuccessfullyAddedCount < eventsParsedCount) {
      toast({
        title: eventsSuccessfullyAddedCount > 0 && eventsSuccessfullyAddedCount < eventsParsedCount ? `Batch Import Partially Completed` : (eventsSuccessfullyAddedCount === 0 && eventsParsedCount > 0 ? `Batch Import Failed` : `Batch Import Notice`),
        description: (
          <div className="max-h-60 overflow-y-auto text-xs">
            <p className="mb-1 font-semibold">{eventsSuccessfullyAddedCount} of {eventsParsedCount} potential event(s) successfully added.</p>
            {infoMessages.length > 0 && (
              <>
                <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info:</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {infoMessages.map((info, idx) => <li key={`info-${idx}`}>{info}</li>)}
                </ul>
              </>
            )}
            {actualErrors.length > 0 && (
              <>
                <p className="mt-2 mb-1 font-semibold">Please review the following issues:</p>
                <ul className="list-disc pl-4">
                  {actualErrors.map((err, idx) => <li key={`err-${idx}`}>{err}</li>)}
                </ul>
              </>
            )}
          </div>
        ),
        variant: actualErrors.length > 0 || (eventsParsedCount > 0 && eventsSuccessfullyAddedCount < eventsParsedCount) ? "destructive" : "default",
        duration: 20000, 
      });
    } else if (eventsSuccessfullyAddedCount > 0) {
      toast({
        title: "Batch Import Successful!",
        description: (
           <div className="max-h-60 overflow-y-auto text-xs">
            <p className="mb-1 font-semibold">{eventsSuccessfullyAddedCount} event(s) successfully added.</p>
             {infoMessages.length > 0 && (
              <>
                <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info:</p>
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
            title: "Batch Import Notice",
            description: (
              <div className="max-h-60 overflow-y-auto text-xs">
                <p>No new events were parsed or added from your input.</p>
                {infoMessages.length > 0 && (
                  <>
                    <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info:</p>
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {infoMessages.map((info, idx) => <li key={`info-${idx}`}>{info}</li>)}
                    </ul>
                  </>
                )}
                {actualErrors.length > 0 && ( // Should be rare here, but just in case
                  <>
                    <p className="mt-2 mb-1 font-semibold">Issues found:</p>
                    <ul className="list-disc pl-4">
                      {actualErrors.map((err, idx) => <li key={`err-${idx}`}>{err}</li>)}
                    </ul>
                  </>
                )}
              </div>
            ),
            variant: "default", 
            duration: 15000,
        });
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="batchText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Data</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Example:
Snacks
25/05/2025
Isaac (L) Lee
(Or leave name blank for rota if Snack Rota is filled below)
01/06/2025 

Birthdays
01/01/2025
Ada Lovelace

Events
04/07/2025
Community BBQ
(Details for 'Event' type are added via Edit Event form)
"
                  {...field}
                  rows={10}
                  className="text-sm font-mono"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="snackRota"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Snack Rota Names (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Alice,Bob,Charlie,David" 
                  {...field} 
                  className="text-sm"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Comma-separated. If provided, and a snack date has no name, one will be assigned from this list.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4 border-t"> 
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Importing Events...' : 'Import Events'}
        </Button>
        </div>
      </form>
    </Form>
  );
}

