
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';
import type { Pensioner } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { analizarPerfilPensionado } from '@/ai/flows/analizar-perfil-pensionado';

interface AnalysisDisplayProps {
    pensioner: Pensioner;
    pensionerData: any | null;
    isLoading: boolean;
    error: string | null;
}

interface CachedAnalysis {
    summary: string;
    createdAt: any;
}

export function AnalysisDisplay({ pensioner, pensionerData, isLoading, error }: AnalysisDisplayProps) {
    const { toast } = useToast();
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const fetchAnalysis = useCallback(async (forceRefresh = false) => {
        if (!pensionerData) return;

        setIsAnalyzing(true);
        setAnalysis(null);
        setAnalysisError(null);

        try {
            const cacheRef = doc(db, 'analisisPensionados', pensioner.documento);
            
            if (!forceRefresh) {
                const cacheSnap = await getDoc(cacheRef);
                if (cacheSnap.exists()) {
                    const cachedData = cacheSnap.data() as CachedAnalysis;
                    // Optional: Check if cache is stale, e.g., older than 24 hours
                    // const oneDay = 24 * 60 * 60 * 1000;
                    // if (new Date().getTime() - cachedData.createdAt.toDate().getTime() < oneDay) {
                    setAnalysis(cachedData.summary);
                    toast({ title: "Análisis Cargado", description: "Se recuperó un análisis guardado previamente." });
                    setIsAnalyzing(false);
                    return;
                    // }
                }
            }

            // If no cache or force refresh, run AI analysis
            toast({ title: "Generando Análisis con IA", description: "Esto puede tardar un momento..." });
            const result = await analizarPerfilPensionado({
                perfilCompletoPensionado: JSON.stringify(pensionerData, null, 2)
            });

            if (!result.summary) {
                throw new Error("La IA no generó un resumen válido.");
            }
            
            setAnalysis(result.summary);
            
            // Save result to cache
            await setDoc(cacheRef, {
                summary: result.summary,
                createdAt: serverTimestamp()
            });

        } catch (err: any) {
            console.error("Error during analysis:", err);
            setAnalysisError("Ocurrió un error al generar el análisis. Por favor, intente de nuevo.");
            toast({ variant: 'destructive', title: 'Error de Análisis', description: err.message || 'No se pudo completar la operación.' });
        } finally {
            setIsAnalyzing(false);
        }
    }, [pensioner.documento, pensionerData, toast]);

    useEffect(() => {
        // Trigger analysis when pensionerData is available
        if (pensionerData && !analysis) {
            fetchAnalysis();
        }
    }, [pensionerData, analysis, fetchAnalysis]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Cargando datos del pensionado...</span></div>;
    }

    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Análisis de IA para {pensioner.empleado}</CardTitle>
                        <CardDescription>Resumen ejecutivo y puntos clave del perfil.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchAnalysis(true)} disabled={isAnalyzing || !pensionerData}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Forzar Re-Análisis
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAnalyzing && (
                    <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analizando perfil completo. Esto puede tardar unos segundos...</span>
                    </div>
                )}
                {analysisError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{analysisError}</AlertDescription></Alert>}
                
                {analysis && (
                    <div className="prose prose-sm max-w-none p-4 border rounded-lg bg-background">
                         <div dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }} />
                    </div>
                )}

                {/* Chat component can be added here later */}
                {/* <div className="border-t pt-4">
                    <Button onClick={() => setIsChatOpen(!isChatOpen)} disabled={!analysis}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {isChatOpen ? "Cerrar Chat" : "Preguntar sobre el Análisis"}
                    </Button>
                    {isChatOpen && (
                        <div className="mt-4">
                           <p className="text-muted-foreground">El chat de seguimiento será implementado aquí.</p>
                        </div>
                    )}
                </div> */}
            </CardContent>
        </Card>
    );
}
