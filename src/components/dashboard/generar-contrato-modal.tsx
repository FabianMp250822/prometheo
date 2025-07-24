'use client';

import React, { useState } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import type { DajusticiaClient } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';

const plantillaContrato = `
CONTRATO DE PRESTACION DE SERVICIOS

Los suscritos: {{mandanteNombre}}, identificado(a) con la cédula de ciudadanía Nº {{mandanteCedula}}, quien para efectos de este contrato es el Mandante, y Robinson Ricardo Rada González, abogado titulado y en ejercicio, identificado civil y profesionalmente con cédula de ciudadanía Nº 9.082.804 y Tarjeta profesional N° 19.429 del Ministerio de Justicia, en representación de la Sociedad Comercial denominada Consorcio Jurídico Especializado DAJUSTICIA S.A.S. (Matrícula Mercantil Nº 409.606 y NIT N° 900.077.205-9), quien para los efectos de este contrato se denomina el Mandatario, hemos celebrado el presente contrato de mandato para la prestación de servicios profesionales, compendiado en las siguientes consideraciones y cláusulas obligacionales entre las partes:

CONSIDERACIONES PREVIAS:

Que teniendo en cuenta que la Convención Colectiva de Trabajo celebrada entre Electrificadora del Atlántico S. A. (en adelante {{electrantaNombre}}) y el Sindicato de Trabajadores de la Energía de Colombia “SINTRAELECOL” para los años 1983-1985 consagró en el parágrafo 1º de su artículo 2º, que “Todos los trabajadores que se encuentran Pensionados por {{electrantaNombre}}, o que se pensionen en el futuro se les seguirá reconociendo todos los derechos contemplados en la Ley 4ª de 1976 sin consideración a su vigencia.”

Que este derecho y obligación de seguir reconociendo a la totalidad de sus pensionados “todos los derechos contemplados en la Ley 4ª de 1976 sin consideración a su vigencia” se mantuvo vigente y fue ratificado y consolidado con posterioridad a la entrada en vigor de la Ley 100 de 1993, a través de la compilación de las Convenciones Colectivas de Trabajo suscritas entre las mismas partes en la Convención Colectiva 1998-1999, reproduciendo en ella el contenido del mismo texto convencional a que se refiere el parágrafo 1º de su artículo 2º de la Convención celebrada entre {{electrantaNombre}} y “SINTRAELECOL” para los años 1983-85 en el Parágrafo Tercero de su Artículo 106, bajo el siguiente tenor literal:

“ARTICULO 106°. EXCEPCIONES  
(…)  
PARAGRAFO 3°. Todos los trabajadores que se encuentren pensionados por {{electrantaNombre}} o que se pensionen en el futuro se les seguirán reconociendo todos los derechos contemplados en la Ley 4ª de 1976 sin consideración a su vigencia (CONV.83-85).”

Que la Sala Laboral de la H. Corte Suprema de Justicia determinó desde fecha 19 de septiembre de 2006, cuando se resolvió el recurso de casación interpuesto por el apoderado de la sociedad ELECTRICARIBE S.A. ESP., contra la sentencia del 27 de abril de 2005, proferida por el Tribunal Superior del Distrito Judicial de Barranquilla, que la empresa ELECTRICARIBE S.A. ESP. se encuentra obligada con sus pensionados a proceder a los reajustes que, por la Ley 4ª de 1976, le corresponden a sus pensiones desde el año 2000.

Desde el precedente judicial la Corte estableció, frente a la cláusula contenida en la convención de 1983–1985, suscrita el 1º de agosto de 1983, que:
“Estima la Corte que si las partes de la convención colectiva convinieron que, en materia de reajuste pensional, se aplicaría la Ley 4ª de 1976 sin consideración a su vigencia, puede inferirse que fue su voluntad expresa mantener esa disposición más allá de que posteriormente fuera derogada o subrogada, lo cual no es contrario al orden público, ni constituye un atentado a principios constitucionales o legales.”

Ahora bien, es innegable que el reajuste contemplado en la Ley 4ª de 1976 es un derecho subjetivo en tanto se trata de una ventaja patrimonial concedida por la ley a determinados sujetos, que puede ser exigido judicialmente en el evento de que el obligado no cumpla voluntariamente. De modo que, por este aspecto, no queda duda de que cuando la convención se refiere a derechos contemplados en la Ley 4ª, está refiriéndose al reajuste aludido.

Que, por otra parte, la Sala Laboral de la Corte Suprema de Justicia agregó que:
Es evidente que de la cláusula trascrita por el Tribunal se deriva que la Electrificadora del Caribe S.A. asumió las obligaciones con cada uno de los trabajadores y pensionados de {{electrantaNombre}} desde el momento en que se efectuó la sustitución patronal, quedando a partir de ese momento a cargo de aquella todas las prerrogativas que se generen, sean de naturaleza legal o extralegal.

Que la mesada pensional es una sola, y que al ser compartida con la pensión legal a cargo de COLPENSIONES, no significa que la compartición se asimile a dos pensiones.

Que la mesada pensional ha mostrado un comportamiento descendiente en el número de salarios mínimos legales mensuales, disminuyendo el poder de compra de los ingresos pensionales.

Que esta reducción obedece a la aplicación del artículo 14 de la Ley 100 de 1993, que ordena aplicar como factor de reajuste de las pensiones, el 1° de enero de cada año, la variación porcentual del Índice de Precios al Consumidor certificado por el DANE para el año inmediatamente anterior.

Que la Ley 4ª de 1976 establece un sistema de reajuste pensional en el mismo porcentaje en que el Gobierno Nacional incrementa el salario mínimo legal mensual vigente, a partir del 1° de enero del año 2000 y hasta que dicha pensión sea compartida con la pensión subrogada por el ISS y/o COLPENSIONES; y una vez que la pensión convencional plena haya sido compartida, el reajuste se aplicará sobre el valor de la parte correspondiente a cada entidad, desde la anualidad siguiente a la compartición y hasta el año 2024, así como en los años subsiguientes hasta la inclusión en nómina de los nuevos valores compartidos de la mesada pensional y durante la expectativa de vida probable o real del pensionado y sus sustitutos.

Que se hace necesario reivindicar el derecho al reajuste periódico de la pensión compartida del mandante, representado en los reajustes no aplicados desde el reconocimiento de su estatus pensional hasta la actualidad y años subsiguientes, que hacen parte de su patrimonio y núcleo familiar.

OBJETO DEL CONTRATO:
A partir de la fecha, el Mandante confiere poder de mandato administrativo y judicial especial a favor del Mandatario para que, como apoderado del Mandante, defienda sus intereses convencionales obtenidos como fruto de la negociación colectiva de trabajo, con el objetivo de obtener, mediante sentencia, declaraciones a título de condena contra la Administradora Colombiana de Pensiones (Colpensiones) y el Fondo Nacional del Pasivo Pensional y Prestacional de ELECTRICARIBE S.A. ESP. – FONECA –, representado por FIDUPREVISORA S.A., que obliguen a las demandadas a cumplir las siguientes declaraciones y condenas, iguales o parecidas:

1.- Condenar a las demandadas a la inaplicación del sistema de reajuste anual establecido en el artículo 14 de la Ley 100 de 1993 a la pensión del actor, con fundamento en lo establecido en el artículo 1 de la Ley 4ª de 1976, adoptado mediante la Convención Colectiva de Trabajo celebrada entre {{electrantaNombre}} y “SINTRAELECOL” para los años 1983–1985 y la Convención Colectiva 1998–1999; artículos 48 y 53 de la CP, artículo 26 de la CADH, y artículos 272 y 288 de la Ley 100 de 1993.

2.- Condenar a FIDUPREVISORA S.A. a reajustar anualmente, de manera tracto sucesiva, la pensión convencional plena del actor en el mismo porcentaje en que el Gobierno Nacional incrementa el salario mínimo legal mensual vigente, a partir del 1° de enero del año 2000 y hasta que dicha pensión sea compartida con la pensión subrogada por el ISS y/o COLPENSIONES.

3.- Condenar simultáneamente a FIDUPREVISORA S.A. y COLPENSIONES a que, una vez compartida la pensión convencional plena, el reajuste se aplique en el mismo porcentaje en que se incrementa el salario mínimo legal sobre el valor de la parte correspondiente a cada entidad, desde la anualidad siguiente a la compartición y hasta el año 2024, así como en los años subsiguientes durante el proceso laboral, hasta la inclusión en nómina de los nuevos valores compartidos de la mesada pensional.

4.- Condenar a las demandadas a cancelar las diferencias de mesadas ordinarias y adicionales resultantes entre lo pagado en cada mes, en el periodo comprendido entre el 01-01-2000 y el 31-12-2024 (y subsiguientes), y el nuevo valor incrementado de la mesada según las pretensiones anteriores.

5.- Condenar a las demandadas a cancelar la indexación de las diferencias de mesadas causadas, de acuerdo con el acumulado del IPC certificado entre la fecha de causación y la fecha de pago, utilizando la siguiente fórmula:
   VA = VH x (IPC Final / IPC Inicial)
   donde:
   - VA = Valor actualizado
   - VH = Diferencias pensionales debidas
   - IPC Final = Índice de Precios al Consumidor del mes de pago
   - IPC Inicial = Índice de Precios al Consumidor del mes de causación.

6.- Que no exista pronunciamiento judicial ejecutoriado o conciliación que haga tránsito a cosa juzgada material sobre estas pretensiones.

7.- Que no opere el fenómeno de la prescripción para reclamar la declaratoria judicial del derecho al reajuste de la pensión convencional plena o compartida, en el mismo porcentaje en que el Gobierno Nacional incremente el salario mínimo legal mensual vigente, en los periodos indicados.

8.- Que los pagos parciales que FIDUPREVISORA S.A. llegare a probar, realizados por ELECTRICARIBE S.A. (HOY EN LIQUIDACIÓN) o FONECA, como consecuencia de conciliaciones, transacciones, fallos anteriores o acuerdos, se descuenten del total de la sentencia.

9.- Subsidiariamente, que se condene a FIDUPREVISORA S.A. a asumir adicionalmente los reajustes y demás ítems solicitados, correspondientes a la cuota parte subrogada por COLPENSIONES.

10.- Que, conforme a lo establecido en el artículo 2341 del Código Civil Colombiano y el artículo 16 de la Ley 446 de 1998, se condene a la demandada a reparar integralmente el “Daño Antijurídico” infligido al patrimonio del actor, indemnizando las diferencias de mesadas no canceladas oportunamente y que hayan cumplido tres o más años de causación.

11.- Lo que aparezca probado extra y ultra petita o en virtud del principio jurídico “jura novit curia”.

12.- Condenar a la demandada en costas y agencias judiciales.

13.- Que el mandante acudirá al Sistema Interamericano de Derechos Humanos para obtener medidas cautelares que impidan o anulen la prescripción de todas las mesadas, conforme a lo establecido en el artículo 151 del Código Procesal del Trabajo y de la Seguridad Social y el artículo 488 del Código Sustantivo del Trabajo.

SEGUNDA. – FACULTADES DEL MANDATARIO:
El Mandatario, en su calidad de abogado de DAJUSTICIA S.A.S., queda facultado para ejercer todos los actos necesarios para reclamar los derechos mencionados, incluyendo conciliar, desistir, sustituir, recibir el pago de los frutos económicos de la sentencia, deducir y pagarse honorarios y gastos, así como solicitar historia laboral y demás pruebas, conforme a los artículos 75 y 77 del Código General del Proceso y demás normas aplicables.

TERCERA. – HONORARIOS Y GASTOS:
Este contrato es de medios, y el Mandante reconocerá al Mandatario el 30% de los resultados económicos obtenidos como honorarios, libres de deducción alguna, correspondiendo el 70% restante al mandante.

CUARTA. – OBLIGACIONES DEL MANDANTE:
1) Pagar los honorarios pactados conforme a lo establecido en la cláusula TERCERA.
2) El Mandatario asumirá los gastos administrativos, técnicos y operativos necesarios para la gestión.
   Parágrafo 1: Para procesos judiciales y gestiones ante el SIDH, se pacta cuota litis, siendo el 70% de los resultados para el pensionado y el 30% para DAJUSTICIA S.A.S.
   Parágrafo 2: El aporte equivalente a dos salarios mínimos legales vigentes ($2.600.000 COP en 2024) se destinará a cubrir los costos operativos, y será reembolsado al pensionado al culminar el proceso.
   Parágrafo 3: La forma de pago del aporte se regirá según el acuerdo de pago diligenciado y entregado a DAJUSTICIA S.A.S.
   Parágrafo 4: El 30% de honorarios del Mandatario será libre de deducciones, siendo el Mandante responsable del 70% correspondiente a aportes obligatorios y embargos.
   Parágrafo 5: En caso de pago de la sentencia a la cuenta del demandante, éste consignará lo correspondiente al Mandatario en la cuenta corriente de Bancolombia N° 44297294643 a nombre de Consorcio Jurídico Especializado DAJUSTICIA S.A.S.

QUINTA. – CLAUSULA COMPROMISORIA:
El presente contrato y los poderes otorgados son irrevocables. Toda controversia, diferencia o reclamación derivada de la ejecución, interpretación o terminación de este contrato se resolverá ante un tribunal designado por el Director del Centro de Conciliación y Arbitraje de la Cámara de Comercio de Barranquilla, conforme a la normativa legal vigente.
   Parágrafo 1: La resolución se efectuará mediante Laudo Arbitral en equidad de dicha Cámara.
   Parágrafo 2: En caso de incumplimiento unilateral del Mandante, éste pagará las sumas que determine el tribunal.
   Parágrafo 3: En caso de fallecimiento del mandante, el Mandatario conservará su representación, y los herederos deberán cumplir las obligaciones pactadas.

SEXTA. – OBLIGACIONES DEL MANDANTE:
El Mandante se obliga a suministrar al Mandatario los documentos necesarios para la gestión del presente contrato.

SÉPTIMA. – OBLIGACIONES ADICIONALES DEL MANDANTE:
El Mandante deberá perfeccionar cualquier poder o autorización adicional necesaria para la ejecución y culminación del contrato.

OCTAVA. – INFORMES DEL MANDATARIO:
DAJUSTICIA S.A.S. proporcionará informes detallados de las etapas y avances del proceso a través de su correo electrónico: director.dajusticia@gmail.com, sin que el Mandante pueda exigir resultados definitivos antes de concluir las gestiones.

NOVENA. – AUTORIZACIÓN Y TRATAMIENTO DE INFORMACIÓN:
El Mandante autoriza expresamente a la justicia, a su representante legal y a las entidades involucradas a obtener, almacenar, tratar y utilizar toda la información necesaria para el cumplimiento del mandato, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.  
   (Esta autorización incluye datos, archivos y documentos de Colpensiones, FIDU Previsora Fónica y ELECTRICARIBE EN LIQUIDACIÓN, garantizando la confidencialidad y protección de la información).

DECIMA. – DOMICILIO:
Para efectos de este contrato:  
- DAJUSTICIA S.A.S. está domiciliada en Carrera 46 N° 90-17, Oficina 501, Centro Empresarial Distrito 90, Barranquilla. Tel.: 300-805 93 24 / 301-681 74 80. Email: director.dajusticia@gmail.com  
- El Mandante está domiciliado en {{direccion}}, Tel.: {{celular}}. Email: {{correo}}

UNDECIMA. – VALOR PROBATORIO:
El presente contrato tiene valor probatorio y mérito ejecutivo ante las autoridades y terceros.

Como constancia se firma ante notario público, a los 6 días del mes de febrero de 2025.

{{mandanteNombre}}
C.C. Nº {{mandanteCedula}}

Acepto:

Robinson Ricardo Rada González  
C.C. Nº 9.082.804  
T.P. N° 19.429 del Minjusticia  
REPRESENTANTE LEGAL  
DAJUSTICIA S.A.S.
`;

