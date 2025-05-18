
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
        parseErrors.push("Invalid or missing category line on the first line. Must start with 'Snacks:' or 'QT:'.");
        return { eventsProcessed, parseErrors };
    }

    let i = 1; 
    while (i < lines.length) {
        const dateStr = lines[i]?.trim();
        
        if (!dateStr) { 
            i++;
            continue;
        }

        const dateStrPartsTest = dateStr.split('/');
        if (dateStrPartsTest.length !== 3 || !/^\d{1,2}$/.test(dateStrPartsTest[0]) || !/^\d{1,2}$/.test(dateStrPartsTest[1]) || !/^\d{4}$/.test(dateStrPartsTest[2])) {
            parseErrors.push(`Invalid date format for entry: "${dateStr}". Expected DD/MM/YYYY. Skipping this line.`);
            i += 1; 
            continue;
        }

        if (i + 1 >= lines.length) { 
            parseErrors.push(`Missing name for date: "${dateStr}". Reached end of input.`);
            break; 
        }
        
        const title = lines[i+1]?.trim();

        if (!title) { 
            parseErrors.push(`Missing name for date: "${dateStr}". Name line is empty. Skipping entry.`);
            i += 2; 
            continue;
        }

        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(title)) {
            parseErrors.push(`Date "${dateStr}" is missing its name. The next line "${title}" appears to be another date. Skipping date "${dateStr}".`);
            i += 1; 
            continue;
        }
        
        const day = parseInt(dateStrPartsTest[0], 10);
        const month = parseInt(dateStrPartsTest[1], 10) - 1; 
        const year = parseInt(dateStrPartsTest[2], 10);

        if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            parseErrors.push(`Invalid date components (day, month, or year out of range) in: "${dateStr}". Skipping entry.`);
            i += 2; 
            continue;
        }
        
        const date = new Date(Date.UTC(year, month, day)); 
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
             parseErrors.push(`Invalid date constructed from: "${dateStr}" (e.g., 31/02/2025). Skipping entry.`);
            i += 2;
            continue;
        }

        eventsToCreate.push({
            title,
            date: date.toISOString(), // Store as full ISO string
            category: currentCategory as EventCategory, 
            details: currentCategory === EventCategory.Snack ? `${title} is bringing snacks.` : `QT with ${title}.`
        });
        
        i += 2; 
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

    if (parseErrors.length > 0) {
      toast({
        title: eventsProcessed > 0 ? `Batch Import Partially Completed` : `Batch Import Failed`,
        description: (
          <div className="max-h-60 overflow-y-auto">
            {eventsProcessed > 0 && <p className="mb-2">{eventsProcessed} event(s) successfully added.</p>}
            <p>Please review the following issues:</p>
            <ul className="list-disc pl-5 mt-1">
              {parseErrors.map((err, idx) => <li key={idx} className="text-xs">{err}</li>)}
            </ul>
          </div>
        ),
        variant: "destructive",
        duration: 15000, 
      });
    } else if (eventsProcessed > 0) {
      toast({
        title: "Batch Import Successful!",
        description: `${eventsProcessed} event(s) were successfully added.`,
      });
      form.reset(); 
    } else { // No errors, no events processed (e.g. only category line or empty input after category)
         toast({
            title: "Batch Import Notice",
            description: "No new events were processed. Please check your input format or content.",
            variant: "default", 
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

