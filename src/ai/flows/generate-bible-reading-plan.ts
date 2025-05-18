
'use server';

/**
 * @fileOverview Generates a bible reading plan based on user-provided scripture references and a start date.
 *
 * - generateBibleReadingPlan - A function that handles the bible reading plan generation.
 * - GenerateBibleReadingPlanInput - The input type for the generateBibleReadingPlan function.
 * - GenerateBibleReadingPlanOutput - The return type for the generateBibleReadingPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBibleReadingPlanInputSchema = z.object({
  reference: z
    .string()
    .describe(
      'A multiline string where each line is a Bible reference. Can be a book name (e.g., "Genesis"), a chapter range (e.g., "Exodus 1-10"), or a specific verse range (e.g., "Jude 1:1-10").'
    ),
  startDate: z.string().describe('The start date for the reading plan (YYYY-MM-DD).'),
});
export type GenerateBibleReadingPlanInput = z.infer<
  typeof GenerateBibleReadingPlanInputSchema
>;

const DailyReadingSchema = z.object({
  date: z.string().describe("Date for this reading (YYYY-MM-DD). This date MUST NOT be a Sunday."),
  passages: z.array(z.string()).describe("Array of scripture passages/references for the day. Each item is considered one unit. There should be a maximum of 4 such units per day. Examples of units: 'Genesis 1', 'Exodus 5', 'Jude 1:1-10'.")
});

const GenerateBibleReadingPlanOutputSchema = z.object({
  dailyReadings: z.array(DailyReadingSchema).describe("The structured daily reading plan. Dates should increment daily from the startDate. IMPORTANT: If a calculated date falls on a Sunday, skip that date entirely and assign the readings to the following Monday. Continue until all provided scripture references are assigned. Each day should have up to 4 scripture passages."),
});
export type GenerateBibleReadingPlanOutput = z.infer<
  typeof GenerateBibleReadingPlanOutputSchema
>;

export async function generateBibleReadingPlan(
  input: GenerateBibleReadingPlanInput
): Promise<GenerateBibleReadingPlanOutput> {
  return generateBibleReadingPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBibleReadingPlanPrompt',
  input: {schema: GenerateBibleReadingPlanInputSchema},
  output: {schema: GenerateBibleReadingPlanOutputSchema},
  prompt: `You are an expert Bible Reading Plan generator. Your task is to create a structured daily reading plan based on the provided scripture references and a start date.

Input Details:
- Scripture References (provided as 'reference'): A multiline string. Each line can be:
    1.  A full book name (e.g., "Genesis", "Psalms"). For full books, break them down into individual chapters. Each chapter counts as one 'passage' unit.
    2.  A chapter range (e.g., "Exodus 1-10", "1 Corinthians 13-15"). Break these down into individual chapters. Each chapter counts as one 'passage' unit.
    3.  A specific verse range (e.g., "Jude 1:1-10", "Matthew 5:1-12"). Treat each such verse range as a single 'passage' unit.
- Start Date (provided as 'startDate'): The date to begin the reading plan, in YYYY-MM-DD format.

Planning Rules:
1.  Combine all 'passage' units derived from the input 'reference' into a single, ordered list, maintaining the order as provided in the input.
2.  Starting from the 'startDate', assign up to FOUR 'passage' units to each day's reading.
3.  Increment the date for each new day of readings.
4.  CRITICAL RULE: Absolutely NO readings on Sundays. If a date calculated for readings falls on a Sunday, skip that Sunday. The readings that would have been on Sunday should be scheduled for the following Monday, along with any other readings for that Monday, still respecting the 4-passage-per-day limit.
5.  Continue this process until all 'passage' units from the master list have been assigned to a reading day.

Output Format:
Produce a JSON object that strictly adheres to the 'GenerateBibleReadingPlanOutputSchema'. The main output is the 'dailyReadings' array. Each object in this array must have:
- 'date': The date of the reading in YYYY-MM-DD format (must not be a Sunday).
- 'passages': An array of strings, where each string is a scripture passage (e.g., "Genesis 1", "Exodus 5", "Jude 1:1-10"). This array should contain 1 to 4 passages.

Example of processing 'reference' input:
If 'reference' is:
Genesis 1-2
Jude 1:1-5

The master list of passages would be: ["Genesis 1", "Genesis 2", "Jude 1:1-5"].

Let's begin with the plan generation:
Start Date: {{startDate}}
Scripture References:
{{{reference}}}
`,
});

const generateBibleReadingPlanFlow = ai.defineFlow(
  {
    name: 'generateBibleReadingPlanFlow',
    inputSchema: GenerateBibleReadingPlanInputSchema,
    outputSchema: GenerateBibleReadingPlanOutputSchema,
  },
  async input => {
    // Add a safety setting if needed, e.g., for potentially sensitive scripture content, though unlikely for references.
    const {output} = await prompt(input, { config: {
      safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE', // Example, adjust as needed
        },
      ]
    }});
    if (!output || !output.dailyReadings) {
      throw new Error("AI did not return the expected dailyReadings structure.");
    }
    return output;
  }
);
