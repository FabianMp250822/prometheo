
'use server';
/**
 * @fileOverview Analyzes a complete pensioner profile to generate an executive summary.
 *
 * - analizarPerfilPensionado - A function that takes a comprehensive pensioner data object and returns a summary.
 * - AnalizarPerfilPensionadoInput - The input type for the function.
 * - AnalizarPerfilPensionadoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalizarPerfilPensionadoInputSchema = z.object({
  perfilCompletoPensionado: z.string().describe('A JSON string containing the complete profile of the pensioner, including personal data, payment history, legal processes, etc.'),
});
export type AnalizarPerfilPensionadoInput = z.infer<typeof AnalizarPerfilPensionadoInputSchema>;

const AnalizarPerfilPensionadoOutputSchema = z.object({
  summary: z.string().describe('A comprehensive executive summary of the pensioner\'s profile in HTML format. Use headings (<h4>), bold text (<strong>), lists (<ul><li>), and paragraphs (<p>).'),
});
export type AnalizarPerfilPensionadoOutput = z.infer<typeof AnalizarPerfilPensionadoOutputSchema>;

export async function analizarPerfilPensionado(input: AnalizarPerfilPensionadoInput): Promise<AnalizarPerfilPensionadoOutput> {
  return analizarPerfilPensionadoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analizarPerfilPensionadoPrompt',
  input: { schema: AnalizarPerfilPensionadoInputSchema },
  output: { schema: AnalizarPerfilPensionadoOutputSchema },
  model: 'googleai/gemini-1.5-pro',
  prompt: `
    You are an expert legal and financial analyst specializing in Colombian pension cases for the firm DAJUSTICIA.
    Your task is to analyze the provided JSON data of a pensioner and generate a concise, insightful executive summary in HTML format.

    The user is an internal lawyer or case manager at DAJUSTICIA. The summary should highlight the most critical aspects of the case, potential opportunities, risks, and a general financial overview.

    **Input Data:**
    \`\`\`json
    {{{perfilCompletoPensionado}}}
    \`\`\`

    **Output Instructions:**
    - The entire output MUST be a single HTML string.
    - Use <h4> for main section titles.
    - Use <strong> for important keywords or figures.
    - Use <ul> and <li> for lists.
    - Use <p> for paragraphs. Do NOT use markdown.

    **Analysis Structure:**

    1.  **<h4>Resumen General del Cliente</h4>**
        - Start with a brief, one-sentence overview of the pensioner's situation.
        - Mention their name, document number, and current status (e.g., pensionado, activo, cliente DAJUSTICIA).

    2.  **<h4>Situación Financiera Pensional (Empresa)</h4>**
        - Summarize the key financial figures from their pension with the company.
        - Mention "Última mesada registrada", "Total pagado históricamente".
        - If there's data on "poder adquisitivo" (purchasing power), highlight the SMLMV loss. For example: "Se observa una pérdida de poder adquisitivo de <strong>X.XX SMLMV</strong> en el período analizado."

    3.  **<h4>Estado con DAJUSTICIA (Si aplica)</h4>**
        - If the pensioner is a DAJUSTICIA client (\`dajusticiaClientData\`), summarize their account status.
        - State the "Monto total del acuerdo", "Total pagado a la fecha", and the "<strong>Saldo pendiente</strong>".

    4.  **<h4>Análisis de Procesos y Oportunidades</h4>**
        - Review \`legalProcesses\` and \`sentencePayments\`.
        - Identify key legal actions taken. Example: "Tiene un proceso activo por <strong>Reajuste Pensional</strong>."
        - Highlight significant payments received from sentences (e.g., "Recibió un pago de <strong>$X.XXX.XXX</strong> por Costas Procesales.").
        - Based on all data, identify potential opportunities. Examples: "¿Hay indicios de una incorrecta liquidación que justifique un nuevo proceso de reliquidación? ¿Hay pagos por sentencias pendientes de cobro?". Be direct and pose questions for the case manager to consider.

    5.  **<h4>Puntos Críticos y Riesgos</h4>**
        - Identify any potential risks or important points to watch.
        - Example: "No se encontraron datos de pensión en COLPENSIONES, lo que podría afectar cálculos de compartición." or "El último pago registrado fue hace más de un año, verificar estado actual."

    **Example Output Snippet:**
    "<h4>Resumen General del Cliente</h4><p><strong>Juan Perez</strong> (C.C. 123456) es un pensionado de Electricaribe y cliente activo de DAJUSTICIA...</p><h4>Situación Financiera Pensional (Empresa)</h4><p>...</p>"

    Now, analyze the provided JSON and generate the complete HTML summary.
`,
});

const analizarPerfilPensionadoFlow = ai.defineFlow(
  {
    name: 'analizarPerfilPensionadoFlow',
    inputSchema: AnalizarPerfilPensionadoInputSchema,
    outputSchema: AnalizarPerfilPensionadoOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid summary.");
    }
    return output;
  }
);


    