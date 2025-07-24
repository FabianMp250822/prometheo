
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PagosHistoricoRecord } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, FileText, UserX, AlertTriangle, BarChart3, MinusSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, parsePeriodoPago } from '@/lib/helpers';

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
};

const datosIPC: { [key: number]: number } = {
    1998: 16.70, 1999: 9.23, 2000: 8.75, 2001: 7.65, 2002: 6.99,
    2003: 6.49, 2004: 5.50, 2005: 4.85, 2006: 4.48, 2007: 5.69,
};

const formatNumber = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/D';
    return new Intl.NumberFormat('es-CO').format(Math.round(value));
};

const formatDifference = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return new Intl.NumberFormat('es-CO').format(Math.round(value));
};

export default function AnexoLey4Page() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const getStandardizedDependencia = (dependencia: string | undefined): string => {
        if (!dependencia) return '';
        const upperDep = dependencia.toUpperCase();
        if (upperDep.includes('BARRANQUILLA') || upperDep.includes('ATLANTICO')) return 'ATLANTICO';
        if (upperDep.includes('SANTA MARTA') || upperDep.includes('MAGDALENA')) return 'MAGDALENA';
        if (upperDep.includes('RIOHACHA') || upperDep.includes('GUAJIRA')) return 'GUAJIRA';
        return dependencia;
    };

    const dependenciasPermitidas = ["ATLANTICO", "MAGDALENA", "GUAJIRA"];
    const estandarizada = getStandardizedDependencia(selectedPensioner?.dependencia1);
    const puedeCalcular = selectedPensioner && dependenciasPermitidas.some(dep => estandarizada.includes(dep));

    useEffect(() => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            return;
        }
        
        const fetchPayments = async () => {
            setIsLoading(true);
            const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
            const snapshot = await getDocs(paymentsQuery);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            
            const uniquePayments = data.filter((payment, index, self) =>
                index === self.findIndex((p) => p.periodoPago?.trim() === payment.periodoPago?.trim())
            );
            setPayments(uniquePayments);

            // Fetch historical payments
            const historicalDocRef = doc(db, 'pagosHistorico', selectedPensioner.documento);
            const historicalDocSnap = await getDoc(historicalDocRef);
            if (historicalDocSnap.exists()) {
                const data = historicalDocSnap.data();
                if(data && Array.isArray(data.records)) {
                    setHistoricalPayments(data.records as PagosHistoricoRecord[]);
                }
            } else {
                setHistoricalPayments([]);
            }

            setIsLoading(false);
        };
        
        fetchPayments();
    }, [selectedPensioner]);
    
    const tabla1Data = useMemo(() => {
        const getMesadaValue = (payment: Payment | PagosHistoricoRecord): number => {
            if ('detalles' in payment) {
                 const mesadaDetail = payment.detalles.find(d => 
                    d.nombre?.toLowerCase().includes('mesada pensional') || 
                    d.nombre?.toLowerCase().includes('mesada') ||
                    d.codigo === 'MESAD'
                );
                return mesadaDetail?.ingresos || 0;
            } else if ('VALOR_ACT' in payment && payment.VALOR_ACT) {
                return parseFloat(payment.VALOR_ACT.replace(',', '.')) || 0;
            }
            return 0;
        };

        const getPagosDelAnio = (year: number) => {
            const pagosRecientes = payments.filter(p => p.año === String(year));
            if (pagosRecientes.length > 0) return pagosRecientes;
            const pagosHistoricos = historicalPayments.filter(p => p.ANO_RET === year);
            if (pagosHistoricos.length > 0) return pagosHistoricos;
            return [];
        }

        let proyeccionMesada = 0;
        const years = Object.keys(datosConsolidados).map(Number);
        
        const calculatedData = years.map(year => {
            const { smlmv, reajusteSMLMV } = datosConsolidados[year];
            const pagosAño = getPagosDelAnio(year);

            let mesadaPagada = 0;
            if (pagosAño.length > 0) {
                 mesadaPagada = getMesadaValue(pagosAño[0]);
            }
            
            if (year === 1999) {
                proyeccionMesada = mesadaPagada;
            } else {
                 const reajusteAnterior = datosConsolidados[year - 1]?.reajusteSMLMV / 100 || 0;
                 proyeccionMesada *= (1 + reajusteAnterior);
            }

            const smlmvEnReajusteSMLMV = smlmv > 0 ? (proyeccionMesada / smlmv) : 0;
            const ipcAnterior = datosIPC[year - 1] || 0;
            
            const mesadaPagadaIPCs = mesadaPagada;
            const smlmvEnReajusteIPCs = smlmv > 0 ? (mesadaPagadaIPCs / smlmv) : 0;
            const diferenciaMesadas = proyeccionMesada - mesadaPagadaIPCs;
            const numeroPagosReales = pagosAño.length > 0 ? (year === 2000 ? 13 : 14) : 0;
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

        return calculatedData.filter(row => row.mesadaPagadaIPCs > 0);
    }, [payments, historicalPayments]);
    
    const totalRetroactivas = useMemo(() => {
        return tabla1Data.reduce((sum, row) => sum + (row.retroactivas || 0), 0);
    }, [tabla1Data]);


    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    
    if (!selectedPensioner) return (
        <div className="p-8 flex flex-col items-center justify-center text-center">
            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay un pensionado seleccionado</h3>
            <p className="text-muted-foreground">Por favor, use el buscador global para seleccionar un pensionado.</p>
        </div>
    );
    
    if (!puedeCalcular) return (
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
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Anexo Ley 4
                    </CardTitle>
                    <CardDescription>
                        Proyección comparativa de la mesada convencional para <strong>{selectedPensioner.empleado}</strong>.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tabla 1: Reajuste de Mesada (1999 - 2007)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Año</TableHead>
                                    <TableHead>SMLMV</TableHead>
                                    <TableHead>Reajuste en % SMLMV</TableHead>
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
                                {tabla1Data.map(row => (
                                    <TableRow key={row.año}>
                                        <TableCell>{row.año}</TableCell>
                                        <TableCell>{formatCurrency(row.smlmv)}</TableCell>
                                        <TableCell>{row.reajusteSMLMV.toFixed(2)}%</TableCell>
                                        <TableCell>{formatCurrency(row.proyeccionMesadaDinamica)}</TableCell>
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
                     <div className="flex justify-end mt-4 font-bold text-lg">
                        <span>TOTAL:</span>
                        <span className="ml-4 text-primary">{formatCurrency(totalRetroactivas)}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tabla 2: Compartición de la Mesada</CardTitle>
                </CardHeader>
                <CardContent>
                     <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>En Desarrollo</AlertTitle>
                        <AlertDescription>
                            La lógica para la tabla de compartición y la tabla 3 está pendiente de implementación según las reglas de negocio específicas.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}

