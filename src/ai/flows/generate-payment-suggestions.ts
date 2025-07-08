'use server';

/**
 * @fileOverview Generates optimal payment schedules based on legal concept analysis and user financial history.
 *
 * - generatePaymentSuggestions - A function that generates payment suggestions.
 * - GeneratePaymentSuggestionsInput - The input type for the generatePaymentSuggestions function.
 * - GeneratePaymentSuggestionsOutput - The return type for the generatePaymentSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePaymentSuggestionsInputSchema = z.object({
  legalConceptAnalysis: z
    .string()
    .describe('The analysis of legal concepts related to the user.'),
  userFinancialHistory: z
    .string()
    .describe('The user financial history in text format.'),
  paymentTerms: z
    .string()
    .describe(
      'Information about payment terms and conditions for the user sentences.'
    ),
});
export type GeneratePaymentSuggestionsInput = z.infer<
  typeof GeneratePaymentSuggestionsInputSchema
>;

const GeneratePaymentSuggestionsOutputSchema = z.object({
  paymentScheduleSuggestion: z
    .string()
    .describe('The suggested payment schedule for the user.'),
  rationale: z.string().describe('The rationale behind the suggestion.'),
});
export type GeneratePaymentSuggestionsOutput = z.infer<
  typeof GeneratePaymentSuggestionsOutputSchema
>;

export async function generatePaymentSuggestions(
  input: GeneratePaymentSuggestionsInput
): Promise<GeneratePaymentSuggestionsOutput> {
  return generatePaymentSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePaymentSuggestionsPrompt',
  input: {schema: GeneratePaymentSuggestionsInputSchema},
  output: {schema: GeneratePaymentSuggestionsOutputSchema},
  prompt: `You are an AI assistant specialized in generating payment schedules
  based on user legal concept analysis and financial history.

  Given the following information, suggest an optimal payment schedule that minimizes delays and ensures timely settlements.

  Legal Concept Analysis: {{{legalConceptAnalysis}}}
  User Financial History: {{{userFinancialHistory}}}
  Payment Terms: {{{paymentTerms}}}

  Provide a clear and concise payment schedule along with a rationale for your suggestion.
  Be very specific with dates.
  `,
});

const generatePaymentSuggestionsFlow = ai.defineFlow(
  {
    name: 'generatePaymentSuggestionsFlow',
    inputSchema: GeneratePaymentSuggestionsInputSchema,
    outputSchema: GeneratePaymentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
