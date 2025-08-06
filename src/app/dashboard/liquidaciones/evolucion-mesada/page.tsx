
'use client';

import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserX, BarChart3, Loader2 } from 'lucide-react';
import { parseEmployeeName, formatCurrency, parsePeriodoPago, formatFirebaseTimestamp } from '@/lib/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PagosHistoricoRecord, CausanteRecord } from '@/lib/data';
import { datosConsolidados } from '../anexo-ley-4/page';

interface EvolucionData {
    año: number;
    smlmv: number;
    reajusteSMLMV: number;
    proyeccionMesadaSMLMV: number;
    numSmlmvSMLMV: number;
    reajusteIPC: number;
    proyeccionMesadaIPC: number;
    numSmlmvIPC: number;
    perdidaPorcentual: number;
    perdidaSmlmv: number;
    mesadaPagada: number;
    diferenciaMesadas: number;
    numMesadas: number;
    totalDiferenciasRetroactivas: number;
}


export default function EvolucionMesadaPage() {
    const { selectedPensioner } = usePensioner();
    const [isLoading, setIsLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);

    const fetchAllData = useCallback(async () => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            return;
        }
        setIsLoading(true);
        try {
            const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const paymentsData = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            const uniquePayments = paymentsData.filter((payment, index, self) =>
                index === self.findIndex((p) => p.periodoPago === payment.periodoPago)
            );
            setPayments(uniquePayments);

            const historicalDocRef = doc(db, 'pagosHistorico', selectedPensioner.documento);
            const historicalDocSnap = await getDoc(historicalDocRef);
            if (historicalDocSnap.exists() && Array.isArray(historicalDocSnap.data().records)) {
                setHistoricalPayments(historicalDocSnap.data().records as PagosHistoricoRecord[]);
            } else {
                setHistoricalPayments([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPensioner]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const getFirstPensionInYear = useCallback((year: number): number => {
        const paymentsInYear = payments.filter(p => parseInt(p.año, 10) === year);
        if (paymentsInYear.length > 0) {
            const firstPayment = paymentsInYear.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.startDate ?? new Date(9999, 1, 1);
                const dateB = parsePeriodoPago(b.periodoPago)?.startDate ?? new Date(9999, 1, 1);
                return dateA.getTime() - dateB.getTime();
            })[0];
            const mesada = firstPayment.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
            if (mesada && mesada.ingresos > 0) return mesada.ingresos;
        }
        const historicalRecord = historicalPayments.find(p => p.ANO_RET === year && p.VALOR_ACT);
        if (historicalRecord) return parseFloat(historicalRecord.VALOR_ACT!.replace(/,/g, ''));
        return 0;
    }, [payments, historicalPayments]);

    const countMesadasInYear = useCallback((year: number): number => {
        const paymentsInYear = payments.filter(p => parseInt(p.año, 10) === year);
        if (paymentsInYear.length > 0) {
            return paymentsInYear.reduce((count, p) => {
                const hasMesada = p.detalles.some(detail => (detail.codigo === 'MESAD' || detail.nombre?.includes('Mesada Pensional')));
                const hasMesada14 = p.detalles.some(detail => (detail.codigo === 'MESAD14' || detail.nombre?.includes('Mesada Adicional 14_Junio')) || detail.nombre === '285-Mesada Adicional');
                return count + (hasMesada ? 1 : 0) + (hasMesada14 ? 1 : 0);
            }, 0);
        }
        const historicalRecordsForYear = historicalPayments.filter(rec => rec.ANO_RET === year);
        if (historicalRecordsForYear.length > 0) return 14; // Assumption for historical data
        return 0;
    }, [payments, historicalPayments]);

    const tablaData = useMemo((): EvolucionData[] => {
        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return [];

        const endYear = new Date().getFullYear();
        const years = Object.keys(datosConsolidados)
            .map(Number)
            .filter(year => year >= firstPensionYear && year <= endYear)
            .sort((a, b) => a - b);

        let proyeccionSMLMVAnterior = 0;
        let proyeccionIPCAnterior = 0;

        return years.map((year, index) => {
            const smlmv = datosConsolidados[year]?.smlmv || 0;
            const reajusteSMLMV = datosConsolidados[year]?.reajusteSMLMV || 0;
            const reajusteIPC = datosConsolidados[year - 1]?.ipc || 0;

            const mesadaPagada = getFirstPensionInYear(year);

            let proyeccionMesadaSMLMV = 0;
            let proyeccionMesadaIPC = 0;
            if (index === 0) {
                proyeccionMesadaSMLMV = mesadaPagada;
                proyeccionMesadaIPC = mesadaPagada;
            } else {
                proyeccionMesadaSMLMV = proyeccionSMLMVAnterior * (1 + reajusteSMLMV / 100);
                proyeccionMesadaIPC = proyeccionIPCAnterior * (1 + reajusteIPC / 100);
            }
            proyeccionSMLMVAnterior = proyeccionMesadaSMLMV;
            proyeccionIPCAnterior = proyeccionMesadaIPC;

            const numSmlmvSMLMV = smlmv > 0 ? proyeccionMesadaSMLMV / smlmv : 0;
            const numSmlmvIPC = smlmv > 0 ? proyeccionMesadaIPC / smlmv : 0;
            const perdidaPorcentual = proyeccionMesadaSMLMV > 0 ? (1 - (proyeccionMesadaIPC / proyeccionMesadaSMLMV)) * 100 : 0;
            const perdidaSmlmv = numSmlmvSMLMV - numSmlmvIPC;
            const diferenciaMesadas = proyeccionMesadaSMLMV - mesadaPagada;
            const numMesadas = countMesadasInYear(year);
            const totalDiferenciasRetroactivas = diferenciaMesadas * numMesadas;

            return {
                año: year,
                smlmv,
                reajusteSMLMV,
                proyeccionMesadaSMLMV,
                numSmlmvSMLMV,
                reajusteIPC,
                proyeccionMesadaIPC,
                numSmlmvIPC,
                perdidaPorcentual,
                perdidaSmlmv,
                mesadaPagada,
                diferenciaMesadas,
                numMesadas,
                totalDiferenciasRetroactivas,
            };
        });
    }, [getFirstPensionInYear, countMesadasInYear]);
    
    const renderTable = (data: EvolucionData[], title: string) => (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Año</TableHead>
                            <TableHead>SMLMV</TableHead>
                            <TableHead>Reajuste en % SMLMV</TableHead>
                            <TableHead>Proyeccion de Mesada Fiduprevisora con % SMLMV</TableHead>
                            <TableHead># de SMLMV (En el Reajuste x SMLMV)</TableHead>
                            <TableHead>Reajuste en % IPCs</TableHead>
                            <TableHead>Proyección de Mesada Fiduprevisora reajuste con IPCs</TableHead>
                            <TableHead># de SMLMV (En el Reajuste x IPC)</TableHead>
                            <TableHead>Pérdida Porcentual en Proyección IPCs</TableHead>
                            <TableHead>Pérdida en smlmv EN Proyección IPCs</TableHead>
                            <TableHead>Mesada Pagada por Fiduprevisora reajuste con IPCs</TableHead>
                            <TableHead>Diferencias de Mesadas</TableHead>
                            <TableHead># de Mesadas</TableHead>
                            <TableHead>Total Diferencias Retroactivas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map(row => (
                            <TableRow key={row.año}>
                                <TableCell>{row.año}</TableCell>
                                <TableCell>{formatCurrency(row.smlmv)}</TableCell>
                                <TableCell>{row.reajusteSMLMV.toFixed(2)}%</TableCell>
                                <TableCell>{formatCurrency(row.proyeccionMesadaSMLMV)}</TableCell>
                                <TableCell>{row.numSmlmvSMLMV.toFixed(2)}</TableCell>
                                <TableCell>{row.reajusteIPC.toFixed(2)}%</TableCell>
                                <TableCell>{formatCurrency(row.proyeccionMesadaIPC)}</TableCell>
                                <TableCell>{row.numSmlmvIPC.toFixed(2)}</TableCell>
                                <TableCell>{row.perdidaPorcentual.toFixed(2)}%</TableCell>
                                <TableCell>{row.perdidaSmlmv.toFixed(2)}</TableCell>
                                <TableCell>{formatCurrency(row.mesadaPagada)}</TableCell>
                                <TableCell>{formatCurrency(row.diferenciaMesadas)}</TableCell>
                                <TableCell>{row.numMesadas}</TableCell>
                                <TableCell>{formatCurrency(row.totalDiferenciasRetroactivas)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        Liquidador: Evolución de la Mesada
                    </CardTitle>
                    <CardDescription>
                        Análisis de la evolución de la mesada pensional comparando reajustes por SMLMV vs. IPC.
                    </CardDescription>
                </CardHeader>
            </Card>

            {!selectedPensioner && !isLoading && (
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

            {selectedPensioner && isLoading && (
                <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
            )}
            
            {selectedPensioner && !isLoading && (
                <div className="space-y-6">
                   {renderTable(tablaData.filter(d => d.año <= 2014), "Liquidación Antes de Compartir (Ejemplo hasta 2014)")}
                   {renderTable(tablaData.filter(d => d.año > 2014), "Liquidación Después de Compartir (Ejemplo desde 2015)")}
                </div>
            )}
        </div>
    );
}
