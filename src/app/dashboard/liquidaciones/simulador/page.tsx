
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

export default function SimuladorPage() {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <FlaskConical className="h-6 w-6" />
                        Simulador de Liquidación
                    </CardTitle>
                    <CardDescription>
                        Cree escenarios y proyecciones de liquidación con diferentes variables. Esta sección está en construcción.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed rounded-lg">
                        <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">Próximamente</h3>
                        <p className="text-muted-foreground">El simulador de liquidaciones está en desarrollo y estará disponible pronto.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
