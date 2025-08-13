'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, Sparkles, AlertTriangle, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { type AnalizarDocumentosPensionOutput } from '@/ai/flows/analizar-documentos-pension';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/helpers';
import InformeLiquidacion from '@/components/InformeLiquidacion'; 


const ResultTable = ({ data }: { data: AnalizarDocumentosPensionOutput }) => {
    if (!data || !data.liquidaciones || data.liquidaciones.length === 0) return null;
    
    return (
        <div className="overflow-x-auto">
           <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Año</TableHead>
                        <TableHead>SMLMV</TableHead>
                        <TableHead>Mesada Empresa</TableHead>
                        <TableHead>% Aplicado</TableHead>
                        <TableHead>Mesada Reajustada</TableHead>
                        <TableHead>Mesada Cancelada</TableHead>
                        <TableHead>Diferencia</TableHead>
                        <TableHead># Mesadas</TableHead>
                        <TableHead>Valor Adeudado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.liquidaciones.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell>{row.año}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(row.smmlv))}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(row.mesadaACargoEmpresa))}</TableCell>
                            <TableCell>{row.porcentajeAplicado}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(row.mesadaReajustada))}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(row.mesadaCancelada))}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(parseFloat(row.diferencia))}</TableCell>
                            <TableCell>{row.numeroMesadas}</TableCell>
                            <TableCell className="font-bold text-primary">{formatCurrency(parseFloat(row.valorAdeudado))}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
           </Table>
        </div>
    );
};

const MAX_FILES = 5;

