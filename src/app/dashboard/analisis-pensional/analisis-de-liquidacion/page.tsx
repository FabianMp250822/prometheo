
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, Sparkles, AlertTriangle, FileText, CheckCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePensioner } from '@/context/pensioner-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { type AnalizarDocumentosPensionOutput, analizarDocumentosPension } from '@/ai/flows/analizar-documentos-pension';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const MAX_FILES = 5;

const ResultTable = ({ data }: { data: any }) => {
    if (!data) return null;
    return (
        <div className="space-y-4 text-sm">
            {Object.entries(data).map(([sectionKey, sectionValue]) => (
                <div key={sectionKey}>
                    <h3 className="font-semibold text-lg mb-2 capitalize">{sectionKey.replace(/([A-Z])/g, ' $1')}</h3>
                     {Array.isArray(sectionValue) ? (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="bg-muted/50">
                                       {Object.keys(sectionValue[0] || {}).map(key => <th key={key} className="p-2 border">{key}</th>)}
                                   </tr>
                               </thead>
                               <tbody>
                                   {sectionValue.map((row, index) => (
                                       <tr key={index}>
                                           {Object.values(row).map((val: any, i) => <td key={i} className="p-2 border">{typeof val === 'number' ? val.toLocaleString('es-CO') : val}</td>)}
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                    ) : typeof sectionValue === 'object' && sectionValue !== null ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {Object.entries(sectionValue).map(([key, value]) => (
                               <div key={key} className="flex flex-col p-2 border rounded-md">
                                   <span className="text-xs text-muted-foreground">{key}</span>
                                   <span className="font-medium">{typeof value === 'number' ? value.toLocaleString('es-CO') : String(value)}</span>
                               </div>
                           ))}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
};


export default function AnalisisLiquidacionPage() {
    const { toast } = useToast();
    const { selectedPensioner } = usePensioner();
    const [files, setFiles] = useState<File[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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

    const handleFileConversion = (file: File): Promise<string> => {
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
        if (!selectedPensioner) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar un pensionado antes de analizar.' });
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const dataUris = await Promise.all(files.map(handleFileConversion));
            const result = await analizarDocumentosPension({ documentos: dataUris });
            setAnalysisResult(result);
            toast({ title: 'Análisis Completado', description: 'La IA ha procesado los documentos exitosamente.' });
        } catch (err: any) {
            console.error("Error during analysis:", err);
            setError('Ocurrió un error al analizar los documentos. Revise la consola para más detalles.');
            toast({ variant: 'destructive', title: 'Error de Análisis', description: err.message || 'No se pudo completar la operación.' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!analysisResult || !selectedPensioner) {
             toast({ variant: 'destructive', title: 'Error', description: 'No hay análisis para guardar o no se ha seleccionado un pensionado.' });
            return;
        }
        setIsSaving(true);
        try {
            const docRef = doc(db, 'pensionados', selectedPensioner.id, 'analisisPensional', `analisis_${Date.now()}`);
            await setDoc(docRef, {
                ...analysisResult,
                createdAt: serverTimestamp(),
                documentNames: files.map(f => f.name),
            });
            toast({ title: "Guardado Exitoso", description: "El resultado del análisis ha sido guardado en el perfil del pensionado." });
        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Error al Guardar', description: err.message });
        } finally {
            setIsSaving(false);
        }
    }


    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-accent" />
                        Análisis de Liquidación con IA
                    </CardTitle>
                    <CardDescription>
                        Suba hasta 5 documentos (sentencias, resoluciones, etc.) para que la IA extraiga los datos clave para la liquidación.
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
                    <Button onClick={handleAnalyze} disabled={isAnalyzing || files.length === 0} className="mt-4">
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Analizar Documentos
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
                            <CardDescription>Revise los datos extraídos por la IA y guárdelos si son correctos.</CardDescription>
                        </div>
                         <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Análisis
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ResultTable data={analysisResult} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

