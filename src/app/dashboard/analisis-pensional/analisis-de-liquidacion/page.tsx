
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, Sparkles, AlertTriangle, FileText, CheckCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { type AnalizarDocumentosPensionOutput } from '@/ai/flows/analizar-documentos-pension';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/helpers';


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
            toast({ title: 'Análisis Completado', description: 'La IA ha procesado los documentos exitosamente.' });
        } catch (err: any) {
            console.error("Error during analysis:", err);
            setError(err.message || 'Ocurrió un error al analizar los documentos.');
            toast({ variant: 'destructive', title: 'Error de Análisis', description: err.message || 'No se pudo completar la operación.' });
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
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
                        Suba hasta 5 documentos (sentencias, resoluciones, etc.) para que la IA genere la tabla de liquidación.
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
                            <h4 className="font-semibold">Archivos Seleccionados:</h4>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                {files.map((file, i) => <li key={i}>{file.name}</li>)}
                            </ul>
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
                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-6 w-6 text-green-600" /> Resultados del Análisis</CardTitle>
                            <CardDescription>Tabla de liquidación generada por la IA.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResultTable data={analysisResult} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

