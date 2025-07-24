'use server';
/**
 * @fileOverview Generates legal document templates based on specified parameters.
 *
 * - generateLegalDocument - A function that creates a legal document template.
 * - GenerateLegalDocumentInput - The input type for the generateLegalDocument function.
 * - GenerateLegalDocumentOutput - The return type for the generateLegalDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLegalDocumentInputSchema = z.object({
  documentType: z.string().describe('The type of legal document to generate (e.g., "Poder Amplio y Suficiente", "Contrato de Arrendamiento").'),
  country: z.string().describe('The country whose laws the document should follow (e.g., "Colombia").'),
  specificClauses: z.array(z.string()).optional().describe('A list of specific clauses or points to include in the document.'),
  parties: z.array(z.object({
      role: z.string().describe('Role of the party (e.g., "Poderdante", "Apoderado", "Arrendador").'),
      namePlaceholder: z.string().describe('Placeholder for the name (e.g., "{{poderdanteNombre}}").'),
      idPlaceholder: z.string().describe('Placeholder for the ID/document number (e.g., "{{poderdanteCedula}}").'),
  })).optional().describe('A list of parties to be included in the document with their placeholders.')
});

export type GenerateLegalDocumentInput = z.infer<typeof GenerateLegalDocumentInputSchema>;

const GenerateLegalDocumentOutputSchema = z.object({
  documentContent: z.string().describe('The full text content of the generated legal document template, using Handlebars-style placeholders (e.g., {{placeholder}}).'),
});
export type GenerateLegalDocumentOutput = z.infer<typeof GenerateLegalDocumentOutputSchema>;

export async function generateLegalDocument(
  input: GenerateLegalDocumentInput
): Promise<GenerateLegalDocumentOutput> {
  return generateLegalDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLegalDocumentPrompt',
  input: {schema: GenerateLegalDocumentInputSchema},
  output: {schema: GenerateLegalDocumentOutputSchema},
  model: 'googleai/gemini-pro',
  prompt: `
    You are an expert AI lawyer specializing in generating legal document templates.
    Your task is to create a template for a "{{documentType}}" valid under the laws of {{country}}.

    The document must be professional, well-structured, and use clear, standard legal language for {{country}}.
    It must include placeholders for dynamic data using the Handlebars format (e.g., {{placeholderName}}).

    **Document Requirements:**

    1.  **Document Type:** {{documentType}}
    2.  **Jurisdiction:** {{country}}
    3.  **Placeholders for Parties:**
        {{#if parties}}
        Include placeholders for the following parties:
        {{#each parties}}
        - Role: {{this.role}}, Name Placeholder: {{this.namePlaceholder}}, ID Placeholder: {{this.idPlaceholder}}
        {{/each}}
        {{else}}
        Please define appropriate parties and create placeholders for their full name and identification number. For example: {{nombreCompleto}}, {{numeroIdentificacion}}.
        {{/if}}

    4.  **Specific Clauses to Include:**
        {{#if specificClauses}}
        The document must contain clauses covering the following points:
        {{#each specificClauses}}
        - {{{this}}}
        {{/each}}
        {{else}}
        Include all standard clauses typically found in a "{{documentType}}" in {{country}}.
        {{/if}}

    **Instructions:**
    - Generate the complete document text.
    - Use Handlebars syntax ` + "(`{{` and `}}`)" + ` for all placeholders.
    - Do not invent legal advice. Stick to generating the document structure and text.
    - The output must be only the document content, without any additional comments or explanations.
    - Ensure the document is formatted cleanly with appropriate line breaks for readability.
`,
});

const generateLegalDocumentFlow = ai.defineFlow(
  {
    name: 'generateLegalDocumentFlow',
    inputSchema: GenerateLegalDocumentInputSchema,
    outputSchema: GenerateLegalDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
