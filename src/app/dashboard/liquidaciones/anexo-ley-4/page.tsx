'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, FileText, UserX, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// --- Static Data ---
const datosConsolidados: { [key: number]: { smlmv: number; ipc: number; reajusteSMLMV: number; } } = {
    1999: { smlmv: 236460, ipc: 16.70, reajusteSMLMV: 16.01 },
    2000: { smlmv: 260100, ipc: 9.23, reajusteSMLMV: 10.00 },
    2001: { smlmv: 286000, ipc: 8.75, reajusteSMLMV: 9.96 },
    2002: { smlmv: 309000, ipc: 7.65, reajusteSMLMV: 8.04 },
    2003: { smlmv: 332000, ipc: 6.99, reajusteSMLMV: 7.44 },
    2004: { smlmv: 358000, ipc: 6.49, reajusteSMLMV: 7.83 },
    2005: { smlmv: 381500, ipc: 5.50, reajusteSMLMV: 6.56 },
    2006: { smlmv: 408000, ipc: 4.85, reajusteSMLMV: 6.95 },
    2007: { smlmv: 433700, ipc: 4.48, reajusteSMLMV: 6.30 },
    2008: { smlmv: 461500, ipc: 5.69, reajusteSMLMV: 6.41 },
    2009: { smlmv: 496900, ipc: 7.67, reajusteSMLMV: 7.67 },
    2010: { smlmv: 515000, ipc: 2.00, reajusteSMLMV: 3.64 },
    2011: { smlmv: 535600, ipc: 3.17, reajusteSMLMV: 4.00 },
    2012: { smlmv: 566000, ipc: 3.73, reajusteSMLMV: 5.81 },
    2013: { smlmv: 589500, ipc: 2.44, reajusteSMLMV: 4.02 },
    2014: { smlmv: 616000, ipc: 1.94, reajusteSMLMV: 4.50 },
    2015: { smlmv: 644350, ipc: 3.66, reajusteSMLMV: 4.60 },
    2016: { smlmv: 689455, ipc: 6.77, reajusteSMLMV: 7.00 },
    2017: { smlmv: 737717, ipc: 5.75, reajusteSMLMV: 7.00 },
    2018: { smlmv: 781242, ipc: 4.09, reajusteSMLMV: 5.90 },
    2019: { smlmv: 828116, ipc: 3.18, reajusteSMLMV: 6.00 },
    2020: { smlmv: 877803, ipc: 3.80, reajusteSMLMV: 6.00 },
    2021: { smlmv: 908526, ipc: 1.61, reajusteSMLMV: 3.50 },
    2022: { smlmv: 1000000, ipc: 5.62, reajusteSMLMV: 10.07 },
    2023: { smlmv: 1160000, ipc: 13.12, reajusteSMLMV: 16.00 },
    2024: { smlmv: 1300000, ipc: 9.28, reajusteSMLMV: 12.00 },
    2025: { smlmv: 1423500, ipc: 5.20, reajusteSMLMV: 9.50 }
};

const datosIPC: { [key: number]: number } = {
    1998: 16.70, 1999: 9.23, 2000: 8.75, 2001: 7.65, 2002: 6.99,
    2003: 6.49, 2004: 5.50, 2005: 4.85, 2006: 4.48, 2007: 5.69,
    2008: 7.67, 2009: 2.00, 2010: 3.17, 2011: 3.73, 2012: 2.44,
    2013: 1.94, 2014: 3.66, 2015: 6.77, 2016: 5.75, 2017: 4.09,
    2018: 3.18, 2019: 3.80, 2020: 1.61, 2021: 5.62, 2022: 13.12,
    2023: 9.28, 2024: 5.20
};

const formatNumber = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/D';
    return new Intl.NumberFormat('es-CO').format(Math.round(value));
};

const formatDifference = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return new Intl.NumberFormat('es-CO').format(Math.round(value));
};

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return 'Sin registro';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
};


