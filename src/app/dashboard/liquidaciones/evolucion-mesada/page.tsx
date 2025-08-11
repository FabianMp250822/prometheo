
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
            const sortedByDate = paymentsInYear.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.startDate ?? new Date(9999, 1, 1);
                const dateB = parsePeriodoPago(b.periodoPago)?.startDate ?? new Date(9999, 1, 1);
                return dateA.getTime() - dateB.getTime();
            });

            const firstPaymentDate = parsePeriodoPago(sortedByDate[0].periodoPago)?.startDate;
            if (!firstPaymentDate) return 0;
            
            const firstMonth = firstPaymentDate.getMonth();

            const paymentsInFirstMonth = sortedByDate.filter(p => {
                const pDate = parsePeriodoPago(p.periodoPago)?.startDate;
                return pDate?.getMonth() === firstMonth;
            });
            
            return paymentsInFirstMonth.reduce((totalMesada, payment) => {
                const mesadaDetail = payment.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
                return totalMesada + (mesadaDetail?.ingresos || 0);
            }, 0);
        }

        const historicalRecord = historicalPayments.find(p => p.ANO_RET === year && p.VALOR_ANT);
        if (historicalRecord && historicalRecord.VALOR_ANT) {
            const valorAnt = parseFloat(historicalRecord.VALOR_ANT!.replace(/,/g, ''));
            if (!isNaN(valorAnt)) return valorAnt;
        }

        return 0;
    }, [payments, historicalPayments]);
    
    const getMonthlyPensionForYearAndMonth = useCallback((year: number, month: number): number => {
        const paymentsInMonth = payments.filter(p => {
            const pDate = parsePeriodoPago(p.periodoPago)?.startDate;
            return pDate?.getFullYear() === year && pDate.getMonth() === month - 1;
        });
        
        if (paymentsInMonth.length > 0) {
            return paymentsInMonth.reduce((totalMesada, payment) => {
                const mesadaDetail = payment.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
                return totalMesada + (mesadaDetail?.ingresos || 0);
            }, 0);
        }

        const historicalRecordForYear = historicalPayments.find(p => p.ANO_RET === year);
        if (historicalRecordForYear?.VALOR_ANT) {
            const valor = parseFloat(historicalRecordForYear.VALOR_ANT.replace(/,/g, ''));
            if (!isNaN(valor)) return valor;
        }
        
        return 0;
    }, [payments, historicalPayments]);

    const summaryData = useMemo(() => {
        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return null;
        
        const yearForAvg = firstPensionYear + 1;
        const januaryPension = getMonthlyPensionForYearAndMonth(yearForAvg, 1);
        const februaryPension = getMonthlyPensionForYearAndMonth(yearForAvg, 2);
        const marchPension = getMonthlyPensionForYearAndMonth(yearForAvg, 3);
        
        const validPensions = [januaryPension, februaryPension, marchPension].filter(p => p > 0);
        const averageSalary = validPensions.length > 0 ? validPensions.reduce((a, b) => a + b, 0) / validPensions.length : 0;
        
        let firstMesadaDate = `01/01/${firstPensionYear}`;
        
        const paymentInYear = payments.find(p => parseInt(p.año, 10) === firstPensionYear);
        if (paymentInYear) {
            const parsedDate = parsePeriodoPago(paymentInYear.periodoPago)?.startDate;
            if(parsedDate) {
                firstMesadaDate = formatFirebaseTimestamp(parsedDate.toISOString(), 'P');
            }
        } else {
            const historicalRecord = historicalPayments.find(p => p.ANO_RET === firstPensionYear && p.FECHA_DESDE);
            if(historicalRecord && historicalRecord.FECHA_DESDE){
                firstMesadaDate = formatFirebaseTimestamp(historicalRecord.FECHA_DESDE, 'P');
            }
        }

        return {
            salarioPromedio: averageSalary,
            porcentajeReemplazo: 100,
            mesadaPensional: averageSalary,
            fechaPrimeraMesada: firstMesadaDate,
        };

    }, [getFirstPensionInYear, getMonthlyPensionForYearAndMonth, payments, historicalPayments]);


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
                proyeccionMesadaSMLMV = summaryData?.mesadaPensional || mesadaPagada;
                proyeccionMesadaIPC = summaryData?.mesadaPensional || mesadaPagada;
            } else {
                const reajusteMayor = Math.max(reajusteSMLMV, reajusteIPC);
                proyeccionMesadaSMLMV = proyeccionSMLMVAnterior * (1 + reajusteMayor / 100);
                proyeccionMesadaIPC = proyeccionIPCAnterior * (1 + reajusteIPC / 100);
            }
            proyeccionSMLMVAnterior = proyeccionMesadaSMLMV;
            proyeccionIPCAnterior = proyeccionMesadaIPC;

            const numSmlmvSMLMV = smlmv > 0 ? proyeccionMesadaSMLMV / smlmv : 0;
            const numSmlmvIPC = smlmv > 0 ? proyeccionMesadaIPC / smlmv : 0;
            const perdidaPorcentual = proyeccionMesadaSMLMV > 0 ? (1 - (proyeccionMesadaIPC / proyeccionMesadaSMLMV)) * 100 : 0;
            const perdidaSmlmv = numSmlmvSMLMV - numSmlmvIPC;
            const diferenciaMesadas = proyeccionMesadaSMLMV - mesadaPagada;
            
            const numMesadas = 14; 
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
                totalDiferenciasRetroactivas,
            };
        });
    }, [getFirstPensionInYear, summaryData]);
    
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
                         {selectedPensioner && <span className="block mt-1 font-semibold text-primary">Pensionado: {parseEmployeeName(selectedPensioner.empleado)}</span>}
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
                    {summaryData && (
                        <Card>
                             <CardContent className="pt-6">
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">Ultimo Salario Promedio</TableCell>
                                            <TableCell className="text-right">{formatCurrency(summaryData.salarioPromedio)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Porcentaje Reemplazo</TableCell>
                                            <TableCell className="text-right">{summaryData.porcentajeReemplazo.toFixed(2)}%</TableCell>
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="font-semibold">Mesada Pensional</TableCell>
                                            <TableCell className="text-right">{formatCurrency(summaryData.mesadaPensional)}</TableCell>
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="font-semibold">Fecha Primera Mesada</TableCell>
                                            <TableCell className="text-right">{summaryData.fechaPrimeraMesada}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                   {renderTable(tablaData.filter(d => d.año <= 2014), "Liquidación Antes de Compartir")}
                   {renderTable(tablaData.filter(d => d.año > 2014), "Liquidación Después de Compartir")}
                </div>
            )}
        </div>
    );
}
