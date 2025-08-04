
'use client';

import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserX, Scale } from 'lucide-react';
import { parseEmployeeName, formatCurrency } from '@/lib/helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Sample data extracted from the image
const anexo2Data1 = [
    { anio: 1999, smlmv: 236460, reajusteSmlmv: 0.00, proyeccion: 916964, numSmlmvProyeccion: 3.88, reajusteIpc: 16.70, mesadaPagada: 916964, numSmlmvPagado: 3.88, diferencia: 0, numMesadas: 0.00, totalRetroactivas: 0 },
    { anio: 2000, smlmv: 260100, reajusteSmlmv: 15.00, proyeccion: 1054509, numSmlmvProyeccion: 3.88, reajusteIpc: 9.23, mesadaPagada: 1001500, numSmlmvPagado: 3.85, diferencia: 52909, numMesadas: 14.00, totalRetroactivas: 740726 },
    { anio: 2001, smlmv: 286000, reajusteSmlmv: 15.00, proyeccion: 1212685, numSmlmvProyeccion: 4.05, reajusteIpc: 8.75, mesadaPagada: 1089240, numSmlmvPagado: 3.81, diferencia: 123445, numMesadas: 14.00, totalRetroactivas: 1728230 },
];
const comparticionData = { mesadaPlena: 1844342, colpensiones: 1199822, empresa: 644520 };
const anexo2Data3 = [
    { anio: 2004, smlmv: 358000, reajusteSmlmv: 0.00, proyeccion: 644520, numSmlmvProyeccion: 1.80, reajusteIpc: 6.49, mesadaPagada: 136126, numSmlmvPagado: 0.38, diferencia: 508394, numMesadas: 10.00, totalRetroactivas: 5083940 },
    { anio: 2005, smlmv: 381500, reajusteSmlmv: 5.50, proyeccion: 679969, numSmlmvProyeccion: 1.78, reajusteIpc: 5.50, mesadaPagada: 143613, numSmlmvPagado: 0.38, diferencia: 536356, numMesadas: 14.00, totalRetroactivas: 7508984 },
];
const anexo2Data4 = [
    { anio: 2004, smlmv: 358000, reajusteSmlmv: 0.00, proyeccion: 1199822, numSmlmvProyeccion: 3.35, reajusteIpc: 6.49, mesadaPagada: 1199822, numSmlmvPagado: 3.35, diferencia: 0, numMesadas: 10.00, totalRetroactivas: 0 },
    { anio: 2005, smlmv: 381500, reajusteSmlmv: 5.50, proyeccion: 1255812, numSmlmvProyeccion: 3.32, reajusteIpc: 5.50, mesadaPagada: 1265812, numSmlmvPagado: 3.32, diferencia: 0, numMesadas: 14.00, totalRetroactivas: 0 },
];

