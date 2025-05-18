
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
1.  Combine all 'passage' units derived from the input 'reference' into a single, ordered list, strictly maintaining the sequence as provided in the input.
2.  Starting from the 'startDate', assign up to FOUR 'passage' units to each day's reading.
3.  Increment the date for each new day of readings.
4.  CRITICAL RULE: Absolutely NO readings on Sundays. If a date calculated for readings falls on a Sunday, skip that Sunday. The readings that would have been on Sunday should be scheduled for the following Monday, along with any other readings for that Monday, still respecting the 4-passage-per-day limit.
5.  Continue this process until all 'passage' units from the master list have been assigned to a reading day.

Output Format:
Produce a JSON object that strictly adheres to the 'GenerateBibleReadingPlanOutputSchema'. The main output is the 'dailyReadings' array. Each object in this array must have:
- 'date': The date of the reading in YYYY-MM-DD format (must not be a Sunday).
- 'passages': An array of strings, where each string is a scripture passage (e.g., "Genesis 1", "Exodus 5", "Jude 1:1-10", "Acts 18:1-11"). This array should contain 1 to 4 passages.

Example of processing 'reference' input:
If 'reference' is:
Genesis 1-2
Acts 1-2(:10)
Matthew 5:1-15
Acts 2(:11)
Jude

The master list of passages would be: ["Genesis 1", "Genesis 2", "Acts 1", "Acts 2:1-10", "Matthew 5:1-15", "Acts 2:11-end_of_Acts_2", "Jude 1"]. (Note: "end_of_Acts_2" means to the last verse of Acts chapter 2).

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
      modelResponse = await prompt(input); // Genkit performs schema validation here if output.schema is defined
      
      const output = modelResponse.output;

      if (!output) {
        // This case implies that schema validation by Genkit failed, and modelResponse.output was null.
        console.error(
          "AI response schema validation failed or output was null in generateBibleReadingPlanFlow. Input:",
          input,
          "Raw Model Response (if available):",
          modelResponse // Log the whole modelResponse object to inspect its structure and any error messages it might contain
        );
        throw new Error(
          "The AI model's response did not match the expected format. Please check your input or try again. Raw response has been logged for debugging."
        );
      }
      
      if (!output.dailyReadings || output.dailyReadings.length === 0) {
        // This case implies the schema was valid, but the plan is logically empty.
        const errorDetails = !output.dailyReadings 
          ? "Output structure received, but 'dailyReadings' array is missing." 
          : "Output structure received, but 'dailyReadings' array is empty (no readings generated).";
        console.error(
          "AI response issue in generateBibleReadingPlanFlow (empty/incomplete plan):",
          errorDetails,
          "Input was:",
          input,
          "Full parsed output:",
          output,
          "Raw Model Response (if available):",
          modelResponse
        );
        throw new Error(
          `The AI model responded, but the generated plan was incomplete or empty. Details: ${errorDetails} Please adjust your input or try again.`
        );
      }
      
      return output; // Successfully parsed, validated, and non-empty

    } catch (e: any) {
      // This catch block handles:
      // 1. Errors from the `await prompt(input)` call itself (e.g., network, API key).
      // 2. Explicit `new Error()` throws from the checks above.
      console.error(
        "Error caught in generateBibleReadingPlanFlow. Input:",
        input,
        "Raw Model Response (if available at this point):",
        modelResponse, // Might be undefined if error occurred before/during `prompt` call
        "Full Error Object:",
        e
      );

      let errorMessage = "Failed to process Bible reading plan. ";
      if (e.message) {
        errorMessage += e.message; // Prioritize the message from the thrown error
      } else {
        errorMessage += "An unexpected error occurred. Check server logs for details.";
      }
      // Note: e.digest is a client-side property added by Next.js if the error originates from a Server Component.
      // It won't be available here directly unless this flow is called in a way that it bubbles up to the client.
      // The client-side form submit handler is responsible for adding the digest if it's present on the error it catches.
      
      throw new Error(errorMessage); // Re-throw to be caught by the client-side caller
    }
  }
);

