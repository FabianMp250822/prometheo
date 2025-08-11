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

// Datos consolidados con SMLMV, reajuste SMLMV e IPC
const datosConsolidados: Record<number, { smlmv: number; reajusteSMLMV: number; ipc: number }> = {
    1982: { smlmv: 7410, reajusteSMLMV: 30.00, ipc: 26.36 },
    1983: { smlmv: 9261, reajusteSMLMV: 24.98, ipc: 24.03 },
    1984: { smlmv: 11298, reajusteSMLMV: 22.00, ipc: 16.64 },
    1985: { smlmv: 13558, reajusteSMLMV: 20.00, ipc: 18.28 },
    1986: { smlmv: 16811, reajusteSMLMV: 23.99, ipc: 22.45 },
    1987: { smlmv: 20510, reajusteSMLMV: 22.00, ipc: 20.95 },
    1988: { smlmv: 25637, reajusteSMLMV: 25.00, ipc: 24.02 },
    1989: { smlmv: 32556, reajusteSMLMV: 26.99, ipc: 28.12 },
    1990: { smlmv: 41025, reajusteSMLMV: 26.01, ipc: 26.12 },
    1991: { smlmv: 51720, reajusteSMLMV: 26.07, ipc: 32.36 },
    1992: { smlmv: 65190, reajusteSMLMV: 26.04, ipc: 26.82 },
    1993: { smlmv: 81510, reajusteSMLMV: 25.03, ipc: 25.13 },
    1994: { smlmv: 98700, reajusteSMLMV: 21.09, ipc: 22.60 },
    1995: { smlmv: 118934, reajusteSMLMV: 20.50, ipc: 19.47 },
    1996: { smlmv: 142125, reajusteSMLMV: 19.50, ipc: 19.47 },
    1997: { smlmv: 172005, reajusteSMLMV: 21.02, ipc: 21.64 },
    1998: { smlmv: 203825, reajusteSMLMV: 18.50, ipc: 17.68 },
    1999: { smlmv: 236460, reajusteSMLMV: 16.01, ipc: 16.70 },
    2000: { smlmv: 260100, reajusteSMLMV: 10.00, ipc: 9.23 },
    2001: { smlmv: 286000, reajusteSMLMV: 9.96, ipc: 8.75 },
    2002: { smlmv: 309000, reajusteSMLMV: 8.04, ipc: 7.65 },
    2003: { smlmv: 332000, reajusteSMLMV: 7.44, ipc: 6.99 },
    2004: { smlmv: 358000, reajusteSMLMV: 7.83, ipc: 6.49 },
    2005: { smlmv: 381500, reajusteSMLMV: 6.56, ipc: 5.50 },
    2006: { smlmv: 408000, reajusteSMLMV: 6.95, ipc: 4.85 },
    2007: { smlmv: 433700, reajusteSMLMV: 6.30, ipc: 4.48 },
    2008: { smlmv: 461500, reajusteSMLMV: 6.41, ipc: 5.69 },
    2009: { smlmv: 496900, reajusteSMLMV: 7.67, ipc: 7.67 },
    2010: { smlmv: 515000, reajusteSMLMV: 3.64, ipc: 2.00 },
    2011: { smlmv: 535600, reajusteSMLMV: 4.00, ipc: 3.17 },
    2012: { smlmv: 566000, reajusteSMLMV: 5.81, ipc: 3.73 },
    2013: { smlmv: 589500, reajusteSMLMV: 4.02, ipc: 2.44 },
    2014: { smlmv: 616000, reajusteSMLMV: 4.50, ipc: 1.94 },
    2015: { smlmv: 644350, reajusteSMLMV: 4.60, ipc: 3.66 },
    2016: { smlmv: 689455, reajusteSMLMV: 7.00, ipc: 6.77 },
    2017: { smlmv: 737717, reajusteSMLMV: 7.00, ipc: 5.75 },
    2018: { smlmv: 781242, reajusteSMLMV: 5.90, ipc: 4.09 },
    2019: { smlmv: 828116, reajusteSMLMV: 6.00, ipc: 3.18 },
    2020: { smlmv: 877803, reajusteSMLMV: 6.00, ipc: 3.80 },
    2021: { smlmv: 908526, reajusteSMLMV: 3.50, ipc: 1.61 },
    2022: { smlmv: 1000000, reajusteSMLMV: 10.07, ipc: 5.62 },
    2023: { smlmv: 1160000, reajusteSMLMV: 16.00, ipc: 13.12 },
    2024: { smlmv: 1300000, reajusteSMLMV: 12.00, ipc: 9.28 },
    2025: { smlmv: 1423500, reajusteSMLMV: 9.50, ipc: 5.20 }
};

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
    pensionVejez?: number;
    valorEmpresa?: number;
}