export default function AnalisisLiquidacionPage() {
    const { toast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalizarDocumentosPensionOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showFullReport, setShowFullReport] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFiles(prev => [...prev, ...acceptedFiles].slice(0, MAX_FILES));
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpeg', '.jpg', '.png'] },
        maxFiles: MAX_FILES,
    });

    const fileToDataURI = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleAnalyze = async () => {
        if (files.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, suba al menos un documento.' });
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        setAnalysisResult(null);
        setShowFullReport(false);

        try {
            setProcessingStatus('Convirtiendo archivos...');
            const dataUris = await Promise.all(files.map(fileToDataURI));
            
            setProcessingStatus('Enviando para análisis...');
             const response = await fetch('/api/analizar-documentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentos: dataUris }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }

            const result = await response.json();

            setAnalysisResult(result);
            toast({ 
                title: 'Análisis Completado', 
                description: 'La IA ha procesado los documentos y generado el informe completo.' 
            });
        } catch (err: any) {
            console.error("Error during analysis:", err);
            setError(err.message || 'Ocurrió un error al analizar los documentos.');
            toast({ variant: 'destructive', title: 'Error de Análisis', description: err.message || 'No se pudo completar la operación.' });
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-accent" />
                        Análisis de Liquidación con IA
                    </CardTitle>
                    <CardDescription>
                        Suba hasta 5 documentos (sentencias, resoluciones, etc.) para que la IA genere la tabla de liquidación y un informe completo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <FileUp className="h-10 w-10" />
                            {isDragActive ?
                                <p>Suelte los archivos aquí...</p> :
                                <p>Arrastre y suelte los archivos aquí, o haga clic para seleccionar (máx. 5)</p>
                            }
                        </div>
                    </div>
                    {files.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold mb-2">Archivos Seleccionados:</h4>
                            <div className="space-y-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span className="text-sm text-muted-foreground">{file.name}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => removeFile(i)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <Button onClick={handleAnalyze} disabled={isProcessing || files.length === 0} className="mt-4">
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {processingStatus || 'Analizando...'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Analizar Documentos
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error en el Análisis</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {analysisResult && (
                <>
                    {/* Resumen Ejecutivo */}
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-6 w-6 text-green-600" /> 
                                    Resultados del Análisis
                                </CardTitle>
                                <CardDescription>
                                    Análisis para {analysisResult.datosCliente.nombreCompleto}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => setShowFullReport(!showFullReport)} 
                                    variant={showFullReport ? "default" : "outline"}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {showFullReport ? "Vista Resumida" : "Informe Completo"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!showFullReport ? (
                                <>
                                    {/* Respuestas a las 9 preguntas clave */}
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-blue-700 border-b pb-2">
                                            Análisis Ejecutivo - Preguntas Clave
                                        </h3>

                                        {/* 1. Método usado para liquidar */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-blue-800 mb-2">1. Método Utilizado para Liquidar</h4>
                                            <p className="text-sm">{analysisResult.resumenJuridico.precedenteAplicado}</p>
                                            {analysisResult.resumenJuridico.errorIdentificado && (
                                                <p className="text-sm text-red-600 mt-1">
                                                    <strong>Error identificado:</strong> {analysisResult.resumenJuridico.errorIdentificado}
                                                </p>
                                            )}
                                        </div>

                                        {/* 2. Diferencias en evolución de mesada */}
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-2">2. Evolución de la Mesada</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Mesada Inicial:</span>
                                                    <p className="font-medium">{formatCurrency(parseFloat(analysisResult.evolucionMesada.mesadaInicial))}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Período:</span>
                                                    <p className="font-medium">{analysisResult.evolucionMesada.periodoAnalisis}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Compartición FONECA vs Colpensiones */}
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-green-800 mb-2">3. Compartición de la Pensión</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-green-600">FONECA/Empresa:</span>
                                                    <p className="font-medium">{analysisResult.comparticion.porcentajeFoneca} - {formatCurrency(parseFloat(analysisResult.comparticion.valorFoneca))}</p>
                                                </div>
                                                <div>
                                                    <span className="text-green-600">Colpensiones:</span>
                                                    <p className="font-medium">{analysisResult.comparticion.porcentajeColpensiones} - {formatCurrency(parseFloat(analysisResult.comparticion.valorColpensiones))}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4, 5, 6, 7 - Mesadas */}
                                        <div className="bg-yellow-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-yellow-800 mb-3">4-7. Comparación de Mesadas</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-yellow-600">5. Mesada Final Reajustada:</span>
                                                        <p className="font-bold text-green-600">{formatCurrency(parseFloat(analysisResult.evolucionMesada.mesadaFinalReajustada))}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-yellow-600">6. Mesada Actual Pagada:</span>
                                                        <p className="font-medium">{formatCurrency(parseFloat(analysisResult.evolucionMesada.mesadaActualPagada))}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-yellow-600">7. Mesada Reconocida Fiduprevisora:</span>
                                                        <p className="font-medium">{formatCurrency(parseFloat(analysisResult.evolucionMesada.mesadaReconocidaFiduprevisora))}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-yellow-600">8. Diferencia de Mesada:</span>
                                                        <p className="font-bold text-red-600">{formatCurrency(parseFloat(analysisResult.evolucionMesada.diferenciaMesada))}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 9. Comparación de métodos */}
                                        <div className="bg-purple-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-purple-800 mb-2">9. Comparación de Métodos</h4>
                                            <div className="space-y-3 text-sm">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-purple-600">Método Decisión Final:</span>
                                                        <p className="font-medium">{analysisResult.comparacionMetodos.metodoAplicadoCorte}</p>
                                                        <p className="text-xs text-gray-600">Resultado: {formatCurrency(parseFloat(analysisResult.comparacionMetodos.resultadoMetodoCorte))}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-purple-600">Unidad Prestacional v4-71:</span>
                                                        <p className="font-medium">{analysisResult.comparacionMetodos.metodoUnidadPrestacional}</p>
                                                        <p className="text-xs text-gray-600">Resultado: {formatCurrency(parseFloat(analysisResult.comparacionMetodos.resultadoUnidadPrestacional))}</p>
                                                    </div>
                                                </div>
                                                <div className="border-t pt-2">
                                                    <span className="text-purple-600 font-semibold">Método Más Favorable:</span>
                                                    <p className="font-bold text-green-600">{analysisResult.comparacionMetodos.metodoMasFavorable}</p>
                                                    <p className="text-xs text-gray-600">Diferencia: {formatCurrency(parseFloat(analysisResult.comparacionMetodos.diferencciaEntreMetodos))}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabla de liquidación */}
                                    <div className="mt-8">
                                        <h3 className="text-lg font-semibold text-blue-700 mb-4">Tabla de Liquidación Detallada</h3>
                                        <ResultTable data={analysisResult} />
                                    </div>

                                    {/* Resumen financiero */}
                                    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold mb-3">Resumen Financiero Final</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600">Total Pagado por Empresa:</p>
                                                <p className="font-bold">{formatCurrency(parseFloat(analysisResult.calculosFinancieros.totalPagadoEmpresa))}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Saldo Pendiente:</p>
                                                <p className="font-bold text-red-600">{formatCurrency(parseFloat(analysisResult.calculosFinancieros.saldoPendiente))}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Liquidado hasta:</p>
                                                <p className="font-medium">{analysisResult.calculosFinancieros.fechaLiquidacion}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Informe completo */
                                <InformeLiquidacion data={analysisResult} />
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
