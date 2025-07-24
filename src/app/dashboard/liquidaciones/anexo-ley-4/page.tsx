'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, User, Hash } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { parseEmployeeName } from '@/lib/helpers';

export default function AnexoLey4Page() {
    const { selectedPensioner } = usePensioner();

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Anexo Ley 4
                    </CardTitle>
                    <CardDescription>
                        Proyección comparativa de la mesada pensional con incrementos de SMLMV e IPC.
                    </CardDescription>
                </CardHeader>
            </Card>

            {selectedPensioner && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                           Información del Pensionado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Cédula</p>
                                <p className="font-medium">{selectedPensioner.documento}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Nombre</p>
                                <p className="font-medium">{parseEmployeeName(selectedPensioner.empleado)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
