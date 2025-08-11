'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TestTubeDiagonal } from 'lucide-react';

export default function AnalisisLiquidacionPage() {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <TestTubeDiagonal className="h-6 w-6" />
                        Análisis de Liquidación
                    </CardTitle>
                    <CardDescription>
                        Esta sección está en construcción. Aquí se realizarán análisis detallados de las liquidaciones.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Próximamente...</p>
                </CardContent>
            </Card>
        </div>
    );
}