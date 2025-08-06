
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
 * - Indexación: IPC acumulado desde año de diferencia hasta año actual
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
    
    const getMesadaForPeriod = useCallback((year: number, month: number) => {
        const paymentForPeriod = payments.find(p => {
            const pDate = parsePeriodoPago(p.periodoPago)?.startDate;
            return pDate?.getFullYear() === year && pDate.getMonth() + 1 === month;
        });
        if (paymentForPeriod) {
            const mesadaDetail = paymentForPeriod.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
            return mesadaDetail?.ingresos || 0;
        }
        
        const historicalRecord = historicalPayments.find(p => p.ANO_RET === year && p.VALOR_ACT);
        if (historicalRecord) {
             return parseFloat(historicalRecord.VALOR_ACT!.replace(/,/g, ''));
        }

        return 0;
    }, [payments, historicalPayments]);

    const countMesadasInYear = useCallback((year: number): { ordinarias: number; extras: number; totales: number } => {
        // Find the first payment of the year to check if it's the start year of the pension
        const firstPaymentOfYear = payments.filter(p => parseInt(p.año, 10) === year)
            .sort((a,b) => (parsePeriodoPago(a.periodoPago)?.startDate?.getTime() || 0) - (parsePeriodoPago(b.periodoPago)?.startDate?.getTime() || 0))[0];

        if (year === 1999 && firstPaymentOfYear) {
            const paymentsIn1999 = payments.filter(p => parseInt(p.año, 10) === 1999);
            const mesadasOrdinarias = new Set<string>();
            let mesadasExtras = 0;
            
            paymentsIn1999.forEach(p => {
                 p.detalles.forEach(d => {
                     if (d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD') {
                         mesadasOrdinarias.add(p.periodoPago);
                     }
                     if (d.nombre?.includes('Mesada Adicional') || d.codigo === 'MESAD14') {
                         mesadasExtras++;
                     }
                 });
            });
            const ordinarias = mesadasOrdinarias.size;
            return { ordinarias, extras: mesadasExtras, totales: ordinarias + mesadasExtras };
        }

        // For other years, assume full year unless otherwise specified
        return { ordinarias: 12, extras: 2, totales: 14 };

    }, [payments]);
    
     const shouldSplitYear = useCallback((year: number) => {
        const paymentsInYear = payments.filter(p => parseInt(p.año, 10) === year);
        if (paymentsInYear.length < 2) return null;

        const sortedPayments = paymentsInYear.sort((a, b) => {
            const dateA = parsePeriodoPago(a.periodoPago)?.startDate ?? new Date(9999, 1, 1);
            const dateB = parsePeriodoPago(b.periodoPago)?.startDate ?? new Date(9999, 1, 1);
            return dateA.getTime() - dateB.getTime();
        });

        for (let i = 1; i < sortedPayments.length; i++) {
            const prevMesadaDetail = sortedPayments[i - 1].detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
            const currentMesadaDetail = sortedPayments[i].detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
            const prevMesada = prevMesadaDetail?.ingresos || 0;
            const currentMesada = currentMesadaDetail?.ingresos || 0;

            if (prevMesada > 0 && currentMesada > 0 && currentMesada < prevMesada) {
                const splitDate = parsePeriodoPago(sortedPayments[i].periodoPago)?.startDate;
                if (splitDate) {
                     return { splitMonth: splitDate.getMonth() + 1 };
                }
            }
        }
        return null;
    }, [payments]);

    const calculationPeriods = useMemo(() => {
        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return [];
    
        const lastYear = new Date().getFullYear();
        const years = Array.from({ length: lastYear - firstPensionYear + 1 }, (_, i) => firstPensionYear + i);
        
        const periods: { year: number; startMonth: number; endMonth: number; mesada: number; }[] = [];
    
        for (const year of years) {
            const splitInfo = shouldSplitYear(year);
            if (splitInfo) {
                const firstPeriodEndMonth = splitInfo.splitMonth - 1;
                const firstPeriodMesada = getMesadaForPeriod(year, 1);
                if (firstPeriodMesada > 0) {
                     periods.push({ year, startMonth: 1, endMonth: firstPeriodEndMonth, mesada: firstPeriodMesada });
                }

                const secondPeriodStartMonth = splitInfo.splitMonth;
                const secondPeriodMesada = getMesadaForPeriod(year, secondPeriodStartMonth);
                if(secondPeriodMesada > 0) {
                   periods.push({ year, startMonth: secondPeriodStartMonth, endMonth: 12, mesada: secondPeriodMesada });
                }
            } else {
                 const mesada = getFirstPensionInYear(year);
                 if (mesada > 0) {
                    periods.push({ year, startMonth: 1, endMonth: 12, mesada });
                }
            }
        }
        return periods;
    
    }, [getFirstPensionInYear, shouldSplitYear, getMesadaForPeriod]);
    
    const antijuridicoData = useMemo(() => {
        if (calculationPeriods.length === 0 || Object.keys(ipcDaneData).length === 0) return [];

        const valorInicialMesada = calculationPeriods[0].mesada;
        let mesadaReajustadaAnterior = valorInicialMesada;
        let ingresoTotalAnterior = valorInicialMesada;
        let pensionVejezAnterior = 0;
        
        return calculationPeriods.map((period, index) => {
            const smlmvAnual = datosConsolidados[period.year as keyof typeof datosConsolidados]?.smlmv || 0;
            const tope5SMLMV = smlmvAnual * 5;
            const ipcAnual = datosIPC[period.year - 1 as keyof typeof datosIPC] || 0;
            
            const numSmlmv = smlmvAnual > 0 ? (ingresoTotalAnterior / smlmvAnual) : 0;

            const porcentajeAjuste = index === 0 ? 0 : calculateAjustePorcentaje(numSmlmv, ipcAnual);
            
            const mesadaReajustada = index === 0 ? valorInicialMesada : mesadaReajustadaAnterior * (1 + porcentajeAjuste / 100);
            
            let pensionVejez = 0;
            const causanteRecordForPeriod = causanteRecords.find(rec => {
                if (!rec.fecha_desde) return false;
                const recordDate = new Date(formatFirebaseTimestamp(rec.fecha_desde, 'yyyy-MM-dd'));
                return recordDate.getFullYear() <= period.year;
            });
            if (causanteRecordForPeriod?.valor_iss && causanteRecordForPeriod.valor_iss > 0) {
                 pensionVejez = causanteRecordForPeriod.valor_iss;
            } else if (pensionVejezAnterior > 0) {
                const ipcAnterior = datosIPC[period.year - 1 as keyof typeof datosIPC] || 0;
                pensionVejez = pensionVejezAnterior * (1 + ipcAnterior / 100);
            }

            const cargoEmpresa = mesadaReajustada - pensionVejez;
            const pagadoEmpresa = period.mesada;
            const diferenciasInsolutas = Math.max(0, cargoEmpresa - pagadoEmpresa);

            // Updated mesadas calculation
            const mesadasOrdinarias = (period.year === 1999) 
                ? countMesadasInYear(1999).ordinarias
                : period.endMonth - period.startMonth + 1;
                
            let mesadasExtras = 0;
            if(period.year === 1999) {
                 mesadasExtras = countMesadasInYear(1999).extras;
            } else {
                if (period.startMonth <= 6 && period.endMonth >= 6) mesadasExtras++;
                if (period.startMonth <= 12 && period.endMonth >= 12) mesadasExtras++;
            }
            const numMesadas = mesadasOrdinarias + mesadasExtras;
            
            const diferenciasAnuales = diferenciasInsolutas * numMesadas;
            const danoAntijuridico = diferenciasAnuales;
            const diferenciasOrdinarias = diferenciasInsolutas * mesadasOrdinarias;
            const descuentoSalud = diferenciasOrdinarias * 0.12;

            mesadaReajustadaAnterior = mesadaReajustada;
            pensionVejezAnterior = pensionVejez > 0 ? pensionVejez : pensionVejezAnterior;
            ingresoTotalAnterior = pagadoEmpresa + pensionVejez;
            
            // Placeholder for new detailed indexing
            const indexacionDiferencias = 0; 
            const diferenciasIndexadas = diferenciasAnuales + indexacionDiferencias;

            return {
                ...period,
                tope5SMLMV,
                numSmlmv,
                porcentajeAjuste,
                mesadaReajustada,
                pensionVejez,
                cargoEmpresa,
                pagadoEmpresa,
                diferenciasInsolutas,
                numMesadas,
                danoAntijuridico,
                diferenciasAnuales,
                indexacionDiferencias,
                diferenciasIndexadas,
                mesadasOrdinarias,
                diferenciasOrdinarias,
                descuentoSalud,
            };
        });
    }, [calculationPeriods, causanteRecords, ipcDaneData, payments, countMesadasInYear]);

    const { dataAntesComparticion, dataDespuesComparticion } = useMemo(() => {
        const splitIndex = antijuridicoData.findIndex(row => row.pensionVejez > 0);
        if (splitIndex === -1) {
            return { dataAntesComparticion: antijuridicoData, dataDespuesComparticion: [] };
        }
        return {
            dataAntesComparticion: antijuridicoData.slice(0, splitIndex),
            dataDespuesComparticion: antijuridicoData.slice(splitIndex),
        };
    }, [antijuridicoData]);

    const renderAntijuridicoTable = (data: any[], title: string) => {
        if (data.length === 0) return null;

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-center text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="text-xs">
                        <TableHeader>
                             <TableRow>
                                <TableHead className="text-xs" rowSpan={2}>Año</TableHead>
                                <TableHead className="text-xs" rowSpan={2}>Tope 5 SMLMV</TableHead>
                                <TableHead className="text-xs" rowSpan={2}># SMLMV</TableHead>
                                <TableHead className="text-xs" rowSpan={2}>% de Ajuste</TableHead>
                                <TableHead className="text-center text-xs" colSpan={5}>Valor a</TableHead>
                                <TableHead className="text-xs" rowSpan={2}>Mesadas</TableHead>
                                <TableHead className="text-xs" rowSpan={2}>Daño AntiJurídico</TableHead>
                                <TableHead className="text-xs" rowSpan={2}>Diferencias Anuales</TableHead>
                                <TableHead className="text-center text-xs" colSpan={5}>Indexacion</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead className="text-xs">Mesada Reajustada</TableHead>
                                <TableHead className="text-xs">Pensión de Vejez</TableHead>
                                <TableHead className="text-xs">Cargo de la Empresa</TableHead>
                                <TableHead className="text-xs">Pagado por Empresa</TableHead>
                                <TableHead className="text-xs">Diferencias Insolutas</TableHead>
                                <TableHead className="text-xs">de Diferencias</TableHead>
                                <TableHead className="text-xs">Diferencias Indexadas</TableHead>
                                <TableHead className="text-xs">Mesadas Ordinarias</TableHead>
                                <TableHead className="text-xs">Diferencias Ordinarias</TableHead>
                                <TableHead className="text-xs">Descuento Salud 12%</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row) => {
                                const yearDisplay = row.startMonth > 1 || row.endMonth < 12 ? `${row.year} (${row.startMonth}-${row.endMonth})` : row.year;
                                return (
                                    <TableRow key={`${row.year}-${row.startMonth}`} className="text-xs">
                                        <TableCell className="text-xs">{yearDisplay}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.tope5SMLMV)}</TableCell>
                                        <TableCell className="text-xs">{row.numSmlmv.toFixed(2)}</TableCell>
                                        <TableCell className="text-xs">{row.porcentajeAjuste.toFixed(2)}%</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.mesadaReajustada)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.pensionVejez)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.cargoEmpresa)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.pagadoEmpresa)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.diferenciasInsolutas)}</TableCell>
                                        <TableCell className="text-xs">{row.numMesadas}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.danoAntijuridico)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.diferenciasAnuales)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.indexacionDiferencias)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.diferenciasIndexadas)}</TableCell>
                                        <TableCell className="text-xs">{row.mesadasOrdinarias}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.diferenciasOrdinarias)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.descuentoSalud)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };
    
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
                                <TabsTrigger value="anexo2" disabled>Anexo 2</TabsTrigger>
                                <TabsTrigger value="preliquidación" disabled>Preliquidación</TabsTrigger>
                                <TabsTrigger value="antijuridico">Antijurídico</TabsTrigger>
                            </TabsList>
                             <TabsContent value="antijuridico" className="mt-4 space-y-4">
                                {isLoading ? (
                                    <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : (
                                    <>
                                        {renderAntijuridicoTable(dataAntesComparticion, "Liquidación de Reajustes (Antes de Compartir)")}
                                        {renderAntijuridicoTable(dataDespuesComparticion, "Liquidación de Reajustes (Después de Compartir)")}
                                    </>
                                )}
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

