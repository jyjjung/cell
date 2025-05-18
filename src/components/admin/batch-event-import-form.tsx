
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/hooks/use-events';
import { AppEvent, EventCategory } from '@/types';
import { ClipboardPaste } from 'lucide-react';

const batchImportSchema = z.object({
  batchText: z.string().min(10, { message: "Batch text must be at least 10 characters." })
    .max(5000, { message: "Batch text input is too long (max 5000 characters)." }),
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

    if (lines.length === 0) {
        parseErrors.push("Input is empty.");
        return { eventsProcessed, parseErrors };
    }
    
    const categoryLine = lines[0].trim().toUpperCase();
    if (categoryLine.startsWith("SNACKS:")) {
        currentCategory = EventCategory.Snack;
    } else if (categoryLine.startsWith("QT:")) {
        currentCategory = EventCategory.QT;
    } else {
        parseErrors.push("Invalid or missing category line. Must start with 'Snacks:' or 'QT:'.");
        return { eventsProcessed, parseErrors };
    }

    let i = 1; // Start parsing from the line after category
    while (i < lines.length) {
        const dateStr = lines[i]?.trim();
        if (!dateStr) { // Skip empty lines between entries
            i++;
            continue;
        }
        const title = lines[i+1]?.trim();

        if (!title) {
            parseErrors.push(`Missing title for date: ${dateStr || 'Unknown date'}`);
            i += 1; // Move past date line at least
            continue;
        }
        
        // Validate and parse date DD/MM/YYYY
        const dateParts = dateStr.split('/');
        if (dateParts.length !== 3) {
            parseErrors.push(`Invalid date format: "${dateStr}". Expected DD/MM/YYYY.`);
            i += 2; // Move past this pair
            continue;
        }
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JS Date
        const year = parseInt(dateParts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            parseErrors.push(`Invalid date components in: "${dateStr}".`);
            i += 2;
            continue;
        }
        
        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) {
            parseErrors.push(`Invalid date constructed: "${dateStr}".`);
            i += 2;
            continue;
        }

        eventsToCreate.push({
            title,
            date: date.toISOString(),
            category: currentCategory as EventCategory, // Category is confirmed not null here
            details: currentCategory === EventCategory.Snack ? `${title} is bringing snacks.` : `QT with ${title}.`
        });
        
        i += 2; // Move to the next potential date line
    }

    if (eventsToCreate.length > 0) {
      for (const eventData of eventsToCreate) {
        try {
          await addEvent(eventData);
          eventsProcessed++;
        } catch (error: any) {
          parseErrors.push(`Failed to add event "${eventData.title}": ${error.message}`);
        }
      }
    } else if (parseErrors.length === 0 && lines.length > 1) { // Processed category but no valid events
        parseErrors.push("No valid event entries found after the category line.");
    }


    return { eventsProcessed, parseErrors };
  };


  async function onSubmit(data: BatchImportFormValues) {
    setIsLoading(true);
    
    const { eventsProcessed, parseErrors } = await parseAndCreateEvents(data.batchText);

    if (parseErrors.length > 0) {
      toast({
        title: `Batch Import Partially Failed (Processed ${eventsProcessed} events)`,
        description: (
          <div className="max-h-40 overflow-y-auto">
            <p>Please correct the following errors and try again:</p>
            <ul className="list-disc pl-5">
              {parseErrors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          </div>
        ),
        variant: "destructive",
        duration: 10000, // Keep error toast longer
      });
    } else if (eventsProcessed > 0) {
      toast({
        title: "Batch Import Successful!",
        description: `${eventsProcessed} events were successfully added.`,
      });
      form.reset(); // Clear form on success
    } else {
         toast({
            title: "Batch Import Notice",
            description: "No events were processed. Please check your input format.",
            variant: "default", // Use default or warning, not destructive if no actual errors occurred
        });
    }

    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1 border rounded-lg shadow-md bg-card mt-1">
        <div className="flex items-center space-x-2 mb-4 p-4">
            <ClipboardPaste className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold">Import Multiple Events</h3>
        </div>
        <div className="px-4 space-y-6">
        <FormField
          control={form.control}
          name="batchText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batch Event Text</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Example:
Snacks:
25/05/2025
Isaac (L) Lee

01/06/2025
Jun Chang

QT:
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
        <div className="p-4 border-t">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Importing Events...' : 'Import Events'}
        </Button>
        </div>
      </form>
    </Form>
  );
}
