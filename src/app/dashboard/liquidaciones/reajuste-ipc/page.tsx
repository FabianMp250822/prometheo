
'use client';

import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserX, Percent } from 'lucide-react';
import { parseEmployeeName } from '@/lib/helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ReajusteIpcPage() {
    const { selectedPensioner } = usePensioner();

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Percent className="h-6 w-6" />
                        Liquidador: Solo Reajuste IPCs Ley 100
                    </CardTitle>
                    <CardDescription>
                        Calcula únicamente el reajuste pensional aplicando la variación del IPC conforme a la Ley 100.
                    </CardDescription>
                </CardHeader>
            </Card>

            {selectedPensioner ? (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                           Pensionado Seleccionado
                        </CardTitle>
                         <CardDescription>
                           {parseEmployeeName(selectedPensioner.empleado)} - C.C. {selectedPensioner.documento}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="anexo2" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="anexo2">Anexo 2</TabsTrigger>
                                <TabsTrigger value="preliquidación">Preliquidación</TabsTrigger>
                                <TabsTrigger value="antijuridico">Antijurídico</TabsTrigger>
                            </TabsList>
                            <TabsContent value="anexo2" className="mt-4">
                                <p className="text-muted-foreground">Contenido para Anexo 2 de Reajuste IPC.</p>
                            </TabsContent>
                            <TabsContent value="preliquidación" className="mt-4">
                                <p className="text-muted-foreground">Contenido para la preliquidación de Reajuste IPC.</p>
                            </TabsContent>
                            <TabsContent value="antijuridico" className="mt-4">
                               <p className="text-muted-foreground">Contenido para el cálculo Antijurídico de Reajuste IPC.</p>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed rounded-lg">
                            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No hay un pensionado seleccionado</h3>
                            <p className="text-muted-foreground">Por favor, use el buscador global para seleccionar un pensionado antes de continuar.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
