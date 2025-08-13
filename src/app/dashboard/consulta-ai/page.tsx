
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';
import { PensionerSearch } from '@/components/dashboard/consulta-ai/pensioner-search';
import { AnalysisDisplay } from '@/components/dashboard/consulta-ai/analysis-display';
import type { Pensioner } from '@/lib/data';
import { getFullPensionerData } from '@/services/pensioner-service';


export default function ConsultaAiPage() {
    const [selectedPensioner, setSelectedPensioner] = useState<Pensioner | null>(null);
    const [pensionerData, setPensionerData] = useState<any | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePensionerSelect = useCallback(async (pensioner: Pensioner | null) => {
        setSelectedPensioner(pensioner);
        setPensionerData(null);
        setError(null);

        if (!pensioner) {
            return;
        }

        setIsLoadingData(true);
        try {
            const fullData = await getFullPensionerData(pensioner.id, pensioner.documento);
            setPensionerData(fullData);
        } catch (err: any) {
            console.error("Error fetching full pensioner data:", err);
            setError("No se pudieron cargar los detalles completos del pensionado.");
        } finally {
            setIsLoadingData(false);
        }

    }, []);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <BrainCircuit className="h-6 w-6 text-accent" />
                        Módulo de Consulta con IA
                    </CardTitle>
                    <CardDescription>
                        Busque un pensionado para obtener un análisis detallado y perspicaz de su perfil completo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PensionerSearch onPensionerSelect={handlePensionerSelect} />
                </CardContent>
            </Card>

            {selectedPensioner && (
                 <AnalysisDisplay 
                    pensioner={selectedPensioner} 
                    pensionerData={pensionerData}
                    isLoading={isLoadingData}
                    error={error}
                />
            )}
        </div>
    );
}
