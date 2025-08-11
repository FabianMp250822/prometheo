
'use server';
/**
 * @fileOverview Extracts structured pension and legal data from a set of documents.
 *
 * - analizarDocumentosPension - A function that analyzes documents and extracts pension data.
 * - AnalizarDocumentosPensionInput - The input type for the function.
 * - AnalizarDocumentosPensionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalizarDocumentosPensionInputSchema = z.object({
  documentos: z.array(z.string()).max(5).describe("An array of up to 5 documents as data URIs. Each must include a MIME type and use Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AnalizarDocumentosPensionInput = z.infer<typeof AnalizarDocumentosPensionInputSchema>;

const AnalisisOutputSchema = z.object({
  datosGenerales: z.object({
    nombreCompleto: z.string().describe('Nombre completo del beneficiario.'),
    numeroIdentificacion: z.string().describe('Número de identificación del beneficiario.'),
    fechaNacimiento: z.string().describe('Fecha de nacimiento (DD/MM/AAAA).'),
    empresaDemandada: z.string().describe('Empresa o entidad demandada.'),
    entidadPensiones: z.string().describe('Entidad administradora de pensiones (Colpensiones/FONECA/etc.).'),
    fechaVinculacion: z.string().describe('Fecha de vinculación laboral (DD/MM/AAAA).'),
    fechaRetiro: z.string().describe('Fecha de retiro laboral (DD/MM/AAAA).'),
    tiempoTotalServicio: z.string().describe('Tiempo total de servicio (años, meses, días).'),
  }).describe('Datos generales del beneficiario.'),

  datosSentencia: z.object({
    numeroRadicado: z.string().describe('Número de radicado del proceso.'),
    fechaSentencia: z.string().describe('Fecha de la sentencia (DD/MM/AAAA).'),
    instancia: z.string().describe('Instancia judicial (primera, segunda, casación).'),
    montoPensionReconocido: z.number().describe('Monto de la mesada pensional inicial reconocida.'),
    fechaReconocimientoPensional: z.string().describe('Fecha de reconocimiento pensional (DD/MM/AAAA).'),
    retroactivoReconocido: z.number().describe('Valor del retroactivo reconocido en la sentencia.'),
    observacionesEspeciales: z.string().describe('Observaciones clave de la sentencia.'),
  }).describe('Datos de la sentencia principal.'),

  liquidacionesMesadas: z.array(z.object({
    periodo: z.string().describe('Año o período de la liquidación.'),
    valorHistoricoMesada: z.number().describe('Valor histórico de la mesada en ese periodo.'),
    porcentajeReajuste: z.string().describe('Porcentaje de reajuste aplicado (ej. "IPC 3.5%" o "SMLMV 15%").'),
    equivalenciaSMLMV: z.number().describe('A cuántos SMLMV equivalía la mesada.'),
    numeroPagos: z.number().describe('Número de mesadas pagadas en el periodo (usualmente 13 o 14).'),
    valorCompartibleColpensiones: z.number().optional().describe('Valor de la mesada compartida con Colpensiones, si aplica.'),
    valorACargoEmpresa: z.number().optional().describe('Valor de la mesada a cargo de la empresa, si aplica.'),
  })).describe('Tabla de liquidación de mesadas anuales.'),

  calculoDiferencias: z.object({
    mesadaActualReconocida: z.number().describe('Mesada actual que la empresa reconoce y paga.'),
    mesadaReajustadaCorrecta: z.number().describe('Mesada que debería estar pagándose según el cálculo correcto.'),
    diferenciaMensual: z.number().describe('Diferencia mensual entre lo pagado y lo que se debió pagar.'),
    totalDiferenciasRetroactivas: z.number().describe('Suma total de las diferencias adeudadas.'),
    abonosPagados: z.number().optional().describe('Total de abonos o pagos parciales ya realizados sobre la deuda.'),
    saldoPorPagar: z.number().describe('Saldo final pendiente de pago.'),
  }).describe('Cálculo de las diferencias adeudadas.'),

  proyeccion: z.object({
    mesadaFuturaReconocida: z.number().describe('Proyección de la mesada futura según la entidad.'),
    mesadaFuturaCalculada: z.number().describe('Proyección de la mesada futura según el cálculo correcto.'),
    diferenciaProyectadaAnual: z.number().describe('Diferencia anual estimada a futuro.'),
  }).describe('Proyección del impacto a futuro.'),

  observacionesTecnicas: z.object({
    fuenteLegalCalculo: z.string().describe('Base legal para el cálculo (sentencia, ley, convención).'),
    formulasAplicadas: z.string().describe('Descripción de las fórmulas matemáticas utilizadas.'),
    erroresDetectados: z.string().describe('Errores específicos encontrados en los cálculos oficiales.'),
  }).describe('Observaciones técnicas del análisis.'),
});

export type AnalizarDocumentosPensionOutput = z.infer<typeof AnalisisOutputSchema>;

export async function analizarDocumentosPension(input: AnalizarDocumentosPensionInput): Promise<AnalizarDocumentosPensionOutput> {
  return analizarDocumentosPensionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analizarDocumentosPensionPrompt',
  input: { schema: AnalizarDocumentosPensionInputSchema },
  output: { schema: AnalisisOutputSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `
    You are an expert AI assistant specialized in Colombian pension law. Your task is to meticulously analyze the provided legal and financial documents (up to 5) related to a pension case. Extract the specified information with the highest accuracy possible and structure it into the required JSON format.

    The documents are provided below:
    {{#each documentos}}
    - Document {{@index}}: {{media url=this}}
    {{/each}}

    **Analysis Instructions:**

    1.  **Datos Generales del Beneficiario:** Identify the main person, their ID, date of birth, the company they are in a legal process with, the pension administrator, and their employment dates. Calculate the total service time.
    2.  **Datos de la Sentencia:** Find the most relevant court sentence. Extract the case number, date, judicial instance, the initial pension amount granted, the date it was granted from, any retroactive amounts, and any special remarks.
    3.  **Datos para Liquidación de Mesadas:** Create a year-by-year or period-by-period breakdown. For each period, find the pension amount paid, the adjustment percentage applied, and calculate its equivalence in SMLMV. Note the number of payments in that period. If it's a shared pension, specify the amounts for Colpensiones and the company.
    4.  **Datos para Cálculo de Diferencias:** Based on your analysis, determine the difference between what the pensioner is currently receiving and what they *should* be receiving. Calculate the total retroactive amount owed, subtract any payments made, and provide the final balance.
    5.  **Datos para Proyección:** Project the future values of the pension, both as currently paid and as it should be, and calculate the annual difference.
    6.  **Observaciones Técnicas:** Summarize the legal basis for your calculations, the formulas used, and any specific errors you found in the official calculations.

    Provide the output *only* in the specified JSON format. Do not add any extra commentary. Be precise and thorough. If a value cannot be found, use a sensible default like 0 for numbers or an empty string.
`,
});

const analizarDocumentosPensionFlow = ai.defineFlow(
  {
    name: 'analizarDocumentosPensionFlow',
    inputSchema: AnalizarDocumentosPensionInputSchema,
    outputSchema: AnalisisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);
