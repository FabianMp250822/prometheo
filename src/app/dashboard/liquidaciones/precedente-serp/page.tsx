
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

            if (prevMesada > 0 && currentMesada > 0 && currentMesada < prevMesada * 0.5) {
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
                const firstPeriodMesada = getMesadaForPeriod(year, firstPeriodEndMonth);
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
        if (calculationPeriods.length === 0) return [];
    
        const valorInicialMesada = calculationPeriods[0].mesada;
        let pensionVejezAnterior = 0;
        let mesadaReajustadaAnterior = valorInicialMesada;
        let ingresoTotalAnterior = valorInicialMesada;
        let diferenciasAcumuladas: { año: number, mes: number, monto: number }[] = [];

        const calcularIndexacionAcumulada = (añoActual: number, mesActual: number) => {
            let totalIndexado = 0;
            const ipcFinalData = ipcDaneData[(añoActual - 1).toString()];
            if (!ipcFinalData) return 0;
            const ipcFinal = ipcFinalData['Dic']?.valor1 || 0;

            if (ipcFinal === 0) return 0;

            diferenciasAcumuladas.forEach(diff => {
                const ipcInicialData = ipcDaneData[diff.año.toString()];
                const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                const mesStr = monthNames[diff.mes - 1];
                const ipcInicial = ipcInicialData?.[mesStr]?.valor1 || 0;
                
                if (ipcInicial > 0) {
                    const valorIndexado = diff.monto * (ipcFinal / ipcInicial);
                    totalIndexado += (valorIndexado - diff.monto);
                }
            });
            return totalIndexado;
        };
        
        const countActualMesadasInYear = (year: number): { ordinarias: number; extras: number } => {
            const paymentsInYear = payments.filter(p => parseInt(p.año, 10) === year);
            if (paymentsInYear.length === 0) return { ordinarias: 0, extras: 0 };
            
            let ordinarias = 0;
            let extras = 0;
            
            paymentsInYear.forEach(p => {
                const hasMesada = p.detalles.some(d => d.codigo === 'MESAD' || d.nombre?.includes('Mesada Pensional'));
                const hasMesada14 = p.detalles.some(d => d.codigo === 'MESAD14' || d.nombre?.includes('Mesada Adicional'));
                if (hasMesada) ordinarias++;
                if (hasMesada14) extras++;
            });
            
            return { ordinarias, extras };
        };


        return calculationPeriods.map((period, index) => {
            const pagadoEmpresa = period.mesada;
            const smlmvAnual = datosConsolidados[period.year as keyof typeof datosConsolidados]?.smlmv || 0;
            const tope5SMLMV = smlmvAnual * 5;
            
            const ipcAnual = datosIPC[period.year - 1 as keyof typeof datosIPC] || 0;

            const ingresoTotalAnteriorPeriodo = pensionVejezAnterior > 0 ? (mesadaReajustadaAnterior + pensionVejezAnterior) : mesadaReajustadaAnterior;

            const numSmlmvTotalAnterior = smlmvAnual > 0 ? ingresoTotalAnteriorPeriodo / smlmvAnual : 0;
            
            let porcentajeAjuste = 0;
            if (index > 0) {
                porcentajeAjuste = calculateAjustePorcentaje(numSmlmvTotalAnterior, ipcAnual);
            }

            let mesadaReajustada = 0;
            if (index === 0) {
                mesadaReajustada = valorInicialMesada;
            } else {
                mesadaReajustada = mesadaReajustadaAnterior * (1 + porcentajeAjuste / 100);
            }

            const causanteRecordForPeriod = causanteRecords.find(rec => {
                if (!rec.fecha_desde) return false;
                const recordDate = new Date(formatFirebaseTimestamp(rec.fecha_desde, 'yyyy-MM-dd'));
                return recordDate.getFullYear() <= period.year;
            });

            let pensionVejez = 0;
            if (causanteRecordForPeriod) {
                pensionVejez = causanteRecordForPeriod.valor_iss || 0;
                 if (pensionVejez === 0) {
                    const ipcAnterior = datosIPC[period.year - 1 as keyof typeof datosIPC] || 0;
                    pensionVejez = pensionVejezAnterior > 0 ? pensionVejezAnterior * (1 + ipcAnterior / 100) : 0;
                }
            }
            
            const cargoEmpresa = mesadaReajustada - pensionVejez;
            const diferenciasInsolutas = cargoEmpresa > 0 ? cargoEmpresa - pagadoEmpresa : 0;
            
            let numMesadasOrdinarias, numMesadas;
            const mesesEnPeriodo = period.endMonth - period.startMonth + 1;
            
            if (index === 0 && period.year === 1999) {
                 const conteoReal = countActualMesadasInYear(period.year);
                 numMesadasOrdinarias = conteoReal.ordinarias;
                 numMesadas = conteoReal.ordinarias + conteoReal.extras;
            } else {
                 numMesadasOrdinarias = mesesEnPeriodo;
                 let numMesadasExtra = 0;
                 if (period.startMonth <= 6 && period.endMonth >= 6) numMesadasExtra++;
                 if (period.startMonth <= 12 && period.endMonth >= 12 && mesesEnPeriodo === 12) numMesadasExtra++;
                 numMesadas = numMesadasOrdinarias + numMesadasExtra;
            }

            const diferenciasAnuales = diferenciasInsolutas > 0 ? diferenciasInsolutas * numMesadas : 0;
            
            const indexacionDiferencias = calcularIndexacionAcumulada(period.year, period.startMonth);
            const diferenciasIndexadas = diferenciasAnuales + indexacionDiferencias;
            
            const diferenciasOrdinarias = diferenciasInsolutas > 0 ? diferenciasInsolutas * numMesadasOrdinarias : 0;
            const descuentoSalud = diferenciasOrdinarias * 0.12;

            for (let m = period.startMonth; m <= period.endMonth; m++) {
                if (diferenciasInsolutas > 0) {
                    diferenciasAcumuladas.push({ año: period.year, mes: m, monto: diferenciasInsolutas });
                }
            }
            
            mesadaReajustadaAnterior = mesadaReajustada;
            pensionVejezAnterior = pensionVejez > 0 ? pensionVejez : pensionVejezAnterior;
            ingresoTotalAnterior = pagadoEmpresa + pensionVejez;

            return {
                ...period,
                tope5SMLMV,
                numSmlmv: numSmlmvTotalAnterior,
                porcentajeAjuste,
                mesadaReajustada,
                pensionVejez,
                cargoEmpresa,
                pagadoEmpresa,
                diferenciasInsolutas,
                numMesadas,
                diferenciasAnuales,
                numMesadasOrdinarias,
                indexacionDiferencias,
                diferenciasIndexadas,
                diferenciasOrdinarias,
                descuentoSalud,
            };
        });
    }, [calculationPeriods, causanteRecords, ipcDaneData, payments]);

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
    
    const totalDiferenciasAnuales = useMemo(() => {
        return antijuridicoData.reduce((sum, row) => sum + row.diferenciasAnuales, 0);
    }, [antijuridicoData]);

    const totalIndexacionDiferencias = useMemo(() => {
        return antijuridicoData.reduce((sum, row) => sum + row.indexacionDiferencias, 0);
    }, [antijuridicoData]);

    const renderAntijuridicoTable = (data: any[], title: string) => {
        if (data.length === 0) return null;

        const totalDiferenciasAnuales = data.reduce((sum, row) => sum + row.diferenciasAnuales, 0);
        const totalIndexacion = data.reduce((sum, row) => sum + row.indexacionDiferencias, 0);
        const totalDescuentoSalud = data.reduce((sum, row) => sum + row.descuentoSalud, 0);

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-center text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
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
                                <TableHead className="text-xs">Diferencias Anuales</TableHead>
                                <TableHead className="text-xs">Mesadas Ordinarias</TableHead>
                                <TableHead className="text-xs">Diferencias Ordinarias</TableHead>
                                <TableHead className="text-xs">Descuento Salud 12%</TableHead>
                                <TableHead className="text-xs">Indexación de Diferencias</TableHead>
                                <TableHead className="text-xs">Diferencias Indexadas</TableHead>
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
                                        <TableCell className="text-xs font-bold bg-yellow-100">{formatCurrency(row.diferenciasAnuales)}</TableCell>
                                        <TableCell className="text-xs">{row.numMesadasOrdinarias}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.diferenciasOrdinarias)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.descuentoSalud)}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(row.indexacionDiferencias)}</TableCell>
                                        <TableCell className="text-xs font-bold bg-green-100">{formatCurrency(row.diferenciasIndexadas)}</TableCell>
                                    </TableRow>
                                )
                            })}
                            <TableRow className="font-bold bg-muted text-xs">
                                <TableCell colSpan={10} className="text-right text-xs">TOTALES</TableCell>
                                <TableCell className="text-xs font-bold bg-yellow-100">{formatCurrency(totalDiferenciasAnuales)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                                <TableCell className="text-xs font-bold">{formatCurrency(totalDescuentoSalud)}</TableCell>
                                <TableCell className="text-xs font-bold">{formatCurrency(totalIndexacion)}</TableCell>
                                <TableCell colSpan={1}></TableCell>
                            </TableRow>
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
