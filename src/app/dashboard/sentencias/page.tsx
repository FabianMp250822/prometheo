
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { ProcesoCancelado } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gavel, Loader2, RotateCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, parsePeriodoPago, parseEmployeeName, parsePaymentDetailName, timestampToDate } from '@/lib/helpers';
import { Pensioner } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";
const PENSIONADOS_COLLECTION = "pensionados";

export default function SentenciasPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [procesos, setProcesos] = useState<ProcesoCancelado[]>([]);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all 'procesoscancelados'
            const procesosQuery = query(collection(db, PROCESOS_CANCELADOS_COLLECTION));
            const procesosSnapshot = await getDocs(procesosQuery);
            let procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

            // 2. Get all unique pensioner IDs
            const pensionerIds = [...new Set(procesosData.map(p => p.pensionadoId))];
            
            // 3. Fetch all corresponding pensioners in chunks
            const pensionersData: { [key: string]: Pensioner } = {};
            const chunkSize = 30;
            for (let i = 0; i < pensionerIds.length; i += chunkSize) {
                const chunk = pensionerIds.slice(i, i + chunkSize);
                const pensionerPromises = chunk.map(id => getDoc(doc(db, PENSIONADOS_COLLECTION, id)));
                const pensionerDocs = await Promise.all(pensionerPromises);

                pensionerDocs.forEach(pensionerDoc => {
                    if (pensionerDoc.exists()) {
                        const pensioner = { id: pensionerDoc.id, ...pensionerDoc.data() } as Pensioner;
                        pensionersData[pensioner.id] = pensioner;
                    }
                });
            }

            // 4. Enrich 'procesos' with pensioner info and calculate total amount
            let enrichedProcesos = procesosData.map(proceso => {
                const pensioner = pensionersData[proceso.pensionadoId];
                const totalAmount = proceso.conceptos.reduce((sum, c) => sum + c.ingresos, 0);
                return {
                    ...proceso,
                    pensionerInfo: pensioner ? {
                        name: parseEmployeeName(pensioner.empleado),
                        document: pensioner.documento,
                        department: pensioner.dependencia1
                    } : undefined,
                    totalAmount,
                };
            });

            // 5. Sort by 'periodoPago' descending
            enrichedProcesos.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            setProcesos(enrichedProcesos);
            toast({ title: "Datos cargados", description: `${enrichedProcesos.length} registros encontrados.` });

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los datos." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const exportToExcel = () => {
        if (procesos.length === 0) {
            toast({ variant: 'destructive', title: "Error", description: "No hay datos para exportar." });
            return;
        }

        const dataToExport = procesos.flatMap(p => 
            p.conceptos.map(c => ({
                "ID Pensionado": p.pensionadoId,
                "Nombre Pensionado": p.pensionerInfo?.name || 'N/A',
                "Dependencia": p.pensionerInfo?.department || 'N/A',
                "Periodo de Pago": p.periodoPago,
                "Concepto": parsePaymentDetailName(c.nombre),
                "Ingresos": c.ingresos,
                "Egresos": c.egresos,
                "Año": p.año,
                "Fecha de Creación": timestampToDate(p.creadoEn)?.toLocaleString() ?? 'N/A',
            }))
        );

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Procesos Cancelados");

        XLSX.writeFile(workbook, `Reporte_Procesos_Cancelados_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "Exportación exitosa", description: "El archivo de Excel ha sido generado." });
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Gavel className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl md:text-3xl font-headline text-foreground">
                                    Análisis de Sentencias
                                </CardTitle>
                                <CardDescription>
                                    Visualice y exporte los datos de procesos cancelados.
                                </CardDescription>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                                <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Recargar
                            </Button>
                            <Button size="sm" onClick={exportToExcel} disabled={procesos.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar a Excel
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                    <CardDescription>
                        {procesos.length} procesos encontrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-10">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pensionado</TableHead>
                                    <TableHead>Periodo de Pago</TableHead>
                                    <TableHead>Conceptos</TableHead>
                                    <TableHead className="text-right">Monto Total</TableHead>
                                    <TableHead>Fecha Creación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {procesos.map(proceso => (
                                    <TableRow key={proceso.id}>
                                        <TableCell>
                                            <div className="font-medium">{proceso.pensionerInfo?.name || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{proceso.pensionadoId}</div>
                                        </TableCell>
                                        <TableCell>{proceso.periodoPago}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {proceso.conceptos.map(c => (
                                                    c.ingresos > 0 &&
                                                    <div key={c.codigo} className="text-xs flex items-center gap-2">
                                                        <Badge variant="secondary">{parsePaymentDetailName(c.nombre)}</Badge>
                                                        <span className="font-semibold">{formatCurrency(c.ingresos)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(proceso.totalAmount)}</TableCell>
                                        <TableCell>{timestampToDate(proceso.creadoEn)?.toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                                {procesos.length === 0 && !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No se encontraron datos.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
