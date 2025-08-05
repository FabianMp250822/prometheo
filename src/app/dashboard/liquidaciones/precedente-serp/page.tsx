
'use client';

/*
 * LIQUIDADOR: PRECEDENTE 4555 SERP (2020) - VERSIÓN DINÁMICA
 * 
 * Este componente implementa las fórmulas Excel para el cálculo pensional 
 * según el precedente de la sentencia 4555 de la SERP del año 2020.
 * 
 * CARACTERÍSTICAS DINÁMICAS:
 * - Valor inicial: Obtenido de la primera mesada real del pensionado
 * - Años de cálculo: Desde el primer año con pensión hasta el año actual
 * - Valores "Pagado por Empresa": Extraídos de los pagos reales del pensionado
 * - Número de mesadas: Calculado dinámicamente de los registros de pagos
 * - Pensión de Vejez: Obtenida de los registros del causante
 * - Mesadas Ordinarias: Calculadas dinámicamente por período
 * 
 * FÓRMULAS IMPLEMENTADAS:
 * - % de Ajuste: 0% (primer año), luego SI(#SMLMV_anterior<=5; 15%; IPC_actual)
 * - Mesada Reajustada: Valor inicial, luego aplicar % de ajuste acumulativo
 * - Cargo Empresa: Mesada Reajustada - Pensión de Vejez
 * - Diferencias: Cargo Empresa - Pagado por Empresa (datos reales)
 * - Indexación: IPC acumulativo desde año de diferencia hasta año actual
 * 
 * DATOS FUENTE:
 * - Pagos del pensionado seleccionado
 * - Registros históricos de pagos
 * - Datos del causante para pensión de vejez
 * - Datos consolidados de SMLMV e IPC
 */

import { usePensioner } from '@/context/pensioner-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserX, Scale, Loader2 } from 'lucide-react';
import { parseEmployeeName, formatCurrency, parsePeriodoPago, formatFirebaseTimestamp } from '@/lib/helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PagosHistoricoRecord, CausanteRecord } from '@/lib/data';
import { datosConsolidados, datosIPC } from '../anexo-ley-4/page';

// Función para calcular el % de ajuste basado en # SMLMV del año anterior
const calculateAjustePorcentaje = (numSmlmvAnterior: number, ipcActual: number): number => {
    if (numSmlmvAnterior <= 5) {
        return 15; // 15% si # SMLMV del año anterior es <= 5
    } else {
        return ipcActual; // IPC si # SMLMV del año anterior es > 5
    }
};

