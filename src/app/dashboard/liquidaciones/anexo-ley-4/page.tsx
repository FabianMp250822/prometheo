'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, User, Hash, Loader2, UserX, BarChart3 } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { parseEmployeeName, formatCurrency, parsePeriodoPago, formatFirebaseTimestamp } from '@/lib/helpers';
import type { Payment, PagosHistoricoRecord, CausanteRecord } from '@/lib/data';
import { collection, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const datosConsolidados: { [year: number]: { smlmv: number; ipc: number; reajusteSMLMV: number; } } = {
  1999: { smlmv: 236460, ipc: 16.70, reajusteSMLMV: 16.01 },
  2000: { smlmv: 260100, ipc: 9.23, reajusteSMLMV: 10.00 },
  2001: { smlmv: 286000, ipc: 8.75, reajusteSMLMV: 9.96 },
  2002: { smlmv: 309000, ipc: 7.65, reajusteSMLMV: 8.04 },
  2003: { smlmv: 332000, ipc: 6.49, reajusteSMLMV: 7.44 },
  2004: { smlmv: 358000, ipc: 5.50, reajusteSMLMV: 7.83 },
  2005: { smlmv: 381500, ipc: 4.85, reajusteSMLMV: 6.56 },
  2006: { smlmv: 408000, ipc: 4.48, reajusteSMLMV: 6.95 },
  2007: { smlmv: 433700, ipc: 5.69, reajusteSMLMV: 6.30 },
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

export const datosIPC: { [key: number]: number } = {
  1998: 16.70,
  1999: 9.23,
  2000: 8.75,
  2001: 7.65,
  2002: 6.99,
  2003: 6.49,
  2004: 5.50,
  2005: 4.85,
  2006: 4.48,
  2007: 5.69,
  2008: 7.67,
  2009: 2.00,
  2010: 3.17,
  2011: 3.73,
  2012: 2.44,
  2013: 1.94,
  2014: 3.66,
  2015: 6.77,
  2016: 5.75,
  2017: 4.09,
  2018: 3.18,
  2019: 3.80,
  2020: 1.61,
  2021: 5.62,
  2022: 13.12,
  2023: 9.28,
  2024: 5.20
};

export default function AnexoLey4Page() {
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
            if (!causanteSnapshot.empty) {
                const data = causanteSnapshot.docs[0].data();
                if (data && Array.isArray(data.records)) {
                    setCausanteRecords(data.records as CausanteRecord[]);
                }
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
    
    const sharingDateInfo = useMemo(() => {
        if (!causanteRecords || causanteRecords.length === 0) return null;
        const sortedRecords = [...causanteRecords]
            .filter(r => r.fecha_desde)
            .sort((a, b) => formatFirebaseTimestamp(a.fecha_desde!, 't') - formatFirebaseTimestamp(b.fecha_desde!, 't'));

        if (sortedRecords.length === 0) return null;
        
        const sharingDate = new Date(formatFirebaseTimestamp(sortedRecords[0].fecha_desde, 'yyyy-MM-dd'));
        return {
            date: sharingDate,
            year: sharingDate.getFullYear(),
            month: sharingDate.getMonth() + 1
        };
    }, [causanteRecords]);

    const tabla1Data = useMemo(() => {
        if (!selectedPensioner) return [];
        
        const countMesadasInYear = (year: number): number => {
            const paymentsInYear = payments.filter(p => parseInt(p.año, 10) === year);
        
            if (sharingDateInfo && year === sharingDateInfo.year) {
                const paymentsBeforeSharing = paymentsInYear.filter(p => {
                    const paymentDate = parsePeriodoPago(p.periodoPago)?.startDate;
                    return paymentDate && (paymentDate.getMonth() + 1) <= sharingDateInfo.month;
                });
                
                 return paymentsBeforeSharing.reduce((count, p) => {
                    const hasMesada = p.detalles.some(detail =>
                        (detail.codigo === 'MESAD' || detail.nombre?.includes('Mesada Pensional'))
                    );
                     const hasMesada14 = p.detalles.some(detail =>
                        (detail.codigo === 'MESAD14' || detail.nombre?.includes('Mesada Adicional 14_Junio')) ||
                        (detail.nombre === '285-Mesada Adicional')
                    );
                    return count + (hasMesada ? 1 : 0) + (hasMesada14 ? 1 : 0);
                }, 0);
            }
        
            if (paymentsInYear.length > 0) {
                 return paymentsInYear.reduce((count, p) => {
                     const hasMesada = p.detalles.some(detail =>
                        (detail.codigo === 'MESAD' || detail.nombre?.includes('Mesada Pensional'))
                    );
                     const hasMesada14 = p.detalles.some(detail =>
                        (detail.codigo === 'MESAD14' || detail.nombre?.includes('Mesada Adicional 14_Junio')) ||
                        (detail.nombre === '285-Mesada Adicional')
                    );
                    return count + (hasMesada ? 1 : 0) + (hasMesada14 ? 1 : 0);
                }, 0);
            }
            
            const historicalRecordsForYear = historicalPayments.filter(rec => rec.ANO_RET === year);
            if (historicalRecordsForYear.length > 0) return 14; 
            
            return 0;
        };
        
        const getFirstPensionInYear = (year: number): number => {
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
        };

        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return [];

        const endYear = sharingDateInfo ? sharingDateInfo.year : new Date().getFullYear();

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

    }, [selectedPensioner, payments, historicalPayments, sharingDateInfo]);

    const totalGeneralRetroactivas = useMemo(() => {
        return tabla1Data.reduce((acc, row) => acc + row.totalRetroactivas, 0);
    }, [tabla1Data]);
    
    const sharingData = useMemo(() => {
        if (!causanteRecords || causanteRecords.length === 0 || !sharingDateInfo || tabla1Data.length === 0) return null;
        
        const lastRowTabla1 = tabla1Data[tabla1Data.length - 1];
        if (!lastRowTabla1) return null;

        const initialSharingRecord = [...causanteRecords]
            .filter(r => r.fecha_desde)
            .sort((a,b) => formatFirebaseTimestamp(a.fecha_desde!, 't') - formatFirebaseTimestamp(b.fecha_desde!, 't'))[0];

        if (!initialSharingRecord) return null;

        const mesadaColpensiones = initialSharingRecord.valor_iss || 0;
        const mayorValorEmpresa = initialSharingRecord.valor_empresa || 0;
        
        const mesadaPlena = lastRowTabla1.proyeccionMesada;
        
        const porcentajeColpensiones = mesadaPlena > 0 ? (mesadaColpensiones / mesadaPlena) * 100 : 0;
        const porcentajeEmpresa = mesadaPlena > 0 ? (mayorValorEmpresa / mesadaPlena) * 100 : 0;

        const sharingDate = initialSharingRecord.fecha_desde
            ? formatFirebaseTimestamp(initialSharingRecord.fecha_desde, 'dd/MM/yyyy')
            : 'N/A';
            
        const totalSmlmvPlena = lastRowTabla1.numSmlmvMesadaPlena;
        const smlmvEmpresa = totalSmlmvPlena * (porcentajeEmpresa / 100);
        const smlmvColpensiones = totalSmlmvPlena * (porcentajeColpensiones / 100);

        return {
            mesadaPlena,
            mesadaColpensiones,
            mayorValorEmpresa,
            porcentajeColpensiones,
            porcentajeEmpresa,
            sharingDate,
            mesadaAntes: lastRowTabla1.proyeccionMesada,
            smlmvEmpresa,
            smlmvColpensiones,
        };
    }, [causanteRecords, tabla1Data, sharingDateInfo]);

    const tabla3Data = useMemo(() => {
        if (!sharingData || !sharingDateInfo) return [];

        const startYear = sharingDateInfo.year;
        const endYear = new Date().getFullYear();
        const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
        
        let proyeccionAnterior = sharingData.mesadaPlena;
        
        return years.map((year, index) => {
            const smlmv = datosConsolidados[year as keyof typeof datosConsolidados]?.smlmv || 0;
            const reajusteSMLMV = datosConsolidados[year as keyof typeof datosConsolidados]?.reajusteSMLMV || 0;
            const reajusteIPC = datosIPC[year - 1 as keyof typeof datosIPC] || 0;

            let proyeccionMesada = 0;
            if (index === 0) {
                proyeccionMesada = proyeccionAnterior;
            } else {
                const reajusteMayor = Math.max(reajusteSMLMV, reajusteIPC);
                proyeccionMesada = proyeccionAnterior * (1 + reajusteMayor / 100);
            }
            proyeccionAnterior = proyeccionMesada;

            const causanteRecordForYear = causanteRecords.find(r => r.fecha_desde && new Date(formatFirebaseTimestamp(r.fecha_desde, 'yyyy-MM-dd')).getFullYear() === year);
            const mesadaPagada = (causanteRecordForYear?.valor_empresa || 0) + (causanteRecordForYear?.valor_iss || 0);

            const numSmlmvProyectado = smlmv > 0 ? proyeccionMesada / smlmv : 0;
            const numSmlmvPagado = smlmv > 0 ? mesadaPagada / smlmv : 0;
            const diferencia = proyeccionMesada > 0 ? proyeccionMesada - mesadaPagada : 0;
            const numMesadas = year === sharingDateInfo.year ? (14 - sharingDateInfo.month) : 14;
            const totalRetroactivas = diferencia > 0 ? diferencia * numMesadas : 0;

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
            };
        });

    }, [sharingData, sharingDateInfo, causanteRecords]);

    const totalGeneralRetroactivasTabla3 = useMemo(() => {
        return tabla3Data.reduce((acc, row) => acc + row.totalRetroactivas, 0);
    }, [tabla3Data]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Anexo Ley 4
                    </CardTitle>
                    <CardDescription>
                        Proyección comparativa de la mesada pensional con incrementos de SMLMV e IPC.
                    </CardDescription>
                </CardHeader>
            </Card>

            {selectedPensioner && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                           Información del Pensionado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Cédula</p>
                                <p className="font-medium">{selectedPensioner.documento}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Nombre</p>
                                <p className="font-medium">{parseEmployeeName(selectedPensioner.empleado)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!selectedPensioner && !isLoading && (
                 <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed rounded-lg">
                    <UserX className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No hay un pensionado seleccionado</h3>
                    <p className="text-muted-foreground">Por favor, use el buscador global para seleccionar un pensionado y ver sus datos.</p>
                </div>
            )}
            
            {selectedPensioner && (
                <>
                 <Card>
                    <CardHeader>
                        <CardTitle>1. Reajuste de Mesada a Cargo de la Empresa (Antes de Compartir)</CardTitle>
                    </CardHeader>
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
                                        <TableHead>Proyección de Mesada Fiduprevisora con % SMLMV</TableHead>
                                        <TableHead># de SMLMV (En el Reajuste x SMLMV)</TableHead>
                                        <TableHead>% Reajuste IPC</TableHead>
                                        <TableHead>Mesada Pagada Fiduprevisora reajuste con IPCs</TableHead>
                                        <TableHead># de SMLMV (En el Reajuste x IPC)</TableHead>
                                        <TableHead>Diferencias de Mesadas</TableHead>
                                        <TableHead># de Mesadas</TableHead>
                                        <TableHead>Total Diferencias Retroactivas</TableHead>
                                        <TableHead># de SMLMV (Mesada Plena)</TableHead>
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
                                           <TableCell>{row.numSmlmvMesadaPlena.toFixed(2)}</TableCell>
                                       </TableRow>
                                   ))}
                                </TableBody>
                                <TableBody>
                                    <TableRow className="font-bold bg-muted">
                                        <TableCell colSpan={10}>TOTAL GENERAL RETROACTIVAS</TableCell>
                                        <TableCell className="text-right">{formatCurrency(totalGeneralRetroactivas)}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No se encontraron datos de pagos para este pensionado en los años relevantes.</p>
                        )}
                    </CardContent>
                </Card>

                {sharingData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl font-headline flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                2. Compartición de la Mesada Reajustada
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableBody>
                                     <TableRow className="hidden">
                                        <TableCell className="font-semibold bg-muted/30">MESADA PLENA DE LA PENSION CONVENCIONAL ANTES DE LA COMPARTICION</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(sharingData.mesadaAntes)}</TableCell>
                                        <TableCell className="text-right font-bold"></TableCell>
                                    </TableRow>
                                    <TableRow className="bg-muted/30">
                                        <TableCell className="font-semibold">MESADA PLENA DE LA PENSION CONVENCIONAL</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(sharingData.mesadaPlena)}</TableCell>
                                        <TableCell className="text-right font-bold">100.00%</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-green-500/10">
                                        <TableCell colSpan={3} className="text-center font-semibold text-green-800">CUOTAS PARTES EN QUE SE DISTRIBUYE EL MONTO DE MESADA PENSIONAL A PARTIR DE LA COMPARTICION</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell>MESADA RECONOCIDA POR COLPENSIONES</TableCell>
                                        <TableCell className="text-right">{formatCurrency(sharingData.mesadaColpensiones)}</TableCell>
                                        <TableCell className="text-right">{sharingData.porcentajeColpensiones.toFixed(2)}%</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell>MAYOR VALOR A CARGO DE LA EMPRESA</TableCell>
                                        <TableCell className="text-right">{formatCurrency(sharingData.mayorValorEmpresa)}</TableCell>
                                        <TableCell className="text-right">{sharingData.porcentajeEmpresa.toFixed(2)}%</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                             <div className="mt-4 text-center text-sm text-muted-foreground space-y-1 md:space-y-0 md:flex md:justify-center md:gap-6">
                                <p><span className="font-semibold">Fecha de Compartición:</span> {sharingData.sharingDate}</p>
                                <p><span className="font-semibold"># de SMLMV empresa:</span> {sharingData.smlmvEmpresa.toFixed(4)}</p>
                                <p><span className="font-semibold"># de SMLMV colpensiones:</span> {sharingData.smlmvColpensiones.toFixed(4)}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                 {tabla3Data.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>3. PROYECCIÓN COMPARATIVA CONTINUADA DESDE {sharingDateInfo?.year} EN ADELANTE</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Año</TableHead>
                                            <TableHead>SMLMV</TableHead>
                                            <TableHead>% Reajuste SMLMV</TableHead>
                                            <TableHead>Proyección de Mesada Fiduprevisora con % SMLMV</TableHead>
                                            <TableHead># de SMLMV (En el Reajuste x SMLMV)</TableHead>
                                            <TableHead>% Reajuste IPC</TableHead>
                                            <TableHead>Mesada Pagada Fiduprevisora reajuste con IPCs</TableHead>
                                            <TableHead># de SMLMV (En el Reajuste x IPC)</TableHead>
                                            <TableHead>Diferencias de Mesadas</TableHead>
                                            <TableHead># de Mesadas</TableHead>
                                            <TableHead>Total Diferencias Retroactivas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {tabla3Data.map(row => (
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
                                    </TableBody>
                                    <TableBody>
                                        <TableRow className="font-bold bg-muted">
                                            <TableCell colSpan={10} className="text-right">TOTAL GENERAL RETROACTIVAS (POST-COMPARTICIÓN)</TableCell>
                                            <TableCell className="text-right">{formatCurrency(totalGeneralRetroactivasTabla3)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                 )}
                </>
            )}
        </div>
    );
}