export default function EvolucionMesadaPage() {
    const { selectedPensioner } = usePensioner();
    const [isLoading, setIsLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);
    const [causanteRecords, setCausanteRecords] = useState<CausanteRecord[]>([]);

    const fetchAllData = useCallback(async () => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            setCausanteRecords([]);
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
            if (!causanteSnapshot.empty && causanteSnapshot.docs[0].data()?.records) {
                setCausanteRecords(causanteSnapshot.docs[0].data().records as CausanteRecord[]);
            } else {
                setCausanteRecords([]);
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
            // Agrupar pagos por mes
            const paymentsByMonth = new Map<string, Payment[]>();
            
            paymentsInYear.forEach(payment => {
                const paymentDate = parsePeriodoPago(payment.periodoPago)?.startDate;
                if (paymentDate) {
                    const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
                    if (!paymentsByMonth.has(monthKey)) {
                        paymentsByMonth.set(monthKey, []);
                    }
                    paymentsByMonth.get(monthKey)!.push(payment);
                }
            });

            // Si no hay pagos agrupados válidos, retornar 0
            if (paymentsByMonth.size === 0) return 0;

            // Ordenar los meses
            const sortedMonths = Array.from(paymentsByMonth.keys()).sort();
            
            // Detectar si es pensionado quincenal (Bolívar)
            const esQuincenal = Array.from(paymentsByMonth.values()).some(payments => payments.length > 1);
            
            if (esQuincenal) {
                // Para pagos quincenales, buscar el primer mes con dos quincenas completas
                // Revisar los primeros 3 meses para encontrar un mes completo
                const monthsToCheck = sortedMonths.slice(0, Math.min(3, sortedMonths.length));
                
                for (const monthKey of monthsToCheck) {
                    const monthPayments = paymentsByMonth.get(monthKey) || [];
                    
                    // Si encontramos un mes con 2 pagos (dos quincenas), usar ese
                    if (monthPayments.length >= 2) {
                        const totalMesada = monthPayments.reduce((total, payment) => {
                            const mesadaDetail = payment.detalles.find(d => 
                                d.nombre?.includes('Mesada Pensional') || 
                                d.codigo === 'MESAD' || 
                                d.codigo === 'MESADA'
                            );
                            return total + (mesadaDetail?.ingresos || 0);
                        }, 0);
                        
                        if (totalMesada > 0) {
                            return totalMesada;
                        }
                    }
                }
                
                // Si no encontramos un mes con dos quincenas en los primeros 3 meses,
                // buscar en todos los meses del año
                for (const monthKey of sortedMonths) {
                    const monthPayments = paymentsByMonth.get(monthKey) || [];
                    
                    if (monthPayments.length >= 2) {
                        const totalMesada = monthPayments.reduce((total, payment) => {
                            const mesadaDetail = payment.detalles.find(d => 
                                d.nombre?.includes('Mesada Pensional') || 
                                d.codigo === 'MESAD' || 
                                d.codigo === 'MESADA'
                            );
                            return total + (mesadaDetail?.ingresos || 0);
                        }, 0);
                        
                        if (totalMesada > 0) {
                            return totalMesada;
                        }
                    }
                }
                
                // Si no hay ningún mes con dos quincenas, duplicar la primera quincena encontrada
                const firstMonthPayments = paymentsByMonth.get(sortedMonths[0]) || [];
                if (firstMonthPayments.length === 1) {
                    const mesadaDetail = firstMonthPayments[0].detalles.find(d => 
                        d.nombre?.includes('Mesada Pensional') || 
                        d.codigo === 'MESAD' || 
                        d.codigo === 'MESADA'
                    );
                    // Duplicar el valor de la quincena para estimar la mesada completa
                    return (mesadaDetail?.ingresos || 0) * 2;
                }
            } else {
                // Para pagos mensuales, usar el primer mes disponible
                const firstMonthPayments = paymentsByMonth.get(sortedMonths[0]) || [];
                
                return firstMonthPayments.reduce((totalMesada, payment) => {
                    const mesadaDetail = payment.detalles.find(d => 
                        d.nombre?.includes('Mesada Pensional') || 
                        d.codigo === 'MESAD' || 
                        d.codigo === 'MESADA'
                    );
                    return totalMesada + (mesadaDetail?.ingresos || 0);
                }, 0);
            }
        }

        // Si no hay pagos, buscar en históricos
        const historicalRecord = historicalPayments.find(p => p.ANO_RET === year && p.VALOR_ANT);
        if (historicalRecord && historicalRecord.VALOR_ANT) {
            const valorAnt = parseFloat(historicalRecord.VALOR_ANT!.replace(/,/g, ''));
            if (!isNaN(valorAnt)) return valorAnt;
        }
        
        // Buscar en registros de causante
        const causanteRecordForYear = causanteRecords.find(rec => 
            rec.fecha_desde && 
            new Date(formatFirebaseTimestamp(rec.fecha_desde, 'yyyy-MM-dd')).getFullYear() === year
        );
        if(causanteRecordForYear?.valor_empresa) {
            return causanteRecordForYear.valor_empresa;
        }

        return 0;
    }, [payments, historicalPayments, causanteRecords]);

    // Función helper para detectar si es pensionado de Bolívar (pagos quincenales)
    const isBolivarPensioner = useCallback(() => {
        // Verificar si el empleado contiene "BOLIVAR" o si hay múltiples pagos en un mes
        if (selectedPensioner?.empleado?.toUpperCase().includes('BOLIVAR')) {
            return true;
        }
        
        // Verificar si hay múltiples pagos en el mismo mes (indicativo de pagos quincenales)
        const paymentsByMonth = new Map<string, number>();
        payments.forEach(payment => {
            const paymentDate = parsePeriodoPago(payment.periodoPago)?.startDate;
            if (paymentDate) {
                const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
                paymentsByMonth.set(monthKey, (paymentsByMonth.get(monthKey) || 0) + 1);
            }
        });
        
        // Si hay algún mes con más de un pago, es quincenal
        return Array.from(paymentsByMonth.values()).some(count => count > 1);
    }, [selectedPensioner, payments]);

    const summaryData = useMemo(() => {
        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return null;
        
        const firstPension = getFirstPensionInYear(firstPensionYear);
        const esQuincenal = isBolivarPensioner();
        
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
            salarioPromedio: firstPension,
            porcentajeReemplazo: 100,
            mesadaPensional: firstPension,
            fechaPrimeraMesada: firstMesadaDate,
            tiposPago: esQuincenal ? 'Quincenal (Bolívar)' : 'Mensual'
        };

    }, [getFirstPensionInYear, payments, historicalPayments, isBolivarPensioner]);
    
    const sharingDateInfo = useMemo(() => {
        if (!causanteRecords || causanteRecords.length === 0) return null;
        
        // Buscar el registro más antiguo (primera compartición)
        const sortedRecords = [...causanteRecords].sort((a, b) => {
            const dateA = a.fecha_desde ? new Date(formatFirebaseTimestamp(a.fecha_desde, 'yyyy-MM-dd')).getTime() : Infinity;
            const dateB = b.fecha_desde ? new Date(formatFirebaseTimestamp(b.fecha_desde, 'yyyy-MM-dd')).getTime() : Infinity;
            return dateA - dateB;
        });
        
        const oldestRecord = sortedRecords[0];
        if (!oldestRecord || !oldestRecord.fecha_desde) return null;
        
        const sharingDate = new Date(formatFirebaseTimestamp(oldestRecord.fecha_desde, 'yyyy-MM-dd'));
        return {
            date: sharingDate,
            year: sharingDate.getFullYear(),
            month: sharingDate.getMonth() + 1,
            valorEmpresa: oldestRecord.valor_empresa || 0,
            valorISS: oldestRecord.valor_iss || 0
        };
    }, [causanteRecords]);

    const { tablaAntes, tablaDespues } = useMemo(() => {
        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear || !summaryData) return { tablaAntes: [], tablaDespues: [] };

        const endYear = 2024; // Límite hasta 2024 según la fórmula del Excel
        const years = Object.keys(datosConsolidados)
            .map(Number)
            .filter(year => year >= firstPensionYear && year <= endYear)
            .sort((a, b) => a - b);

        let proyeccionSMLMVAnterior = 0;
        let proyeccionIPCAnterior = 0;
        let mesadaPlenaComparticion = 0;

        const allData = years.map((year, index) => {
            const smlmv = datosConsolidados[year]?.smlmv || 0;
            const reajusteSMLMV = datosConsolidados[year]?.reajusteSMLMV || 0;
            const reajusteIPC = datosConsolidados[year]?.ipc || 0;

            let proyeccionMesadaSMLMV = 0;
            let proyeccionMesadaIPC = 0;
            let mesadaPagada = 0;
            
            if (index === 0) {
                // Primera fila: toma la mesada inicial
                proyeccionMesadaSMLMV = summaryData.mesadaPensional;
                proyeccionMesadaIPC = summaryData.mesadaPensional;
                mesadaPagada = summaryData.mesadaPensional;
            } else {
                // Fórmula del Excel: SI(D14>G14;E13*(1+(D14/100));E13*(1+(G14/100)))
                // D14 = reajusteSMLMV del año actual
                // G14 = reajusteIPC del año actual
                // E13 = proyeccionMesadaSMLMV del año anterior
                const reajusteMayor = Math.max(reajusteSMLMV, reajusteIPC);
                proyeccionMesadaSMLMV = proyeccionSMLMVAnterior * (1 + reajusteMayor / 100);
                
                // Para proyección IPC: H13*(1+(G14/100))
                proyeccionMesadaIPC = proyeccionIPCAnterior * (1 + reajusteIPC / 100);
                
                // Mesada pagada sigue la proyección IPC
                mesadaPagada = proyeccionIPCAnterior * (1 + reajusteIPC / 100);
            }
            
            proyeccionSMLMVAnterior = proyeccionMesadaSMLMV;
            proyeccionIPCAnterior = proyeccionMesadaIPC;

            // Cálculo de número de SMLMV
            const numSmlmvSMLMV = smlmv > 0 ? proyeccionMesadaSMLMV / smlmv : 0;
            const numSmlmvIPC = smlmv > 0 ? proyeccionMesadaIPC / smlmv : 0;
            
            // Pérdida porcentual: 100-(H14*100/E14)
            const perdidaPorcentual = proyeccionMesadaSMLMV > 0 ? (100 - (proyeccionMesadaIPC * 100 / proyeccionMesadaSMLMV)) : 0;
            
            // Pérdida en SMLMV: F14-(H14/C14)
            const perdidaSmlmv = numSmlmvSMLMV - numSmlmvIPC;
            
            // Diferencia de mesadas: E14-H14
            const diferenciaMesadas = proyeccionMesadaSMLMV - proyeccionMesadaIPC;
            
            let numMesadas = 14; 
            if(sharingDateInfo && year === sharingDateInfo.year) {
                // Si es el año de compartición, calcular meses antes de compartir
                numMesadas = sharingDateInfo.month - 1;
                mesadaPlenaComparticion = proyeccionMesadaSMLMV;
            }

            // Total diferencias retroactivas: N14*M14
            const totalDiferenciasRetroactivas = diferenciaMesadas * numMesadas;
            
            let pensionVejez = 0;
            let valorEmpresa = 0;
            if(sharingDateInfo && year >= sharingDateInfo.year){
                // Buscar el registro de causante para este año
                const causanteRecord = causanteRecords.find(r => {
                    if (!r.fecha_desde) return false;
                    const recordYear = new Date(formatFirebaseTimestamp(r.fecha_desde, 'yyyy-MM-dd')).getFullYear();
                    return recordYear === year;
                });
                
                if (causanteRecord) {
                    pensionVejez = causanteRecord.valor_iss || 0;
                    valorEmpresa = causanteRecord.valor_empresa || 0;
                } else if (year === sharingDateInfo.year) {
                    // Si es el año de compartición, usar los valores del registro más antiguo
                    pensionVejez = sharingDateInfo.valorISS;
                    valorEmpresa = sharingDateInfo.valorEmpresa;
                }
            }

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
                pensionVejez,
                valorEmpresa
            };
        });
        
        const tablaAntes = sharingDateInfo ? allData.filter(d => d.año < sharingDateInfo.year) : allData;
        const tablaDespues = sharingDateInfo ? allData.filter(d => d.año >= sharingDateInfo.year) : [];
        
        // Ajustar para el período post-compartición si aplica
        if (sharingDateInfo && tablaDespues.length > 0) {
            // Para el período después de compartir, usar los valores reales de empresa/ISS
            tablaDespues.forEach((row, index) => {
                if (row.valorEmpresa && row.valorEmpresa > 0) {
                    // Si tenemos valor_empresa real, usar ese valor
                    row.diferenciaMesadas = Math.max(0, row.proyeccionMesadaSMLMV - row.valorEmpresa);
                    row.mesadaPagada = row.valorEmpresa;
                } else if (index === 0 && sharingDateInfo.valorEmpresa > 0) {
                    // Para el primer año de compartición, usar los valores iniciales
                    const porcentajeEmpresa = sharingDateInfo.valorEmpresa / (sharingDateInfo.valorEmpresa + sharingDateInfo.valorISS);
                    const mesadaProyectadaEmpresa = row.proyeccionMesadaSMLMV * porcentajeEmpresa;
                    row.diferenciaMesadas = Math.max(0, mesadaProyectadaEmpresa - sharingDateInfo.valorEmpresa);
                    row.mesadaPagada = sharingDateInfo.valorEmpresa;
                } else {
                    // Si no hay datos, mantener el cálculo proporcional
                    const porcentajeEmpresa = sharingDateInfo.valorEmpresa / (sharingDateInfo.valorEmpresa + sharingDateInfo.valorISS);
                    const mesadaProyectadaEmpresa = row.proyeccionMesadaSMLMV * porcentajeEmpresa;
                    row.diferenciaMesadas = Math.max(0, mesadaProyectadaEmpresa - row.mesadaPagada);
                }
                
                // Recalcular el total retroactivo
                row.totalDiferenciasRetroactivas = row.diferenciaMesadas * (row.año === sharingDateInfo.year ? 14 - sharingDateInfo.month + 1 : 14);
            });
        }

        return { tablaAntes, tablaDespues };
    }, [getFirstPensionInYear, summaryData, sharingDateInfo, causanteRecords]);
    
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
                            <TableHead>Proyección de Mesada (SMLMV)</TableHead>
                            <TableHead># de SMLMV</TableHead>
                            <TableHead>Reajuste en % IPC</TableHead>
                            <TableHead>Proyección Mesada (IPC)</TableHead>
                            <TableHead># de SMLMV (IPC)</TableHead>
                            <TableHead>Pérdida %</TableHead>
                            <TableHead>Pérdida SMLMV</TableHead>
                            <TableHead>Mesada Pagada</TableHead>
                            <TableHead>Diferencias</TableHead>
                            <TableHead># Mesadas</TableHead>
                            <TableHead>Total Retroactivas</TableHead>
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
                                <TableCell className="font-bold">{formatCurrency(row.totalDiferenciasRetroactivas)}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-bold bg-muted">
                            <TableCell colSpan={13} className="text-right">TOTAL GENERAL RETROACTIVAS</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(data.reduce((sum, row) => sum + row.totalDiferenciasRetroactivas, 0))}</TableCell>
                        </TableRow>
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
                         {selectedPensioner && <span className="block mt-1 font-semibold text-primary">{parseEmployeeName(selectedPensioner.empleado)}</span>}
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
                                            <TableCell className="font-semibold">Mesada Pensional</TableCell>
                                            <TableCell className="text-right">{formatCurrency(summaryData.mesadaPensional)}</TableCell>
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="font-semibold">Fecha Primera Mesada</TableCell>
                                            <TableCell className="text-right">{summaryData.fechaPrimeraMesada}</TableCell>
                                        </TableRow>
                                        {summaryData.tiposPago && (
                                            <TableRow>
                                                <TableCell className="font-semibold">Tipo de Pago</TableCell>
                                                <TableCell className="text-right">{summaryData.tiposPago}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                   {renderTable(tablaAntes, "Liquidación Antes de Compartir")}
                   {tablaDespues.length > 0 && renderTable(tablaDespues, "Liquidación Después de Compartir")}
                </div>
            )}
        </div>
    );
}