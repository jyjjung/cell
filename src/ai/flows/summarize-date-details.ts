
// SummarizeDateDetails
'use server';
/**
 * @fileOverview Summarizes event notes provided by the user.
 *
 * - summarizeDateDetails - A function that summarizes event notes.
 * - SummarizeDateDetailsInput - The input type for the summarizeDateDetails function.
 * - SummarizeDateDetailsOutput - The return type for the summarizeDateDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDateDetailsInputSchema = z.object({
  notes: z
    .string()
    .describe('The notes from the event that needs to be summarized.'),
});
export type SummarizeDateDetailsInput = z.infer<typeof SummarizeDateDetailsInputSchema>;

const SummarizeDateDetailsOutputSchema = z.object({
  summary: z.string().describe('The very short summary of the event (1-2 concise sentences, ideally under 30 words).'),
});
export type SummarizeDateDetailsOutput = z.infer<typeof SummarizeDateDetailsOutputSchema>;

export async function summarizeDateDetails(input: SummarizeDateDetailsInput): Promise<SummarizeDateDetailsOutput> {
  return summarizeDateDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDateDetailsPrompt',
  input: {schema: SummarizeDateDetailsInputSchema},
  output: {schema: SummarizeDateDetailsOutputSchema},
  prompt: `You are an expert summarizer. Please provide a very short summary (1-2 concise sentences, ideally under 30 words) for the following event notes:

{{{notes}}}`,
});

const summarizeDateDetailsFlow = ai.defineFlow(
  {
    name: 'summarizeDateDetailsFlow',
    inputSchema: SummarizeDateDetailsInputSchema,
    outputSchema: SummarizeDateDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    