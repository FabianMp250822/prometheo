'use client';

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
                        Esta sección está en construcción.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aquí podrá gestionar el Anexo de la Ley 4.</p>
                </CardContent>
            </Card>
        </div>
    );
}