export default function AnexoLey4Page() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const getStandardizedDependencia = (dependencia: string | undefined): string => {
        if (!dependencia) return '';
        const upperDep = dependencia.toUpperCase();
        if (upperDep.includes('BARRANQUILLA')) return 'ATLANTICO';
        if (upperDep.includes('SANTA MARTA')) return 'MAGDALENA';
        if (upperDep.includes('RIOHACHA')) return 'GUAJIRA';
        if (upperDep.includes('ATLANTICO')) return 'ATLANTICO';
        if (upperDep.includes('MAGDALENA')) return 'MAGDALENA';
        if (upperDep.includes('GUAJIRA')) return 'GUAJIRA';
        return dependencia;
    };

    const dependenciasPermitidas = ["ATLANTICO", "MAGDALENA", "GUAJIRA"];
    const estandarizada = getStandardizedDependencia(selectedPensioner?.dependencia1);
    const puedeCalcular = selectedPensioner && dependenciasPermitidas.some(dep => estandarizada.includes(dep));

    useEffect(() => {
        if (!selectedPensioner) return;
        
        const fetchPayments = async () => {
            setIsLoading(true);
            const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
            const snapshot = await getDocs(paymentsQuery);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(data);
            setIsLoading(false);
        };
        
        fetchPayments();
    }, [selectedPensioner]);
    
    const tableData = useMemo(() => {
        if (!payments.length) return [];

        const uniquePaymentsMap = new Map<string, Payment>();
        payments.forEach(pago => {
            const clave = `${pago.año}-${pago.periodoPago?.trim() || 'sin-periodo'}`;
            if (!uniquePaymentsMap.has(clave)) {
                uniquePaymentsMap.set(clave, pago);
            }
        });
        const uniquePayments = Array.from(uniquePaymentsMap.values());

        let proyeccionMesada = 0;

        const allYearsData = Object.keys(datosConsolidados).map((yearStr) => {
            const year = parseInt(yearStr);
            const { smlmv, reajusteSMLMV } = datosConsolidados[year];

            const pagosAño = uniquePayments.filter(p => p.año === yearStr);
            
            const getMesadaValue = (payment: Payment): number => {
                const mesadaDetail = payment.detalles.find(d => 
                    d.nombre?.toLowerCase().includes('mesada pensional') || 
                    d.nombre?.toLowerCase().includes('mesada') ||
                    d.codigo === 'MESAD'
                );
                return mesadaDetail?.ingresos || 0;
            };

            let mesadaPagada = 0;
            if (pagosAño.length > 0) {
                 const pagoEnero = pagosAño.find(p => p.periodoPago?.toLowerCase().includes('ene')) || pagosAño[0];
                 mesadaPagada = getMesadaValue(pagoEnero);
            }
            
            if (year === 1999) {
                proyeccionMesada = mesadaPagada;
            } else {
                 const reajusteAnterior = datosConsolidados[year - 1]?.reajusteSMLMV / 100 || 0;
                 proyeccionMesada *= (1 + reajusteAnterior);
            }

            const smlmvEnReajusteSMLMV = smlmv > 0 ? (proyeccionMesada / smlmv) : 0;
            const ipcAnterior = datosIPC[year - 1] || 0;
            
            let ultimoValorValido = 0;
            let valorMesadaAnterior = -1;
            
            const pagosOrdenadosAño = [...pagosAño].sort((a,b) => (a.periodoPago || "").localeCompare(b.periodoPago || ""));

            for (const pago of pagosOrdenadosAño) {
                 const valorActual = getMesadaValue(pago);
                 if (valorMesadaAnterior !== -1 && valorActual < valorMesadaAnterior * 0.5) {
                     break; // Caída drástica
                 }
                 ultimoValorValido = valorActual > 0 ? valorActual : ultimoValorValido;
                 if(valorActual > 0) valorMesadaAnterior = valorActual;
            }
            
            const mesadaPagadaIPCs = ultimoValorValido || mesadaPagada;
            const smlmvEnReajusteIPCs = smlmv > 0 ? (mesadaPagadaIPCs / smlmv) : 0;
            const diferenciaMesadas = proyeccionMesada - mesadaPagadaIPCs;
            const numeroPagosReales = pagosAño.length;
            const retroactivas = diferenciaMesadas * numeroPagosReales;

            return {
                año: year,
                smlmv,
                reajusteSMLMV,
                proyeccionMesadaDinamica: proyeccionMesada,
                smlmvEnReajusteSMLMV,
                ipcAño: ipcAnterior,
                mesadaPagadaIPCs,
                smlmvEnReajusteIPCs,
                diferenciaMesadas,
                numeroPagosReales,
                retroactivas,
            };
        });
        
        return allYearsData.filter(row => row.mesadaPagadaIPCs > 0);
    }, [payments]);
    
    const totalRetroactivas = useMemo(() => {
        return tableData.reduce((sum, row) => sum + (row.retroactivas || 0), 0);
    }, [tableData]);

    const handlePrint = () => window.print();

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!selectedPensioner) {
      return (
        <div className="p-8 flex flex-col items-center justify-center text-center">
            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay un pensionado seleccionado</h3>
            <p className="text-muted-foreground">Por favor, use el buscador global para seleccionar un pensionado.</p>
        </div>
      );
    }
    
    if (!puedeCalcular) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Cálculo no disponible</AlertTitle>
                    <AlertDescription>
                        El cálculo de Anexo Ley 4 solo está disponible para pensionados de ATLANTICO, MAGDALENA o GUAJIRA.
                        La dependencia de este pensionado es: <strong>{selectedPensioner.dependencia1 || 'No definida'}</strong>.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <FileText className="h-6 w-6" />
                            Anexo Ley 4
                        </CardTitle>
                        <CardDescription>
                            Proyección comparativa de la mesada convencional.
                            <span className="block mt-1 font-semibold text-primary">Pensionado: {selectedPensioner.empleado}</span>
                        </CardDescription>
                    </div>
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tabla 1: Reajuste de Mesada</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Año</TableHead>
                                    <TableHead>SMLMV</TableHead>
                                    <TableHead>% Reajuste SMLMV</TableHead>
                                    <TableHead>Proyección Mesada</TableHead>
                                    <TableHead># SMLMV Proyectado</TableHead>
                                    <TableHead>% Reajuste IPC</TableHead>
                                    <TableHead>Mesada Pagada</TableHead>
                                    <TableHead># SMLMV Pagado</TableHead>
                                    <TableHead>Diferencias</TableHead>
                                    <TableHead># Mesadas</TableHead>
                                    <TableHead>Total Retroactivas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map(row => (
                                    <TableRow key={row.año}>
                                        <TableCell>{row.año}</TableCell>
                                        <TableCell>{formatNumber(row.smlmv)}</TableCell>
                                        <TableCell>{row.reajusteSMLMV.toFixed(2)}%</TableCell>
                                        <TableCell>{formatNumber(row.proyeccionMesadaDinamica)}</TableCell>
                                        <TableCell>{row.smlmvEnReajusteSMLMV.toFixed(2)}</TableCell>
                                        <TableCell>{row.ipcAño.toFixed(2)}%</TableCell>
                                        <TableCell>{formatCurrency(row.mesadaPagadaIPCs)}</TableCell>
                                        <TableCell>{row.smlmvEnReajusteIPCs.toFixed(2)}</TableCell>
                                        <TableCell>{formatDifference(row.diferenciaMesadas)}</TableCell>
                                        <TableCell>{row.numeroPagosReales}</TableCell>
                                        <TableCell>{formatDifference(row.retroactivas)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Tabla 2: Compartición de la Mesada</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Placeholder for Table 2 logic */}
                    <p className="text-muted-foreground">La lógica para la tabla de compartición será implementada.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Total General</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">
                        {formatCurrency(totalRetroactivas)}
                    </div>
                    <p className="text-sm text-muted-foreground">Suma total de todas las diferencias retroactivas.</p>
                </CardContent>
            </Card>
        </div>
    );
}
