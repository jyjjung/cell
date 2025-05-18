'use server';

/**
 * @fileOverview Generates a bible reading plan based on a provided reference.
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
    .describe('The bible reference or range of references to generate a reading plan from.'),
  startDate: z.string().describe('The start date for the reading plan (YYYY-MM-DD).'),
  numDays: z.number().describe('The number of days to generate the reading plan for.'),
});
export type GenerateBibleReadingPlanInput = z.infer<
  typeof GenerateBibleReadingPlanInputSchema
>;

const GenerateBibleReadingPlanOutputSchema = z.object({
  readingPlan: z.string().describe('The generated bible reading plan.'),
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
  prompt: `You are a helpful assistant that generates bible reading plans.

  Generate a {{numDays}} day bible reading plan based on the reference(s) provided. Each day should have four lines of scripture references. Skip Sundays.

  Start Date: {{startDate}}
  Reference(s): {{reference}}

  Format the output as a simple text-based reading plan.`,
});

const generateBibleReadingPlanFlow = ai.defineFlow(
  {
    name: 'generateBibleReadingPlanFlow',
    inputSchema: GenerateBibleReadingPlanInputSchema,
    outputSchema: GenerateBibleReadingPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