export default function PrecedenteSerpPage() {
    const { selectedPensioner } = usePensioner();
    const [isLoading, setIsLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);
    const [causanteRecords, setCausanteRecords] = useState<CausanteRecord[]>([]);
    const [ipcDaneData, setIpcDaneData] = useState<any>({});


    const fetchAllData = useCallback(async () => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            setCausanteRecords([]);
            setIpcDaneData({});
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

            const causanteQuery = query(collection(db, 'causante'), where('cedula_causante', '==', selectedPensioner.documento));
            const causanteSnapshot = await getDocs(causanteQuery);
            if (!causanteSnapshot.empty) {
                const data = causanteSnapshot.docs[0].data();
                if (data && Array.isArray(data.records)) {
                    setCausanteRecords(data.records as CausanteRecord[]);
                }
            } else {
                setCausanteRecords([]);
            }
            
            const ipcDaneSnapshot = await getDocs(collection(db, 'ipcDane'));
            const ipcData: any = {};
            ipcDaneSnapshot.forEach(doc => {
                ipcData[doc.id] = doc.data();
            });
            setIpcDaneData(ipcData);

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
            const firstPayment = paymentsInYear.sort((a,b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.startDate ?? new Date(9999,1,1);
                const dateB = parsePeriodoPago(b.periodoPago)?.startDate ?? new Date(9999,1,1);
                return dateA.getTime() - dateB.getTime();
            })[0];
            const mesada = firstPayment.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
            if (mesada && mesada.ingresos > 0) return mesada.ingresos;
        }
        const historicalRecord = historicalPayments.find(p => p.ANO_RET === year && p.VALOR_ACT);
        if (historicalRecord) return parseFloat(historicalRecord.VALOR_ACT!.replace(/,/g, ''));
        return 0;
    }, [payments, historicalPayments]);

    const countMesadasInYear = useCallback((year: number, startMonth = 1, endMonth = 12): number => {
        // Siempre retornar 14 mesadas como norma (12 ordinarias + 2 adicionales)
        // independientemente de los datos reales de pagos
        const totalMonths = endMonth - startMonth + 1;
        return Math.round(14 * (totalMonths / 12));
    }, []);
    
    const countMesadasOrdinariasInPeriod = useCallback((year: number, startMonth = 1, endMonth = 12): number => {
        const paymentsInPeriod = payments.filter(p => {
            const paymentDate = parsePeriodoPago(p.periodoPago)?.startDate;
            return paymentDate && 
                   paymentDate.getFullYear() === year &&
                   (paymentDate.getMonth() + 1) >= startMonth &&
                   (paymentDate.getMonth() + 1) <= endMonth;
        });

        if (paymentsInPeriod.length > 0) {
             return paymentsInPeriod.reduce((count, p) => {
                 const hasMesada = p.detalles.some(detail =>
                    (detail.codigo === 'MESAD' || detail.nombre?.includes('Mesada Pensional'))
                );
                return count + (hasMesada ? 1 : 0);
            }, 0);
        }
        
        const historicalRecordsForYear = historicalPayments.filter(rec => rec.ANO_RET === year);
        if (historicalRecordsForYear.length > 0) {
            const totalMonths = endMonth - startMonth + 1;
            return Math.round(12 * (totalMonths / 12));
        } 

        return 0;
    }, [payments, historicalPayments]);

    const tabla1Data = useMemo(() => {
        if (!selectedPensioner) return [];

        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return [];

        const endYear = new Date().getFullYear();

        const relevantYears = Object.keys(datosConsolidados)
            .map(Number)
            .filter(year => year >= firstPensionYear && year <= endYear)
            .sort((a, b) => a - b);
        
        let proyeccionAnterior = 0;
        let numSmlmvProyectadoAnterior = 0;

        return relevantYears.map((year, index) => {
            const smlmv = datosConsolidados[year as keyof typeof datosConsolidados]?.smlmv || 0;
            const reajusteSMLMV = datosConsolidados[year as keyof typeof datosConsolidados]?.reajusteSMLMV || 0;
            const reajusteIPC = datosIPC[year - 1 as keyof typeof datosIPC] || 0;
            
            const mesadaPagada = getFirstPensionInYear(year);
            
            let proyeccionMesada = 0;
            if (index === 0) {
                 proyeccionMesada = mesadaPagada > 0 ? mesadaPagada : 0;
            } else {
                 const reajusteMayor = Math.max(reajusteSMLMV, reajusteIPC);
                 proyeccionMesada = proyeccionAnterior * (1 + reajusteMayor / 100);
            }
            proyeccionAnterior = proyeccionMesada > 0 ? proyeccionMesada : mesadaPagada;

            const numSmlmvProyectado = smlmv > 0 ? proyeccionMesada / smlmv : 0;
            const numSmlmvPagado = smlmv > 0 ? mesadaPagada / smlmv : 0;
            const diferencia = proyeccionMesada > 0 ? proyeccionMesada - mesadaPagada : 0;
            const numMesadas = countMesadasInYear(year);
            const totalRetroactivas = diferencia > 0 ? diferencia * numMesadas : 0;
            
            let numSmlmvMesadaPlena = 0;
            if (index === 0) {
                numSmlmvMesadaPlena = numSmlmvProyectado;
            } else {
                numSmlmvMesadaPlena = numSmlmvProyectadoAnterior;
            }
            numSmlmvProyectadoAnterior = numSmlmvProyectado;

            return {
                año: year,
                smlmv,
                reajusteSMLMV,
                proyeccionMesada,
                numSmlmvProyectado,
                reajusteIPC,
                mesadaPagada,
                numSmlmvPagado,
                diferencia,
                numMesadas,
                totalRetroactivas,
                numSmlmvMesadaPlena
            };
        });

    }, [selectedPensioner, countMesadasInYear, getFirstPensionInYear]);

    const totalGeneralRetroactivas = useMemo(() => {
        return tabla1Data.reduce((acc, row) => acc + row.totalRetroactivas, 0);
    }, [tabla1Data]);

    const sharingData = useMemo(() => {
        if (!causanteRecords || causanteRecords.length === 0 || tabla1Data.length === 0) return null;
        
        const lastRowTabla1 = tabla1Data[tabla1Data.length - 1];
        if (!lastRowTabla1) return null;

        const initialSharingRecord = [...causanteRecords]
            .filter(r => r.fecha_desde)
            .sort((a,b) => {
                const timeA = formatFirebaseTimestamp(a.fecha_desde!, 't');
                const timeB = formatFirebaseTimestamp(b.fecha_desde!, 't');
                return (typeof timeA === 'number' ? timeA : 0) - (typeof timeB === 'number' ? timeB : 0);
            })[0];

        if (!initialSharingRecord) return null;

        const mesadaColpensiones = initialSharingRecord.valor_iss || 0;
        const mayorValorEmpresa = initialSharingRecord.valor_empresa || 0;
        
        const mesadaPlena = lastRowTabla1.proyeccionMesada;
        
        const porcentajeColpensiones = mesadaPlena > 0 ? (mesadaColpensiones / mesadaPlena) * 100 : 0;
        const porcentajeEmpresa = mesadaPlena > 0 ? (mayorValorEmpresa / mesadaPlena) * 100 : 0;

        return {
            mesadaPlena,
            mesadaColpensiones,
            mayorValorEmpresa,
            porcentajeColpensiones,
            porcentajeEmpresa,
        };
    }, [causanteRecords, tabla1Data]);
    
    const calculationPeriods = useMemo(() => {
        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return [];
    
        const lastYear = new Date().getFullYear();
        const years = Array.from({ length: lastYear - firstPensionYear + 1 }, (_, i) => firstPensionYear + i);
        
        const periods: { year: number; startMonth: number; endMonth: number; mesada: number; }[] = [];
    
        for (const year of years) {
            const paymentsInYear = payments
                .filter(p => parseInt(p.año, 10) === year)
                .sort((a, b) => (parsePeriodoPago(a.periodoPago)?.startDate?.getTime() ?? 0) - (parsePeriodoPago(b.periodoPago)?.startDate?.getTime() ?? 0));
    
            let mesadasPorMes: (number | null)[] = Array(12).fill(null);
            
            if (paymentsInYear.length > 0) {
                 paymentsInYear.forEach(p => {
                    const mesadaDetail = p.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
                    if (mesadaDetail && mesadaDetail.ingresos > 0) {
                        const monthIndex = (parsePeriodoPago(p.periodoPago)?.startDate?.getMonth() ?? -1);
                        if (monthIndex !== -1) {
                            mesadasPorMes[monthIndex] = mesadaDetail.ingresos;
                        }
                    }
                });
            } else {
                const historicalMesada = getFirstPensionInYear(year);
                if (historicalMesada > 0) {
                     mesadasPorMes.fill(historicalMesada);
                } else {
                    continue; 
                }
            }
            
            let lastMesada: number | null = null;
            let lastPeriodStartMonth = 1;
            
            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                const mesadaActual = mesadasPorMes[monthIndex];
    
                if (lastMesada === null && mesadaActual !== null) {
                    lastMesada = mesadaActual;
                    lastPeriodStartMonth = monthIndex + 1;
                }
                
                // Split if current mesada is less than 50% of the last one
                if (mesadaActual !== null && lastMesada !== null && mesadaActual < lastMesada * 0.5) {
                    periods.push({ year, startMonth: lastPeriodStartMonth, endMonth: monthIndex, mesada: lastMesada });
                    lastPeriodStartMonth = monthIndex + 1;
                    lastMesada = mesadaActual;
                }
            }
            
            if (lastMesada !== null) {
                periods.push({ year, startMonth: lastPeriodStartMonth, endMonth: 12, mesada: lastMesada });
            }
        }
        return periods.filter(p => p.mesada > 0);
    
    }, [payments, historicalPayments, getFirstPensionInYear]);
    
    // Función para calcular la indexación según los datos de Excel
    const calcularIndexacionAcumulada = useCallback((diferenciasAnualesHistoricas: { año: number, monto: number }[], añoActual: number) => {
        if (diferenciasAnualesHistoricas.length === 0) return 0;
        
        console.log(`Calculando indexación para año ${añoActual}, diferencias históricas:`, diferenciasAnualesHistoricas);
        
        return diferenciasAnualesHistoricas.reduce((totalIndexacion, diff) => {
            // Solo indexar diferencias de años ANTERIORES al año actual
            if (diff.año >= añoActual) return totalIndexacion;
            
            let factorAcumulado = 1;
            
            // Aplicar IPC acumulado desde el año siguiente al de la diferencia hasta el año actual
            for (let year = diff.año + 1; year <= añoActual; year++) {
                const ipcAnual = datosIPC[year] || 0; // IPC del año actual (no year-1)
                factorAcumulado *= (1 + ipcAnual / 100);
                console.log(`    Aplicando IPC año ${year}: ${ipcAnual}% -> Factor acumulado: ${factorAcumulado.toFixed(4)}`);
            }
            
            const valorIndexado = diff.monto * factorAcumulado;
            const indexacionGenerada = valorIndexado - diff.monto;
            
            console.log(`  Diferencia año ${diff.año}: ${diff.monto.toLocaleString()} -> Factor: ${factorAcumulado.toFixed(4)} -> Indexación: ${indexacionGenerada.toLocaleString()}`);
            
            return totalIndexacion + indexacionGenerada;
        }, 0);
    }, []);
    
    const antijuridicoData = useMemo(() => {
        let pensionVejezAnterior = 0;
        let mesadaReajustadaAnterior = 0;
        let numSmlmvAnterior = 0;
    
        const diferenciasHistoricas: { año: number, monto: number }[] = [];

        return calculationPeriods.map((period, index) => {
            const pagadoEmpresa = period.mesada;
            const numMesadas = countMesadasInYear(period.year, period.startMonth, period.endMonth);
            const numMesadasOrdinarias = countMesadasOrdinariasInPeriod(period.year, period.startMonth, period.endMonth);
            const smlmvAnual = datosConsolidados[period.year as keyof typeof datosConsolidados]?.smlmv || 0;
            const tope5SMLMV = smlmvAnual * 5;
            const ipcActual = datosIPC[period.year as keyof typeof datosIPC] || 0;
    
            let porcentajeAjuste = 0;
            if (index > 0) {
                porcentajeAjuste = calculateAjustePorcentaje(numSmlmvAnterior, ipcActual);
            }
    
            const mesadaReajustada = index === 0 ? pagadoEmpresa : mesadaReajustadaAnterior * (1 + porcentajeAjuste / 100);
            const numSmlmv = smlmvAnual > 0 ? mesadaReajustada / smlmvAnual : 0;
    
            const causanteRecordForYear = causanteRecords.find(rec => {
                if (!rec.fecha_desde) return false;
                const recordDate = new Date(formatFirebaseTimestamp(rec.fecha_desde, 'yyyy-MM-dd'));
                return recordDate.getFullYear() === period.year && (recordDate.getMonth() + 1) === period.startMonth;
            });
    
            let pensionVejez = 0;
            if (causanteRecordForYear) {
                pensionVejez = causanteRecordForYear.valor_iss || 0;
            } else if (pensionVejezAnterior > 0) {
                const ipcAnterior = datosIPC[period.year - 1 as keyof typeof datosIPC] || 0;
                pensionVejez = pensionVejezAnterior * (1 + ipcAnterior / 100);
            }
    
            const cargoEmpresa = mesadaReajustada - pensionVejez;
            const diferenciasInsolutas = cargoEmpresa > 0 ? cargoEmpresa - pagadoEmpresa : 0;
            const diferenciasAnuales = diferenciasInsolutas > 0 ? diferenciasInsolutas * numMesadas : 0;
    
            if (diferenciasAnuales > 0) {
                diferenciasHistoricas.push({ año: period.year, monto: diferenciasAnuales });
            }

            const indexacionDiferencias = 0; // Placeholder for now
            const diferenciasIndexadas = diferenciasAnuales + indexacionDiferencias;
    
            // Update values for next iteration
            mesadaReajustadaAnterior = mesadaReajustada;
            numSmlmvAnterior = numSmlmv;
            pensionVejezAnterior = pensionVejez > 0 ? pensionVejez : pensionVejezAnterior;

    
            return {
                ...period,
                tope5SMLMV,
                numSmlmv,
                porcentajeAjuste,
                mesadaReajustada,
                pensionVejez,
                cargoEmpresa,
                diferenciasInsolutas,
                numMesadas,
                diferenciasAnuales,
                numMesadasOrdinarias,
                indexacionDiferencias,
                diferenciasIndexadas
            };
        });
    }, [calculationPeriods, causanteRecords, countMesadasInYear, countMesadasOrdinariasInPeriod]);

    const totalDiferenciasAnualesAntijuridico = useMemo(() => {
        return antijuridicoData.reduce((sum, row) => sum + row.diferenciasAnuales, 0);
    }, [antijuridicoData]);

    const totalIndexacionDiferencias = useMemo(() => {
        return 0; // No calcular por ahora
    }, [antijuridicoData]);

    const totalDiferenciasIndexadas = useMemo(() => {
        return 0; // No calcular por ahora
    }, [antijuridicoData]);

    const totalDiferenciasOrdinarias = useMemo(() => {
        return 0; // No calcular por ahora
    }, [antijuridicoData]);

    const totalDescuentoSalud = useMemo(() => {
        return 0; // No calcular por ahora
    }, [antijuridicoData]);

    const renderPreliquidacionTable = (title: string, data: { label: string; value: string | number; sublabel?: string }[]) => (
        <div className="mb-6">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground mb-2">{title}</h4>
            <Table className="border">
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium w-3/4">
                                {row.label}
                                {row.sublabel && <span className="block text-xs text-muted-foreground">{row.sublabel}</span>}
                            </TableCell>
                            <TableCell className="text-right">{typeof row.value === 'number' ? formatCurrency(row.value) : row.value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

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
                       <Tabs defaultValue="antijuridico" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="anexo2">Anexo 2</TabsTrigger>
                                <TabsTrigger value="preliquidación">Preliquidación</TabsTrigger>
                                <TabsTrigger value="antijuridico">Antijurídico</TabsTrigger>
                            </TabsList>
                            <TabsContent value="anexo2" className="mt-4 space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">1. Reajuste de Mesada a Cargo de la Empresa Antes de Compartir</CardTitle></CardHeader>
                                    <CardContent>
                                    {isLoading ? (
                                        <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                    ) : tabla1Data.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Año</TableHead>
                                                        <TableHead>SMLMV</TableHead>
                                                        <TableHead>% Reajuste SMLMV</TableHead>
                                                        <TableHead>Proyección Mesada</TableHead>
                                                        <TableHead># SMLMV</TableHead>
                                                        <TableHead>% Reajuste IPC</TableHead>
                                                        <TableHead>Mesada Pagada</TableHead>
                                                        <TableHead># SMLMV</TableHead>
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
                                                            <TableCell>{formatCurrency(row.proyeccionMesada)}</TableCell>
                                                            <TableCell>{row.numSmlmvProyectado.toFixed(2)}</TableCell>
                                                            <TableCell>{row.reajusteIPC.toFixed(2)}%</TableCell>
                                                            <TableCell>{formatCurrency(row.mesadaPagada)}</TableCell>
                                                            <TableCell>{row.numSmlmvPagado.toFixed(2)}</TableCell>
                                                            <TableCell>{formatCurrency(row.diferencia)}</TableCell>
                                                            <TableCell>{row.numMesadas}</TableCell>
                                                            <TableCell>{formatCurrency(row.totalRetroactivas)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                     <TableRow className="font-bold bg-muted">
                                                        <TableCell colSpan={10} className="text-right">TOTAL GENERAL RETROACTIVAS</TableCell>
                                                        <TableCell className="text-left">{formatCurrency(totalGeneralRetroactivas)}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-4">No se encontraron datos de pagos para este pensionado.</p>
                                    )}
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader><CardTitle className="text-base">2. Compartición de la Mesada Reajustada Así:</CardTitle></CardHeader>
                                    <CardContent>
                                    {isLoading ? (
                                         <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                    ) : sharingData ? (
                                        <Table>
                                            <TableBody>
                                                <TableRow><TableCell className="font-semibold">MESADA PLENA DE LA PENSION CONVENCIONAL ANTES DE LA COMPARTICION</TableCell><TableCell className="text-right font-bold">{formatCurrency(sharingData.mesadaPlena)}</TableCell><TableCell className="text-right font-bold">100.00%</TableCell></TableRow>
                                                <TableRow><TableCell colSpan={3} className="font-semibold text-center text-muted-foreground text-xs">CUOTAS PARTES EN QUE SE DISTRIBUYE EL MONTO DE MESADA PENSIONAL A PARTIR DE LA COMPARTICION</TableCell></TableRow>
                                                <TableRow><TableCell>MESADA RECONOCIDA POR COLPENSIONES</TableCell><TableCell className="text-right">{formatCurrency(sharingData.mesadaColpensiones)}</TableCell><TableCell className="text-right">{sharingData.porcentajeColpensiones.toFixed(2)}%</TableCell></TableRow>
                                                <TableRow><TableCell>MAYOR VALOR A CARGO DE LA EMPRESA</TableCell><TableCell className="text-right">{formatCurrency(sharingData.mayorValorEmpresa)}</TableCell><TableCell className="text-right">{sharingData.porcentajeEmpresa.toFixed(2)}%</TableCell></TableRow>
                                            </TableBody>
                                        </Table>
                                    ) : (
                                         <p className="text-center text-muted-foreground py-4">No se encontraron datos de compartición.</p>
                                    )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-base">3. Reajuste de Mesada Cuota Parte de Empresa (Fiduprevisora)</CardTitle></CardHeader>
                                    <CardContent><Table>
                                        <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>SMLMV</TableHead><TableHead>% Reajuste SMLMV</TableHead><TableHead>Proyección Mesada</TableHead><TableHead># SMLMV</TableHead><TableHead>% Reajuste IPC</TableHead><TableHead>Mesada Pagada</TableHead><TableHead># SMLMV</TableHead><TableHead>Diferencias</TableHead><TableHead># Mesadas</TableHead><TableHead>Total Retroactivas</TableHead></TableRow></TableHeader>
                                        <TableBody>{[] /* Placeholder for table 3 data */ .map((row: any) => (<TableRow key={row.anio}><TableCell>{row.anio}</TableCell><TableCell>{formatCurrency(row.smlmv)}</TableCell><TableCell>{row.reajusteSmlmv.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.proyeccion)}</TableCell><TableCell>{row.numSmlmvProyeccion.toFixed(2)}</TableCell><TableCell>{row.reajusteIpc.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.mesadaPagada)}</TableCell><TableCell>{row.numSmlmvPagado.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.diferencia)}</TableCell><TableCell>{row.numMesadas.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.totalRetroactivas)}</TableCell></TableRow>))}</TableBody>
                                    </Table></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="text-base">4. Reajuste de Mesada Cuota Parte de Colpensiones</CardTitle></CardHeader>
                                    <CardContent><Table>
                                        <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>SMLMV</TableHead><TableHead>% Reajuste SMLMV</TableHead><TableHead>Proyección Mesada</TableHead><TableHead># SMLMV</TableHead><TableHead>% Reajuste IPC</TableHead><TableHead>Mesada Pagada</TableHead><TableHead># SMLMV</TableHead><TableHead>Diferencias</TableHead><TableHead># Mesadas</TableHead><TableHead>Total Retroactivas</TableHead></TableRow></TableHeader>
                                        <TableBody>{[] /* Placeholder for table 4 data */ .map((row: any) => (<TableRow key={row.anio}><TableCell>{row.anio}</TableCell><TableCell>{formatCurrency(row.smlmv)}</TableCell><TableCell>{row.reajusteSmlmv.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.proyeccion)}</TableCell><TableCell>{row.numSmlmvProyeccion.toFixed(2)}</TableCell><TableCell>{row.reajusteIpc.toFixed(2)}%</TableCell><TableCell>{formatCurrency(row.mesadaPagada)}</TableCell><TableCell>{row.numSmlmvPagado.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.diferencia)}</TableCell><TableCell>{row.numMesadas.toFixed(2)}</TableCell><TableCell>{formatCurrency(row.totalRetroactivas)}</TableCell></TableRow>))}</TableBody>
                                    </Table></CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="preliquidación" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-center text-lg">PRELIQUIDACION CONFORME A UNIDAD PRESTACIONAL CONVENCIONAL</CardTitle>
                                        <div className="flex justify-around pt-2">
                                            <span><strong>CÉDULA:</strong> {selectedPensioner.documento}</span>
                                            <span><strong>NOMBRE:</strong> {parseEmployeeName(selectedPensioner.empleado)}</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {renderPreliquidacionTable("I. DATOS RELEVANTES DEL PENSIONADO Y SU MESADA PENSIONAL", [
                                            { label: "FECHA DE NACIMIENTO", value: "" },
                                            { label: "EDAD ACTUAL", value: "" },
                                            { label: "SEXO", value: "" },
                                            { label: "NUMERO DE AÑOS DE EXPECTATIVA DE VIDA DEL PENSIONADO SEGUN TABLA DE SUPERVIVIENCIA", value: "" },
                                            { label: "FECHA DE OTORGAMIENTO DE PENSION DE JUBILACIÓN", value: "" },
                                            { label: "AÑO Y MONTO DE LA MESADA A REAJUSTAR (1999)", value: 916964 },
                                            { label: "NUMERO DE SALARIOS MINIMOS DE LA MESADA A REAJUSTAR", value: "3.88" },
                                            { label: "FECHA DE COMPARTICION DE LA PENSION CONVENCIONAL CON LA PENSION DEL ISS-COLPENSIONES", value: "" },
                                            { label: "MESADA PLENA DE LA PENSION CONVENCIONAL ANTES DE LA COMPARTICION", value: 1335948 },
                                            { label: "PORCENTAJES Y VALORES DE CUOTAS PARTES EN QUE SE DISTRIBUYE EL MONTO DE LA MESADA PENSIONAL A PARTIR DE LA COMPARTICION", value: "" },
                                            { label: "A CARGO DE COLPENSIONES", value: "89.81%", sublabel: formatCurrency(1199822)},
                                            { label: "MAYOR VALOR A CARGO DE LA EMPRESA", value: "10.19%", sublabel: formatCurrency(136126)},
                                        ])}

                                        {renderPreliquidacionTable("II. INDICADOR DE MESADAS", [
                                            { label: "VALOR DE PENSION ACTUALMENTE DEVENGADA", sublabel: "(MAYOR VALOR A CARGO DE LA EMPRESA + PENSION ISS- COLPENSIONES)", value: 3613391 },
                                            { label: "NUMERO DE SALARIOS MINIMOS LEGALES MENSUALES VIGENTES DE PENSION ACTUALMENTE DEVENGADA", value: "2.78" },
                                            { label: "VALOR DE PENSION REAJUSTADA", sublabel: "(MAYOR VALOR REAJUSTADO + PENSION ISS-COLPENSIONES REAJUSTADA)", value: 3752432 },
                                            { label: "NUMERO DE SALARIOS MINIMOS LEGALES MENSUALES VIGENTES DE PENSION REAJUSTADA", value: "2.89" },
                                            { label: "VALOR DEL AUMENTO LOGRADO AL REAJUSTAR LA PENSION", value: 139041 },
                                            { label: "NUMERO DE SALARIOS MINIMos LEGALES MENSUALES VIGENTES DEL AUMENTO LOGRADO A LA MESADA INTEGRAL", value: "0.11" },
                                        ])}
                                        
                                        {renderPreliquidacionTable("III. PROYECCION DE MESADAS FUTURAS", [
                                            { label: "NUMERO DE MESADAS FUTURAS EN EXPECTATIVA DE VIDA DEL PENSIONADO", value: "2,025" },
                                            { label: "VALOR DEL AUMENTO LOGRADO AL REAJUSTAR LA PENSION", value: 139041 },
                                            { label: "MESADAS FUTURAS-EXPECTATIVA DE VIDA CON BASE EN EL REAJUSTE DIFERENCIAL OBTENIDO", value: "" },
                                        ])}

                                        {renderPreliquidacionTable("IV- ESTIMATIVO DE LOS 3 VALORES RESULTANTES OBTENIDOS CON EL REAJUSTE CORRECTO DE LA PENSIÓN:", [
                                            { label: "RETROACTIVO PRESCRITOS INDEXADOS A FECHA 30 SEPT. 2024", value: 497994871 },
                                            { label: "RETROACTIVO VIGENTE NO PRESCRITO", value: 73949176 },
                                            { label: "MESADAS FUTURAS-EXPECTATIVA DE VIDA CON BASE EN EL REAJUSTE DIFERENCIAL OBTENIDO", value: "" },
                                            { label: "TOTAL DE LOS CONCEPTOS POR RECUPERAR", value: 571944047 },
                                        ])}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                             <TabsContent value="antijuridico" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-center text-lg">LIQUIDACION DE LEY 4a: LIQUIDACION DE REAJUSTES PENSIONALES SOBRE SUMATORIA DE MESADAS</CardTitle>
                                        <CardDescription className="text-center">LIQUIDACION DE RETROACTIVOS NO PRESCRITOS</CardDescription>
                                    </CardHeader>
                                    <CardContent className="overflow-x-auto">
                                        {isLoading ? (
                                            <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                        ) : (
                                            <Table className="text-xs">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs">Año</TableHead>
                                                        <TableHead className="text-xs">Tope 5 SMLMV</TableHead>
                                                        <TableHead className="text-xs"># SMLMV</TableHead>
                                                        <TableHead className="text-xs">% de Ajuste</TableHead>
                                                        <TableHead className="text-xs">Mesada Reajustada</TableHead>
                                                        <TableHead className="text-xs">Pensión de Vejez</TableHead>
                                                        <TableHead className="text-xs">Cargo Empresa</TableHead>
                                                        <TableHead className="text-xs">Pagado por Empresa</TableHead>
                                                        <TableHead className="text-xs">Diferencias Insolutas</TableHead>
                                                        <TableHead className="text-xs"># Mesadas</TableHead>
                                                        <TableHead className="text-xs">Daño Antijurídico</TableHead>
                                                        <TableHead className="text-xs">Diferencias Anuales</TableHead>
                                                        <TableHead className="text-xs">Indexación de Diferencias</TableHead>
                                                        <TableHead className="text-xs">Diferencias Indexadas</TableHead>
                                                        <TableHead className="text-xs">Mesadas Ordinarias</TableHead>
                                                        <TableHead className="text-xs">Diferencias Ordinarias</TableHead>
                                                        <TableHead className="text-xs">Descuento Salud 12%</TableHead>
                                                        <TableHead className="text-xs">NETO DIFERENCIAS ORDINARIAS</TableHead>
                                                        <TableHead className="text-xs">TOTAL AÑO INDEXADO</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {antijuridicoData.map((row) => {
                                                        const yearDisplay = row.startMonth > 1 || row.endMonth < 12 ? `${row.year} (M${row.startMonth}-M${row.endMonth})` : row.year;
                                                        
                                                        return (
                                                            <TableRow key={`${row.year}-${row.startMonth}`} className="text-xs">
                                                                <TableCell className="text-xs">{yearDisplay}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.tope5SMLMV)}</TableCell>
                                                                <TableCell className="text-xs">{row.numSmlmv.toFixed(2)}</TableCell>
                                                                <TableCell className="text-xs">{row.porcentajeAjuste.toFixed(2)}%</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.mesadaReajustada)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.pensionVejez)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.cargoEmpresa)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.mesada)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.diferenciasInsolutas)}</TableCell>
                                                                <TableCell className="text-xs">{row.numMesadas}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(0)}</TableCell>
                                                                <TableCell className="text-xs font-bold bg-yellow-100">{formatCurrency(row.diferenciasAnuales)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.indexacionDiferencias)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(row.diferenciasIndexadas)}</TableCell>
                                                                <TableCell className="text-xs">{row.numMesadasOrdinarias}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(0)}</TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(0)}</TableCell>
                                                                <TableCell className="text-xs"></TableCell>
                                                                <TableCell className="text-xs">{formatCurrency(0)}</TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                    <TableRow className="font-bold bg-muted text-xs">
                                                        <TableCell colSpan={11} className="text-right text-xs">TOTALES</TableCell>
                                                        <TableCell className="text-xs font-bold bg-yellow-100">{formatCurrency(totalDiferenciasAnualesAntijuridico)}</TableCell>
                                                         <TableCell className="text-xs">{formatCurrency(totalIndexacionDiferencias)}</TableCell>
                                                        <TableCell className="text-xs">{formatCurrency(totalDiferenciasIndexadas)}</TableCell>
                                                        <TableCell className="text-xs"></TableCell>
                                                        <TableCell className="text-xs">{formatCurrency(totalDiferenciasOrdinarias)}</TableCell>
                                                        <TableCell className="text-xs">{formatCurrency(totalDescuentoSalud)}</TableCell>
                                                        <TableCell colSpan={2} className="text-right"></TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
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

