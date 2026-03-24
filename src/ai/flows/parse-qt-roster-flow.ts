
'use server';
/**
 * @fileOverview AI flow to parse monthly QT rosters from images.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseQTRosterInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI of the roster image."),
  year: z.number().describe("The year the calendar belongs to."),
});

const ParseQTRosterOutputSchema = z.object({
  month: z.number().describe("Identified month number (1-12)."),
  assignments: z.array(z.object({
    day: z.number().describe("Day of the month."),
    personName: z.string().describe("The name found on the SECOND line of the cell."),
  })),
});

export async function parseQTRoster(input: z.infer<typeof ParseQTRosterInputSchema>) {
  return parseQTRosterFlow(input);
}

const parseQTRosterFlow = ai.defineFlow(
  {
    name: 'parseQTRosterFlow',
    inputSchema: ParseQTRosterInputSchema,
    outputSchema: ParseQTRosterOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: [
        { media: { url: input.photoDataUri, contentType: 'image/jpeg' } },
        { text: `This is a monthly QT roster calendar image for the year ${input.year}. 
        Analyze the image and extract data following these strict rules:
        
        1. Identification: Identify the month from the header (e.g. "3월" is March/3).
        2. Navigation: Iterate through each numbered day cell in the grid.
        3. Name Extraction:
           - Each day cell typically has a number followed by TWO lines of text (names).
           - IGNORE the first line of text entirely.
           - EXTRACT the name from the SECOND line of text.
           - This name is usually an English name like "Grace Jung" or "Aiden Park".
        4. Validation: Ensure the day number matches the extracted name.
        
        Return the month number and the list of day/name assignments.` }
      ],
      output: { schema: ParseQTRosterOutputSchema }
    });
    return output!;
  }
);