const generarDocumento = (plantilla: string, datos: Record<string, string>) => {
    let documento = plantilla;
    Object.keys(datos).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        documento = documento.replace(regex, `<strong class="text-primary">${datos[key] || 'N/A'}</strong>`);
    });
    return documento;
};

interface GenerarContratoModalProps {
    cliente: DajusticiaClient;
    onClose: () => void;
}

export function GenerarContratoModal({ cliente, onClose }: GenerarContratoModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    if (!cliente) return null;

    const datosContrato = {
        mandanteNombre: `${cliente.nombres} ${cliente.apellidos}`,
        mandanteCedula: cliente.cedula,
        electrantaNombre: "ELECTRANTA", // Placeholder, adjust if needed
        direccion: cliente.direccion,
        celular: cliente.celular,
        correo: cliente.correo,
    };

    const documentoHtml = generarDocumento(plantillaContrato, datosContrato);

    const handleGuardarContrato = async () => {
        setIsLoading(true);
        try {
            const documentosCollectionRef = collection(db, "nuevosclientes", cliente.id, "documentos");
            await addDoc(documentosCollectionRef, {
                tipo: 'Contrato de Prestación de Servicios',
                contenidoHtml: documentoHtml,
                datosCliente: cliente,
                creadoEn: serverTimestamp()
            });
            toast({ title: "Éxito", description: "Contrato guardado en la subcolección 'documentos' del cliente." });
            onClose();
        } catch (error: any) {
            console.error("Error guardando el contrato:", error);
            toast({ variant: 'destructive', title: "Error", description: `No se pudo guardar el contrato: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`
            <html>
                <head>
                    <title>Contrato de Prestación de Servicios</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; }
                        .content { padding: 2rem; }
                        strong { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="content">${documentoHtml.replace(/<br\s*\/?>/ig, '\n')}</div>
                </body>
            </html>
        `);
        printWindow?.document.close();
        printWindow?.print();
    };


    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Generar Contrato de Prestación de Servicios</DialogTitle>
                    <DialogDescription>
                        Revise el documento generado para {cliente.nombres} {cliente.apellidos}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 border rounded-md prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: documentoHtml.replace(/\n/g, '<br/>') }}
                />
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handlePrint}>Imprimir</Button>
                    <Button onClick={handleGuardarContrato} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Contrato en Firebase
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