export default function PrecedenteSerpPage() {
    const { selectedPensioner } = usePensioner();

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Scale className="h-6 w-6" />
                        Liquidador: Precedente 4555 SERP (2020)
                    </CardTitle>
                    <CardDescription>
                        Aplica la liquidación conforme al precedente de la sentencia 4555 de la SERP del año 2020.
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
                            <TabsContent value="anexo2" className="mt-4 space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">1. Reajuste de Mesada a Cargo de la Empresa Antes de Compartir</CardTitle></CardHeader>
                                    <CardContent><Table>
                                        <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>SMLMV</TableHead><TableHead>% Reajuste SMLMV</TableHead><TableHead>Proyección Mesada</TableHead><TableHead># SMLMV</TableHead><TableHead>% Reajuste IPC</TableHead><TableHead>Mesada Pagada</TableHead><TableHead># SMLMV</TableHead><TableHead>Diferencias</TableHead><TableHead># Mesadas</TableHead><TableHead>Total Retroactivas</TableHead></TableRow></TableHeader>
                                        <TableBody>{anexo2Data1.map(row => (<TableRow key={row.anio}><TableCell>{row.anio}</TableCell><TableCell>{formatCurrency(row.smlmv)}</TableCell><TableCell>{row.reajusteSmlmv.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.proyeccion)}</TableCell><TableCell>{row.numSmlmvProyeccion.toFixed(2)}</TableCell><TableCell>{row.reajusteIpc.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.mesadaPagada)}</TableCell><TableCell>{row.numSmlmvPagado.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.diferencia)}</TableCell><TableCell>{row.numMesadas.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.totalRetroactivas)}</TableCell></TableRow>))}</TableBody>
                                    </Table></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="text-base">2. Compartición de la Mesada Reajustada Así:</CardTitle></CardHeader>
                                    <CardContent><Table>
                                        <TableBody>
                                            <TableRow><TableCell className="font-semibold">MESADA PLENA DE LA PENSION CONVENCIONAL ANTES DE LA COMPARTICION</TableCell><TableCell className="text-right font-bold">{formatCurrency(comparticionData.mesadaPlena)}</TableCell><TableCell className="text-right font-bold">100.00%</TableCell></TableRow>
                                            <TableRow><TableCell colSpan={3} className="font-semibold text-center text-muted-foreground text-xs">CUOTAS PARTES EN QUE SE DISTRIBUYE EL MONTO DE MESADA PENSIONAL A PARTIR DE LA COMPARTICION</TableCell></TableRow>
                                            <TableRow><TableCell>MESADA RECONOCIDA POR COLPENSIONES</TableCell><TableCell className="text-right">{formatCurrency(comparticionData.colpensiones)}</TableCell><TableCell className="text-right">{(comparticionData.colpensiones / comparticionData.mesadaPlena * 100).toFixed(2)}%</TableCell></TableRow>
                                            <TableRow><TableCell>MAYOR VALOR A CARGO DE LA EMPRESA</TableCell><TableCell className="text-right">{formatCurrency(comparticionData.empresa)}</TableCell><TableCell className="text-right">{(comparticionData.empresa / comparticionData.mesadaPlena * 100).toFixed(2)}%</TableCell></TableRow>
                                        </TableBody>
                                    </Table></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="text-base">3. Reajuste de Mesada Cuota Parte de Empresa (Fiduprevisora)</CardTitle></CardHeader>
                                    <CardContent><Table>
                                        <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>SMLMV</TableHead><TableHead>% Reajuste SMLMV</TableHead><TableHead>Proyección Mesada</TableHead><TableHead># SMLMV</TableHead><TableHead>% Reajuste IPC</TableHead><TableHead>Mesada Pagada</TableHead><TableHead># SMLMV</TableHead><TableHead>Diferencias</TableHead><TableHead># Mesadas</TableHead><TableHead>Total Retroactivas</TableHead></TableRow></TableHeader>
                                        <TableBody>{anexo2Data3.map(row => (<TableRow key={row.anio}><TableCell>{row.anio}</TableCell><TableCell>{formatCurrency(row.smlmv)}</TableCell><TableCell>{row.reajusteSmlmv.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.proyeccion)}</TableCell><TableCell>{row.numSmlmvProyeccion.toFixed(2)}</TableCell><TableCell>{row.reajusteIpc.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.mesadaPagada)}</TableCell><TableCell>{row.numSmlmvPagado.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.diferencia)}</TableCell><TableCell>{row.numMesadas.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.totalRetroactivas)}</TableCell></TableRow>))}</TableBody>
                                    </Table></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="text-base">4. Reajuste de Mesada Cuota Parte de Colpensiones</CardTitle></CardHeader>
                                    <CardContent><Table>
                                        <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>SMLMV</TableHead><TableHead>% Reajuste SMLMV</TableHead><TableHead>Proyección Mesada</TableHead><TableHead># SMLMV</TableHead><TableHead>% Reajuste IPC</TableHead><TableHead>Mesada Pagada</TableHead><TableHead># SMLMV</TableHead><TableHead>Diferencias</TableHead><TableHead># Mesadas</TableHead><TableHead>Total Retroactivas</TableHead></TableRow></TableHeader>
                                        <TableBody>{anexo2Data4.map(row => (<TableRow key={row.anio}><TableCell>{row.anio}</TableCell><TableCell>{formatCurrency(row.smlmv)}</TableCell><TableCell>{row.reajusteSmlmv.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.proyeccion)}</TableCell><TableCell>{row.numSmlmvProyeccion.toFixed(2)}</TableCell><TableCell>{row.reajusteIpc.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.mesadaPagada)}</TableCell><TableCell>{row.numSmlmvPagado.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.diferencia)}</TableCell><TableCell>{row.numMesadas.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.totalRetroactivas)}</TableCell></TableRow>))}</TableBody>
                                    </Table></CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="preliquidación" className="mt-4">
                                <p className="text-muted-foreground">Contenido para la preliquidación de Precedente SERP.</p>
                            </TabsContent>
                            <TabsContent value="antijuridico" className="mt-4">
                               <p className="text-muted-foreground">Contenido para el cálculo Antijurídico de Precedente SERP.</p>
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
