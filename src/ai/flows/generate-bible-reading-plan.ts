
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
  passages: z.array(z.string()).describe("Array of scripture passages/references for the day. Each item is considered one unit. There should be a maximum of 4 such units per day. Examples of units: 'Genesis 1', 'Exodus 5', 'Jude 1:1-10', 'Acts 18:1-11', 'Acts 18:12-28'.")
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
3.  Starting from the 'startDate', assign up to FOUR 'passage' units to each day's reading. If the startDate itself is a Sunday, the first day of reading will be the following Monday.
4.  Increment the date for each new day of readings, always skipping Sundays.
5.  Continue this process until all 'passage' units from the master list have been assigned to a reading day.

Output Format:
Produce a JSON object that strictly adheres to the 'GenerateBibleReadingPlanOutputSchema'.
For very large lists of scriptures that result in a long reading plan, ensure the entire JSON output is complete and correctly formatted according to the schema. Do not truncate or malform the JSON. Each date in the 'dailyReadings' array must NOT be a Sunday.

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

const generateBibleReadingPlanFlow = ai.defineFlow(
  {
    name: 'generateBibleReadingPlanFlow',
    inputSchema: GenerateBibleReadingPlanInputSchema,
    outputSchema: GenerateBibleReadingPlanOutputSchema,
  },
  async input => {
    let modelResponse;
    try {
      modelResponse = await prompt(input); 
      
      const output = modelResponse.output;

      if (!output) {
        console.error(
          "AI response schema validation failed or output was null in generateBibleReadingPlanFlow. Input:",
          input,
          "Raw Model Response (if available - check candidates[0].message.content.parts[0].text or similar for actual AI string):",
          JSON.stringify(modelResponse, null, 2) 
        );
        throw new Error(
          "The AI model's response did not match the expected format. Please check your input or try again. Raw response has been logged for debugging."
        );
      }
      
      if (!output.dailyReadings || output.dailyReadings.length === 0) {
        // This case can be valid if the input reference is empty or results in no readings after processing.
        // However, if input was provided, it might indicate an issue.
        // For now, we allow empty dailyReadings if the AI successfully produces the schema.
        // If the user provides input references that should result in readings, this might need more nuanced handling.
        // For robust error handling, we might want to check if input.reference was non-empty and still led to empty dailyReadings.
        // But for now, assume the AI correctly handles empty results if the schema is valid.
      }
      
      return output; 

    } catch (e: any) {
      console.error(
        "Error caught in generateBibleReadingPlanFlow. Input:",
        input,
        "Raw Model Response (if available at this point):",
        modelResponse ? JSON.stringify(modelResponse, null, 2) : "Not available (error likely before/during prompt call)",
        "Full Error Object:",
        e
      );

      let errorMessage = "Failed to process Bible reading plan. ";
      if (e.message) {
        errorMessage += e.message; 
      } else {
        errorMessage += "An unexpected error occurred. Check server logs for details.";
      }
      
      throw new Error(errorMessage); 
    }
  }
);

