
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/hooks/use-events';
import { AppEvent, EventCategory } from '@/types';

const batchImportSchema = z.object({
  batchText: z.string().min(10, { message: "Batch text must be at least 10 characters." })
    .max(10000, { message: "Batch text input is too long (max 10000 characters)." }), // Increased max length
});

type BatchImportFormValues = z.infer<typeof batchImportSchema>;

export default function BatchEventImportForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addEvent } = useEvents();

  const form = useForm<BatchImportFormValues>({
    resolver: zodResolver(batchImportSchema),
    defaultValues: {
      batchText: "",
    },
  });

  const parseAndCreateEvents = async (rawInput: string) => {
    const eventsToCreate: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const lines = rawInput.trim().split('\n');
    let currentCategory: EventCategory | null = null;
    let parseErrors: string[] = [];
    let eventsProcessed = 0;
    let i = 0;

    while (i < lines.length) {
        let line = lines[i]?.trim();
        if (!line) { // Skip empty lines
            i++;
            continue;
        }

        // Check for category headers
        const upperLine = line.toUpperCase();
        let newCategory: EventCategory | null = null;

        if (upperLine.startsWith("SNACKS")) {
            newCategory = EventCategory.Snack;
        } else if (upperLine.startsWith("QT")) {
            newCategory = EventCategory.QT;
        } else if (upperLine.startsWith("BIRTHDAY")) { // Handles "BIRTHDAY" or "BIRTHDAYS"
            newCategory = EventCategory.Birthday;
        } else if (upperLine.startsWith("EVENT")) { // Handles "EVENT" or "EVENTS"
            newCategory = EventCategory.Event;
        }

        if (newCategory) {
            currentCategory = newCategory;
            parseErrors.push(`Switched to category: ${currentCategory}`); // Info for user
            i++; // Move to the next line after category header
            continue; // Start parsing for this new category
        }

        if (!currentCategory) {
            // This line is not a category header and no category is active. Skip it.
            // Can add to parseErrors if verbose logging is desired: parseErrors.push(`Skipping line (no active category or not a category header): "${line}"`);
            i++;
            continue;
        }

        // At this point, we have a currentCategory, and the line is not a category header.
        // So, it should be a date.
        const dateStr = line;

        const dateStrPartsTest = dateStr.split('/');
        if (dateStrPartsTest.length !== 3 || !/^\d{1,2}$/.test(dateStrPartsTest[0]) || !/^\d{1,2}$/.test(dateStrPartsTest[1]) || !/^\d{4}$/.test(dateStrPartsTest[2])) {
            parseErrors.push(`Skipping line under category "${currentCategory}": "${dateStr}". Expected DD/MM/YYYY date format or it's an unrecognised line.`);
            i++;
            continue;
        }

        if (i + 1 >= lines.length) {
            parseErrors.push(`Missing name for date: "${dateStr}" under category "${currentCategory}". Reached end of input.`);
            break;
        }
        
        const title = lines[i+1]?.trim();

        if (!title) {
            parseErrors.push(`Missing name for date: "${dateStr}" under category "${currentCategory}". Name line is empty. Skipping entry.`);
            i += 2; // Skip date and empty name line
            continue;
        }
        
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(title)) {
            parseErrors.push(`Date "${dateStr}" under category "${currentCategory}" is missing its name. The next line "${title}" appears to be another date. Skipping date "${dateStr}".`);
            i += 1; // Skip current date line, process next line as a new date in the next iteration
            continue;
        }
        
        const day = parseInt(dateStrPartsTest[0], 10);
        const month = parseInt(dateStrPartsTest[1], 10) - 1; 
        const year = parseInt(dateStrPartsTest[2], 10);

        if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            parseErrors.push(`Invalid date components (day, month, or year out of range) in: "${dateStr}" under category "${currentCategory}". Skipping entry.`);
            i += 2; // Skip date and name
            continue;
        }
        
        const date = new Date(Date.UTC(year, month, day)); 
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
             parseErrors.push(`Invalid date constructed from: "${dateStr}" (e.g., 31/02/2025) under category "${currentCategory}". Skipping entry.`);
            i += 2; // Skip date and name
            continue;
        }

        let details = "";
        switch(currentCategory) {
            case EventCategory.Snack:
                details = `${title} is bringing snacks.`;
                break;
            case EventCategory.QT:
                details = `QT with ${title}.`;
                break;
            case EventCategory.Birthday:
                details = `Happy Birthday ${title}!`;
                break;
            case EventCategory.Event:
                // For batch 'Event', title is usually sufficient. Details can be added manually later.
                details = `Event: ${title}`; 
                break;
        }

        eventsToCreate.push({
            title,
            date: date.toISOString(), 
            category: currentCategory as EventCategory, 
            details: details
        });
        
        i += 2; // Consumed date and title lines
    }

    if (eventsToCreate.length > 0) {
      for (const eventData of eventsToCreate) {
        try {
          await addEvent(eventData);
          eventsProcessed++;
        } catch (error: any) {
          parseErrors.push(`Failed to add event "${eventData.title}" on ${eventData.date.substring(0,10)}: ${error.message}`);
        }
      }
    }

    return { eventsProcessed, parseErrors };
  };

  async function onSubmit(data: BatchImportFormValues) {
    setIsLoading(true);
    
    const { eventsProcessed, parseErrors } = await parseAndCreateEvents(data.batchText);

    const errorMessages = parseErrors.filter(msg => !msg.startsWith("Switched to category:")); // Filter out info messages
    const infoMessages = parseErrors.filter(msg => msg.startsWith("Switched to category:"));


    if (errorMessages.length > 0) {
      toast({
        title: eventsProcessed > 0 ? `Batch Import Partially Completed` : `Batch Import Failed`,
        description: (
          <div className="max-h-60 overflow-y-auto">
            {eventsProcessed > 0 && <p className="mb-1 font-semibold">{eventsProcessed} event(s) successfully added.</p>}
            {infoMessages.length > 0 && (
              <>
                <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info:</p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
                  {infoMessages.map((info, idx) => <li key={`info-${idx}`}>{info}</li>)}
                </ul>
              </>
            )}
            <p className="mt-2 mb-1 font-semibold">Please review the following issues:</p>
            <ul className="list-disc pl-4 text-xs">
              {errorMessages.map((err, idx) => <li key={`err-${idx}`}>{err}</li>)}
            </ul>
          </div>
        ),
        variant: "destructive",
        duration: 20000, 
      });
    } else if (eventsProcessed > 0) {
      toast({
        title: "Batch Import Successful!",
        description: (
           <div className="max-h-60 overflow-y-auto">
            <p className="mb-1 font-semibold">{eventsProcessed} event(s) successfully added.</p>
            {infoMessages.length > 0 && (
              <>
                <p className="text-xs mt-2 mb-1 text-muted-foreground">Processing Info:</p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
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
            description: "No new events were processed. Please check your input format or content. If you included category headers, they might be listed under 'Processing Info'.",
            variant: "default", 
            duration: 10000,
        });
    }

    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
        <FormField
          control={form.control}
          name="batchText"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Example:
Snacks
25/05/2025
Isaac (L) Lee

01/06/2025
Jun Chang

QT
19/05/2025
Shep. Claire Lee
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
        </div>
        <div className="pt-4 border-t"> 
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Importing Events...' : 'Import Events'}
        </Button>
        </div>
      </form>
    </Form>
  );
}

