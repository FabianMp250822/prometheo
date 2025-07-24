'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function AnexoLey4Page() {
    return (
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Anexo Ley 4
                    </CardTitle>
                    <CardDescription>
                        Esta sección se reconstruirá.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Componente en blanco listo para la nueva implementación.</p>
                </CardContent>
            </Card>
        </div>
    );
}
