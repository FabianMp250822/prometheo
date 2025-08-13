
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/helpers';
import { type AnalizarDocumentosPensionOutput } from '@/ai/flows/analizar-documentos-pension';

interface InformeLiquidacionProps {
  data: AnalizarDocumentosPensionOutput;
}

const InformeLiquidacion: React.FC<InformeLiquidacionProps> = ({ data }) => {
  const totalAdeudado = data.liquidaciones.reduce((sum, item) => sum + parseFloat(item.valorAdeudado), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    // This function can be implemented with a library like jsPDF or html2pdf
    console.log('Export to PDF functionality to be implemented');
    alert('La funcionalidad de exportar a PDF está en desarrollo.');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white print:shadow-none">
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Informe de Liquidación de Pensión</h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Report Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ANÁLISIS Y CONCLUSIONES LIQUIDACIÓN DE {data.datosCliente.nombreCompleto.toUpperCase()}
        </h1>
        <p className="text-gray-600">
          Fecha de análisis: {new Date().toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Client Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">INFORMACIÓN DEL BENEFICIARIO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Nombre:</strong> {data.datosCliente.nombreCompleto}</p>
              {data.datosCliente.numeroIdentificacion && (
                <p><strong>Identificación:</strong> {data.datosCliente.numeroIdentificacion}</p>
              )}
              <p><strong>Empresa Demandada:</strong> {data.datosCliente.empresaDemandada}</p>
            </div>
            <div>
              <p><strong>Inicio de Pensión:</strong> {data.datosCliente.fechaInicialPension}</p>
              <p><strong>Mesada Actual:</strong> {formatCurrency(parseFloat(data.datosCliente.mesadaActual))}</p>
              <p><strong>Mesada Correcta:</strong> {formatCurrency(parseFloat(data.datosCliente.mesadaCorrecta))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">ANTECEDENTES PROCESALES</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.resumenJuridico.juzgadoPrimeraInstancia && (
              <p>El {data.resumenJuridico.juzgadoPrimeraInstancia} conoció el proceso en primera instancia.</p>
            )}
            {data.resumenJuridico.tribunalSegundaInstancia && (
              <p>El {data.resumenJuridico.tribunalSegundaInstancia} conoció en segunda instancia.</p>
            )}
            {data.resumenJuridico.corteCasacion && data.resumenJuridico.numeroSentencia && (
              <p>
                La {data.resumenJuridico.corteCasacion} en sentencia {data.resumenJuridico.numeroSentencia}
                {data.resumenJuridico.fechaSentencia && ` de ${data.resumenJuridico.fechaSentencia}`}, decidió 
                <strong> DECLARAR</strong> que <strong>{data.datosCliente.nombreCompleto.toUpperCase()}</strong> es 
                beneficiaria de la pensión de jubilación extralegal
                {data.resumenJuridico.conversionColectiva && ` consagrada en ${data.resumenJuridico.conversionColectiva}`}.
              </p>
            )}
            <p>
              <strong>Precedente Aplicado:</strong> {data.resumenJuridico.precedenteAplicado}
            </p>
            {data.resumenJuridico.errorIdentificado && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-800">
                  <strong>Error Identificado:</strong> {data.resumenJuridico.errorIdentificado}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liquidation Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">LIQUIDACIÓN DETALLADA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Año</TableHead>
                  <TableHead className="text-center">SMLMV</TableHead>
                  <TableHead className="text-center">Mesada Empresa</TableHead>
                  <TableHead className="text-center">% Aplicado</TableHead>
                  <TableHead className="text-center">Mesada Reajustada</TableHead>
                  <TableHead className="text-center">Mesada Cancelada</TableHead>
                  <TableHead className="text-center">Diferencia</TableHead>
                  <TableHead className="text-center"># Mesadas</TableHead>
                  <TableHead className="text-center">Valor Adeudado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.liquidaciones.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center font-medium">{row.año}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(row.smmlv))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(row.mesadaACargoEmpresa))}</TableCell>
                    <TableCell className="text-center">{row.porcentajeAplicado}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(row.mesadaReajustada))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(row.mesadaCancelada))}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(parseFloat(row.diferencia))}
                    </TableCell>
                    <TableCell className="text-center">{row.numeroMesadas}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {formatCurrency(parseFloat(row.valorAdeudado))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">RESUMEN FINANCIERO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Retroactivos (Corte):</span>
                <span className="font-medium">{formatCurrency(parseFloat(data.calculosFinancieros.totalRetroactivosCorte))}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pagado (Empresa):</span>
                <span className="font-medium">{formatCurrency(parseFloat(data.calculosFinancieros.totalPagadoEmpresa))}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Saldo Pendiente:</span>
                <span className="font-bold text-red-600">{formatCurrency(parseFloat(data.calculosFinancieros.saldoPendiente))}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Déficit Mesada Actual:</span>
                <span className="font-medium text-red-600">{formatCurrency(parseFloat(data.calculosFinancieros.deficitMesadaActual))}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Calculado (IA):</span>
                <span className="font-bold text-green-600">{formatCurrency(totalAdeudado)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm">Liquidado hasta:</span>
                <span className="text-sm">{data.calculosFinancieros.fechaLiquidacion}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conclusions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">CONCLUSIONES</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              Se observa que las liquidaciones realizadas por la empresa presentan inconsistencias en la aplicación 
              de los reajustes según el precedente {data.resumenJuridico.precedenteAplicado}.
            </p>
            
            {data.resumenJuridico.errorIdentificado && (
              <p>
                <strong>Error Principal:</strong> {data.resumenJuridico.errorIdentificado}
              </p>
            )}

            <p>
              El déficit total identificado asciende a <strong>{formatCurrency(totalAdeudado)}</strong>, 
              que corresponde a las diferencias acumuladas por la incorrecta aplicación de los porcentajes 
              de reajuste en los períodos liquidados.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-blue-800">
                <strong>Recomendación:</strong> Se sugiere proceder con el saneamiento de la pensión 
                aplicando los reajustes correctos según el precedente jurisprudencial aplicable y 
                cancelar las diferencias identificadas.
              </p>
            </div>

            {data.observaciones && (
              <div className="mt-4">
                <p><strong>Observaciones Adicionales:</strong></p>
                <p>{data.observaciones}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-8 print:mt-12">
        <p>Este análisis fue generado mediante inteligencia artificial especializada en liquidaciones pensionales</p>
        <p>Fecha de generación: {new Date().toLocaleString('es-CO')}</p>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          body {
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:mt-12 {
            margin-top: 3rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InformeLiquidacion;
