'use server';
/**
 * @fileOverview Summarizes the legal concept analysis, highlighting key trends and potential anomalies.
 *
 * - summarizeLegalConceptAnalysis - A function that summarizes the legal concept analysis.
 * - SummarizeLegalConceptAnalysisInput - The input type for the summarizeLegalConceptAnalysis function.
 * - SummarizeLegalConceptAnalysisOutput - The return type for the summarizeLegalConceptAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLegalConceptAnalysisInputSchema = z.object({
  analysisResults: z
    .string()
    .describe('The legal concept analysis results as a JSON string.'),
});
export type SummarizeLegalConceptAnalysisInput = z.infer<
  typeof SummarizeLegalConceptAnalysisInputSchema
>;

const SummarizeLegalConceptAnalysisOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the legal concept analysis, highlighting key trends and potential anomalies.'
    ),
});
export type SummarizeLegalConceptAnalysisOutput = z.infer<
  typeof SummarizeLegalConceptAnalysisOutputSchema
>;

export async function summarizeLegalConceptAnalysis(
  input: SummarizeLegalConceptAnalysisInput
): Promise<SummarizeLegalConceptAnalysisOutput> {
  return summarizeLegalConceptAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeLegalConceptAnalysisPrompt',
  input: {schema: SummarizeLegalConceptAnalysisInputSchema},
  output: {schema: SummarizeLegalConceptAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in legal data analysis.

You are provided with legal concept analysis results in JSON format.
Your task is to summarize these results, highlighting key trends and potential anomalies, so that administrators can quickly gain insights and prioritize cases that need immediate attention.

Analysis Results: {{{analysisResults}}}`,
});

const summarizeLegalConceptAnalysisFlow = ai.defineFlow(
  {
    name: 'summarizeLegalConceptAnalysisFlow',
    inputSchema: SummarizeLegalConceptAnalysisInputSchema,
    outputSchema: SummarizeLegalConceptAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
