
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
import { parseISO, addDays, format as formatDateFns } from 'date-fns';

const GenerateBibleReadingPlanInputSchema = z.object({
  reference: z
    .string()
    .min(1) // Min 1 character
    .max(15000) // Increased max length for robustness
    .describe(
      'A multiline string where each line is a Bible reference. Can be a book name (e.g., "Genesis"), a chapter range (e.g., "Exodus 1-10"), a specific verse range (e.g., "Jude 1:1-10"), a partial chapter range (e.g., "Acts 1-18(:11)"), or a chapter continuation (e.g., "Acts 18(:12)").'
    ),
  startDate: z.string().describe('The start date for the reading plan (YYYY-MM-DD).'),
});
export type GenerateBibleReadingPlanInput = z.infer<
  typeof GenerateBibleReadingPlanInputSchema
>;

const DailyReadingSchema = z.object({
  date: z.string().describe("Date for this reading (YYYY-MM-DD). This date MUST NOT be a Sunday."),
  passages: z.array(z.string()).describe("Array of scripture passages/references for the day. Each item is considered one unit. There should be a maximum of 4 such units per day. Examples of units: 'Genesis 1', 'Exodus 5', 'Jude 1:1-10', 'Acts 18:1-11', 'Acts 18:12-28'. Passages should use full Bible book names.")
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
  prompt: `You are an expert Bible Reading Plan generator. Your task is to create a structured daily reading plan based on the provided scripture references and a start date. You are expected to know the number of chapters in books and verses in chapters.

IMPORTANT: Your primary constraint throughout the entire planning process is to ensure ABSOLUTELY NO Bible readings are scheduled on any Sunday. This rule takes precedence.

Input Details:
- Scripture References (provided as 'reference'): A multiline string. Each line represents a scripture portion to be included in the plan. These portions must be processed in the order they are given to create a master list of 'passage' units. Each line can be one of the following types:
    1.  **Full Book Name**: (e.g., "Genesis", "Galatians", "Jude").
        *   For multi-chapter books (like "Genesis", "Galatians"), break this down into individual chapters (e.g., Genesis 1, Genesis 2, ..., Galatians 1, Galatians 2, etc.). Each chapter is one 'passage' unit.
        *   For single-chapter books (like "Jude", "Obadiah", "Philemon", "2 John", "3 John"), the book name implies the entire chapter (e.g., "Jude 1", "Obadiah 1"). This single chapter is one 'passage' unit.
    2.  **Chapter Range**: (e.g., "Exodus 1-10", "1 Corinthians 13-15"). Break these down into individual chapters (Exodus 1, Exodus 2, ..., Exodus 10). Each chapter is one 'passage' unit.
    3.  **Specific Verse Range**: (e.g., "Jude 1:1-10", "Matthew 5:1-12"). Treat this entire specified verse range as a single 'passage' unit.
    4.  **Split Chapter Range (ending specified)**: (e.g., "Acts 1-2(:10)", "Romans 1-3(:5)").
        *   This means all full chapters before the last specified chapter, plus the specified part of the last chapter.
        *   For "Acts 1-2(:10)", this translates to: "Acts 1" (as one 'passage' unit), "Acts 2:1-10" (as one 'passage' unit).
        *   For "Romans 1-3(:5)", this translates to: "Romans 1" (unit), "Romans 2" (unit), "Romans 3:1-5" (unit).
    5.  **Single Chapter with Specific Verse Range in Parentheses**: (e.g., "Acts 18(:1-11)", "Romans 3(:6-10)").
        *   This translates directly to the specified verse range within that chapter.
        *   "Acts 18(:1-11)" becomes "Acts 18:1-11" (as one 'passage' unit).
        *   "Romans 3(:6-10)" becomes "Romans 3:6-10" (as one 'passage' unit).
    6.  **Single Chapter with Starting Verse in Parentheses (to end of chapter)**: (e.g., "Acts 18(:12)", "Romans 3(:20)").
        *   This means from the specified verse to the end of that chapter.
        *   "Acts 18(:12)" becomes "Acts 18:12-end" (e.g., "Acts 18:12-28" if Acts 18 has 28 verses). This is one 'passage' unit.
        *   "Romans 3(:20)" becomes "Romans 3:20-end". This is one 'passage' unit.

- Start Date (provided as 'startDate'): The date to begin the reading plan, in YYYY-MM-DD format.

Planning Rules:
1.  CRITICAL RULE #1 (REITERATED): Absolutely NO readings on Sundays. If a date calculated for readings falls on a Sunday, skip that Sunday ENTIRELY. The readings that would have been on Sunday should be scheduled for the following Monday (or the next valid non-Sunday day), along with any other readings for that day, still respecting the 4-passage-per-day limit. This is the most important rule.
2.  Combine all 'passage' units derived from the input 'reference' into a single, ordered list, strictly maintaining the sequence as provided in the input.
3.  Starting from the 'startDate', assign up to FOUR 'passage' units to each day's reading. If the startDate itself is a Sunday, the first day of reading will be the following Monday. Reading days are Monday through Saturday.
4.  Saturdays are normal reading days and MUST be assigned passages if they fall in the schedule and passages are available, following the same rules as weekdays (up to 4 passages). Only Sundays are to be skipped.
5.  Increment the date for each new day of readings, always skipping Sundays.
6.  IMPORTANT FOR OUTPUT: All Bible book names in the generated 'passages' array (e.g., in 'Genesis 1', 'Acts 18:12-28') MUST be the full, unabbreviated book name. For example, use "Genesis" not "Gen", "Exodus" not "Exo", "Galatians" not "Gal".
7.  Continue this process until all 'passage' units from the master list have been assigned to a reading day.

Output Format:
Produce a JSON object that strictly adheres to the 'GenerateBibleReadingPlanOutputSchema'.
You are capable of generating very long and complete JSON outputs. It is CRITICAL for this task that the entire reading plan, no matter how extensive, is returned as a single, valid, and complete JSON object conforming to the schema. Do not truncate or malform the JSON. Each date in the 'dailyReadings' array must NOT be a Sunday.

Let's begin with the plan generation:
Start Date: {{startDate}}
Scripture References:
{{{reference}}}
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ]
  }
});

const MAX_LINES_PER_CHUNK = 40; // Adjust as needed

const generateBibleReadingPlanFlow = ai.defineFlow(
  {
    name: 'generateBibleReadingPlanFlow',
    inputSchema: GenerateBibleReadingPlanInputSchema,
    outputSchema: GenerateBibleReadingPlanOutputSchema,
  },
  async (input: GenerateBibleReadingPlanInput): Promise<GenerateBibleReadingPlanOutput> => {
    const allScriptureLines = input.reference.trim().split('\n').filter(line => line.trim() !== '');
    const totalLines = allScriptureLines.length;

    if (totalLines === 0) {
      return { dailyReadings: [] };
    }

    if (totalLines <= MAX_LINES_PER_CHUNK) {
      // Process as a single chunk if within limit
      let modelResponse;
      try {
        modelResponse = await prompt(input);
        const output = modelResponse.output;
        if (!output) {
          console.error(
            "AI response schema validation failed or output was null (single chunk). Input:",
            input,
            "Raw Model Response:",
            JSON.stringify(modelResponse, null, 2)
          );
          throw new Error(
            "The AI model's response did not match the expected format for the provided scriptures. Please check your input or try again."
          );
        }
        return output;
      } catch (e: any) {
        console.error(
          "Error caught in generateBibleReadingPlanFlow (single chunk). Input:", input,
          "Raw Model Response (if available):", modelResponse ? JSON.stringify(modelResponse, null, 2) : "N/A",
          "Full Error Object:", e
        );
        throw new Error(`Failed to process Bible reading plan (single chunk): ${e.message}`);
      }
    } else {
      // Process in multiple chunks
      const finalDailyReadings: DailyReading[] = [];
      let currentStartDateForChunk = input.startDate;
      let linesProcessedSoFar = 0;

      for (let i = 0; i < totalLines; i += MAX_LINES_PER_CHUNK) {
        const chunkLines = allScriptureLines.slice(i, Math.min(i + MAX_LINES_PER_CHUNK, totalLines));
        const chunkReference = chunkLines.join('\n');
        linesProcessedSoFar += chunkLines.length;

        console.log(`Processing chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1}: ${chunkLines.length} lines, starting date: ${currentStartDateForChunk}`);
        
        let modelResponse;
        try {
          modelResponse = await prompt({
            reference: chunkReference,
            startDate: currentStartDateForChunk,
          });

          const chunkOutput = modelResponse.output;

          if (!chunkOutput) {
            console.error(
              `AI response schema validation failed or output was null for chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1}. Input:`,
              { reference: chunkReference, startDate: currentStartDateForChunk },
              "Raw Model Response:",
              JSON.stringify(modelResponse, null, 2)
            );
            throw new Error(
              `The AI model's response for a part of the plan (chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1}) was not in the expected format. Processing halted.`
            );
          }

          if (chunkOutput.dailyReadings && chunkOutput.dailyReadings.length > 0) {
            finalDailyReadings.push(...chunkOutput.dailyReadings);
            const lastReadingInChunk = chunkOutput.dailyReadings[chunkOutput.dailyReadings.length - 1];
            if (lastReadingInChunk && lastReadingInChunk.date) {
              // Parse YYYY-MM-DD as UTC to avoid timezone shifts
              const lastDateObj = parseISO(lastReadingInChunk.date + 'T00:00:00Z'); 
              const nextStartDateObj = addDays(lastDateObj, 1);
              currentStartDateForChunk = formatDateFns(nextStartDateObj, 'yyyy-MM-dd');
            } else {
              // This case should ideally not happen if AI returns valid readings with dates
              console.warn(`Chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1} returned readings but last date was missing. Next chunk might start on an incorrect date.`);
            }
          } else {
             console.log(`Chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1} produced no readings. Continuing with the same start date for the next chunk if any.`);
          }
        } catch (e: any) {
          console.error(
            `Error caught in generateBibleReadingPlanFlow (chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1}). Input:`, 
            { reference: chunkReference, startDate: currentStartDateForChunk },
            "Raw Model Response (if available):", modelResponse ? JSON.stringify(modelResponse, null, 2) : "N/A",
            "Full Error Object:", e
          );
          throw new Error(`Failed to process part of the Bible reading plan (chunk ${Math.floor(i / MAX_LINES_PER_CHUNK) + 1}): ${e.message}. ${linesProcessedSoFar} lines processed before error.`);
        }
      }
      return { dailyReadings: finalDailyReadings };
    }
  }
);
