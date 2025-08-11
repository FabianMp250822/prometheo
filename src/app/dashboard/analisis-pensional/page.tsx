'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

export default function AnalisisPensionalPage() {
    return (
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <FlaskConical className="h-6 w-6" />
                        Análisis Pensional
                    </CardTitle>
                     <CardDescription>
                        Seleccione una opción del submenú para comenzar a realizar un análisis.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Herramientas avanzadas para el análisis detallado de casos pensionales.</p>
                </CardContent>
            </Card>
        </div>
    );
}