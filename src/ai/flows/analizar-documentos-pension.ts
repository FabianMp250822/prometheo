'use server';
/**
 * @fileOverview Processes pension documents to generate a detailed pension readjustment calculation table and comprehensive report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalizarDocumentosPensionInputSchema = z.object({
  documentos: z.array(z.string()).max(5).describe("An array of up to 5 documents as data URIs. Each must include a MIME type and use Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AnalizarDocumentosPensionInput = z.infer<typeof AnalizarDocumentosPensionInputSchema>;

const LiquidacionAnualSchema = z.object({
  año: z.number().describe('El año del cálculo.'),
  smmlv: z.string().describe('Salario Mínimo Mensual Legal Vigente para ese año.'),
  tope5smmlv: z.string().describe('El valor correspondiente a 5 SMLMV para ese año.'),
  mesadaACargoEmpresa: z.string().describe('La mesada pensional que estaba a cargo de la empresa.'),
  porcentajeAplicado: z.string().describe('El porcentaje de reajuste aplicado (IPC o 15%).'),
  mesadaReajustada: z.string().describe('La mesada después de aplicar el reajuste.'),
  mesadaCancelada: z.string().describe('La mesada que efectivamente se pagó.'),
  diferencia: z.string().describe('La diferencia entre la mesada reajustada y la cancelada.'),
  numeroMesadas: z.number().describe('El número de mesadas pagadas en el año.'),
  valorAdeudado: z.string().describe('El valor total adeudado para ese año (diferencia * número de mesadas).'),
});

const DatosClienteSchema = z.object({
  nombreCompleto: z.string().describe('Nombre completo del pensionado'),
  numeroIdentificacion: z.string().optional().describe('Número de identificación del pensionado'),
  empresaDemandada: z.string().describe('Nombre de la empresa demandada'),
  fechaInicialPension: z.string().describe('Fecha de inicio de la pensión'),
  mesadaActual: z.string().describe('Mesada actual que se está pagando'),
  mesadaCorrecta: z.string().describe('Mesada correcta que debería pagarse'),
});

const ResumenJuridicoSchema = z.object({
  juzgadoPrimeraInstancia: z.string().optional().describe('Juzgado de primera instancia'),
  tribunalSegundaInstancia: z.string().optional().describe('Tribunal de segunda instancia'),
  corteCasacion: z.string().optional().describe('Corte Suprema o de Casación'),
  numeroSentencia: z.string().optional().describe('Número de la sentencia definitiva'),
  fechaSentencia: z.string().optional().describe('Fecha de la sentencia definitiva'),
  conversionColectiva: z.string().optional().describe('Convención colectiva aplicable'),
  precedenteAplicado: z.string().describe('Precedente jurídico aplicado (ej: 39783 de 2013, 4555 de 2020)'),
  errorIdentificado: z.string().optional().describe('Error identificado en la liquidación de la empresa'),
});

const ComparticionSchema = z.object({
  porcentajeFoneca: z.string().describe('Porcentaje a cargo de FONECA/Empresa'),
  porcentajeColpensiones: z.string().describe('Porcentaje a cargo de Colpensiones/ISS'),
  valorFoneca: z.string().describe('Valor mensual a cargo de FONECA'),
  valorColpensiones: z.string().describe('Valor mensual a cargo de Colpensiones'),
});

const EvolucionMesadaSchema = z.object({
  mesadaInicial: z.string().describe('Mesada inicial al momento del reconocimiento'),
  mesadaFinalReajustada: z.string().describe('Mesada final después de todos los reajustes aplicados'),
  mesadaActualPagada: z.string().describe('Mesada que actualmente está pagando la empresa'),
  mesadaReconocidaFiduprevisora: z.string().describe('Mesada reconocida por Fiduprevisora en documento privado'),
  diferenciaMesada: z.string().describe('Diferencia entre mesada correcta y mesada pagada'),
  periodoAnalisis: z.string().describe('Período de análisis (desde - hasta)'),
});

const ComparacionMetodosSchema = z.object({
  metodoAplicadoCorte: z.string().describe('Método aplicado en la decisión final de la Corte'),
  resultadoMetodoCorte: z.string().describe('Resultado financiero del método de la Corte'),
  metodoUnidadPrestacional: z.string().describe('Descripción del método de Unidad Prestacional'),
  resultadoUnidadPrestacional: z.string().describe('Resultado financiero del método Unidad Prestacional'),
  metodoMasFavorable: z.string().describe('Cuál método resulta más favorable y por qué'),
  diferencciaEntreMetodos: z.string().describe('Diferencia monetaria entre ambos métodos'),
});

const CalculosFinancierosSchema = z.object({
  totalRetroactivosCorte: z.string().describe('Total de retroactivos según la Corte'),
  totalPagadoEmpresa: z.string().describe('Total pagado por la empresa/fiduciaria'),
  saldoPendiente: z.string().describe('Saldo pendiente por pagar'),
  deficitMesadaActual: z.string().describe('Déficit en la mesada actual'),
  fechaLiquidacion: z.string().describe('Fecha hasta la cual se liquida'),
});

const AnalizarDocumentosPensionOutputSchema = z.object({
  datosCliente: DatosClienteSchema.describe("Información personal y básica del cliente"),
  resumenJuridico: ResumenJuridicoSchema.describe("Resumen del proceso judicial y precedentes"),
  comparticion: ComparticionSchema.describe("Información sobre la compartición entre FONECA y Colpensiones"),
  evolucionMesada: EvolucionMesadaSchema.describe("Evolución de la mesada desde inicio hasta la fecha"),
  comparacionMetodos: ComparacionMetodosSchema.describe("Comparación entre método aplicado y unidad prestacional"),
  calculosFinancieros: CalculosFinancierosSchema.describe("Resumen de cálculos financieros principales"),
  liquidaciones: z.array(LiquidacionAnualSchema).describe("Un array con la liquidación detallada año por año."),
  observaciones: z.string().optional().describe("Observaciones adicionales sobre el caso"),
});

export type AnalizarDocumentosPensionOutput = z.infer<typeof AnalizarDocumentosPensionOutputSchema>;

export async function analizarDocumentosPension(input: AnalizarDocumentosPensionInput): Promise<AnalizarDocumentosPensionOutput> {
  return analizarDocumentosPensionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analizarDocumentosPensionPrompt',
  input: { schema: AnalizarDocumentosPensionInputSchema },
  output: { schema: AnalizarDocumentosPensionOutputSchema },
  prompt: `
    ## ROL Y OBJETIVO
    Eres un sistema experto en la liquidación de pensiones bajo la Ley 4ª de 1976 en Colombia. Tu objetivo es procesar los documentos pensionales proporcionados, extraer toda la información relevante del caso, aplicar los criterios jurídicos y financieros especificados, y generar tanto una tabla de liquidación detallada como un informe completo del análisis.

    ## DOCUMENTOS A ANALIZAR
    {{#each documentos}}
    - Documento {{@index}}: {{media url=this}}
    {{/each}}

    ## TAREA 1: EXTRACCIÓN Y CÁLCULO DE LA TABLA DE LIQUIDACIÓN
    Analiza los documentos y realiza los siguientes cálculos para cada año relevante desde el inicio de la pensión. Esta será la base para el objeto 'liquidaciones' en el JSON.

    ### 1.1 Precedentes Judiciales para el Reajuste
    Debes considerar los siguientes métodos. Extrae los datos necesarios de los documentos para aplicar el más pertinente.
    - **Precedente 39783 de 2013 (Método Escolástica):**
      - Identifica la mesada a cargo exclusivo de la empresa.
      - Si esta mesada **no supera los 5 SMLMV** del año a liquidar, aplica un reajuste del 15%.
      - Si una compartición con Colpensiones reduce la mesada a cargo de la empresa por debajo del tope de 5 SMLMV, el derecho al 15% se recupera.
    - **Precedente 4555 de 2020:**
      - Suma la mesada a cargo de la empresa más la mesada del ISS/Colpensiones para determinar el porcentaje aplicable (IPC o 15% si la suma no supera los 5 SMLMV).
      - Aplica el porcentaje resultante **únicamente sobre la parte de la mesada a cargo de la empresa**.
      - El 15% se aplica sucesivamente cada año mientras la parte de la empresa no supere los 5 SMLMV.

    ### 1.2 Tabla de Referencia OBLIGATORIA (IPC y SMLMV)
    Utiliza OBLIGATORIAMENTE esta tabla para tus cálculos. No inventes ni extrapoles valores.
    | Año  | IPC (%) | SMMLV      | Tope 5 SMMLV |
    |------|---------|------------|--------------|
    | 1999 | 16.70   | 236,460    | 1,182,300    |
    | 2000 | 9.23    | 260,100    | 1,300,500    |
    | 2001 | 8.75    | 286,000    | 1,430,000    |
    | 2002 | 7.65    | 309,000    | 1,545,000    |
    | 2003 | 6.99    | 332,000    | 1,660,000    |
    | 2004 | 6.49    | 358,000    | 1,790,000    |
    | 2005 | 5.50    | 381,500    | 1,907,500    |
    | 2006 | 4.85    | 408,000    | 2,040,000    |
    | 2007 | 4.48    | 433,700    | 2,168,500    |
    | 2008 | 5.69    | 461,500    | 2,307,500    |
    | 2009 | 7.67    | 496,900    | 2,484,500    |
    | 2010 | 2.00    | 515,000    | 2,575,000    |
    | 2011 | 3.17    | 535,600    | 2,678,000    |
    | 2012 | 3.73    | 566,000    | 2,830,000    |
    | 2013 | 2.44    | 589,500    | 2,947,500    |
    | 2014 | 1.94    | 616,000    | 3,080,000    |
    | 2015 | 3.66    | 638,546    | 3,192,728    |
    | 2016 | 5.75    | 689,454    | 3,447,270    |
    | 2017 | 4.09    | 737,717    | 3,688,585    |
    | 2018 | 3.18    | 781,242    | 3,906,210    |
    | 2019 | 3.80    | 828,116    | 4,140,580    |
    | 2020 | 1.61    | 877,803    | 4,389,015    |
    | 2021 | 5.62    | 908,526    | 4,542,630    |
    | 2022 | 13.12   | 1,000,000  | 5,000,000    |
    | 2023 | 13.25   | 1,160,000  | 5,800,000    |
    | 2024 | 9.28    | 1,300,000  | 6,500,000    |
    | 2025 | 8.50    | 1,423,500  | 7,117,500    |

    ### 1.3 Proceso de Cálculo Anual
    Para cada año relevante que encuentres en los documentos, desde el inicio de la pensión:
    1.  **Extrae la 'Mesada Cancelada'**: Este es el monto que la empresa efectivamente pagó en ese año. Lo encuentras en los comprobantes de pago o historia de pagos.
    2.  **Calcula la 'Mesada Reajustada'**:
        - Obtén la mesada del año anterior.
        - Determina el porcentaje de ajuste a aplicar (15% o IPC) según el precedente y el tope de 5 SMLMV.
        - Calcula el nuevo valor: 'MesadaReajustada = MesadaAñoAnterior * (1 + %Ajuste)'.
    3.  **Calcula la 'Diferencia'**: 'Diferencia = MesadaReajustada - MesadaCancelada'.
    4.  **Determina el 'Número de Mesadas'**: Usualmente 13 o 14, identifícalo en los documentos.
    5.  **Calcula el 'Valor Adeudado'**: 'ValorAdeudado = Diferencia * NúmeroDeMesadas'.

    ## TAREA 2: EXTRACCIÓN DE DATOS Y ANÁLISIS ADICIONAL
    Además de la tabla de liquidación, extrae y calcula los siguientes datos para responder a las preguntas clave.

    ### 2.1 Información General y Jurídica
    - Extrae todos los campos para 'datosCliente' y 'resumenJuridico' a partir de la información de los documentos.

    ### 2.2 Evolución y Diferencias de Mesada
    - **Mesada Inicial:** La primera mesada que recibió el pensionado.
    - **Mesada Final Reajustada:** El último valor calculado en la columna 'Mesada Reajustada' de la tabla de liquidación.
    - **Mesada Actual Pagada:** La última mesada que los documentos demuestren que fue pagada.
    - **Mesada Reconocida Fiduprevisora:** Busca si hay algún documento privado de Fiduprevisora con un monto específico.
    - **Diferencia de Mesada:** Calcula 'Mesada Final Reajustada' - 'Mesada Actual Pagada'.
    - **Período de Análisis:** El rango de años de la tabla de liquidación (ej: 1999 - 2024).

    ### 2.3 Cálculo de Compartición
    - Identifica la primera mesada en que la pensión fue compartida.
    - Calcula qué porcentaje de la mesada total en ese momento correspondía a Foneca/Empresa y qué porcentaje a Colpensiones. Rellena los campos 'porcentajeFoneca' y 'porcentajeColpensiones'.
    - Rellena 'valorFoneca' y 'valorColpensiones' con los valores de ese momento.

    ### 2.4 Comparación de Métodos de Liquidación
    - **Método Aplicado en la Corte:** El que usaste para la TAREA 1. Su resultado es el 'Valor Adeudado Total' de esa tabla.
    - **Método de Unidad Prestacional (versión 4-71):** Realiza un segundo cálculo completo usando este método:
        - Trata la mesada como una unidad integrada (empresa + ISS) para determinar el % de ajuste.
        - Si con 15% no se supera el tope, se usa ese valor; si lo supera, se usa el IPC.
        - Al valor total reajustado, réstale lo que paga el ISS para obtener la parte que le corresponde a la empresa.
    - Compara los 'Valor Adeudado Total' de ambos métodos y determina cuál es más favorable.
    - Calcula la diferencia monetaria entre ambos.

    ### 2.5 Resumen Financiero
    - Calcula y extrae todos los campos para 'calculosFinancieros'. El 'Saldo Pendiente' es la resta entre retroactivos reconocidos y pagos efectuados.

    ## FORMATO DE SALIDA
    Tu respuesta DEBE ser un único objeto JSON que contenga toda la información extraída y calculada, siguiendo el esquema de salida. Formatea todos los valores monetarios como strings sin símbolos de moneda y usando punto como separador decimal si es necesario.
`,
});

const analizarDocumentosPensionFlow = ai.defineFlow(
  {
    name: 'analizarDocumentosPensionFlow',
    inputSchema: AnalizarDocumentosPensionInputSchema,
    outputSchema: AnalizarDocumentosPensionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);
