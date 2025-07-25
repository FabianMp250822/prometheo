
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, User, Hash, Loader2, UserX } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { parseEmployeeName, formatCurrency, parsePeriodoPago } from '@/lib/helpers';
import type { Payment, PagosHistoricoRecord } from '@/lib/data';
import { collection, doc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const datosConsolidados: { [year: number]: { smlmv: number; ipc: number; reajusteSMLMV: number; } } = {
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

const datosIPC: { [year: number]: number } = {
    1998: 16.70,
    1999: 9.23,
    2000: 8.75,
    2001: 7.65,
    2002: 6.99,
    2003: 6.49,
    2004: 5.50,
    2005: 4.85,
    2006: 4.48,
};

export default function AnexoLey4Page() {
    const { selectedPensioner } = usePensioner();
    const [isLoading, setIsLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);

    useEffect(() => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            return;
        }

        const fetchPayments = async () => {
            setIsLoading(true);
            try {
                const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                const querySnapshot = await getDocs(paymentsQuery);
                const paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
                
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
                console.error("Error fetching payment data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPayments();
    }, [selectedPensioner]);

    const tabla1Data = useMemo(() => {
        if (!selectedPensioner) return [];
        
        const countMesadasInYear = (year: number): number => {
            const paymentsInYear = payments.filter(p => parseInt(p.año, 10) === year);
            if (!paymentsInYear.length) {
                const historicalRecordsForYear = historicalPayments.filter(rec => rec.ANO_RET === year);
                return historicalRecordsForYear.length > 0 ? 14 : 0;
            }
            let count = 0;
            paymentsInYear.forEach(p => {
                p.detalles.forEach(detail => {
                    const code = detail.codigo || '';
                    const name = detail.nombre || '';
                    
                    const isMesada = code === 'MESAD' || name.includes('Mesada Pensional');
                    const isAdicional = code === 'MESAD14' || name.includes('Mesada Adicional 14_Junio') || name.includes('285-Mesada Adicional');

                    if(isMesada && detail.ingresos > 0) {
                        count++;
                    }
                    if(isAdicional && detail.ingresos > 0) {
                        count++;
                    }
                });
            });
            return count;
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
            if (historicalRecord) return parseFloat(historicalRecord.VALOR_ACT!.replace(',', '.'));
            return 0;
        };

        const firstPensionYear = Object.keys(datosConsolidados).map(Number).find(year => getFirstPensionInYear(year) > 0);
        if (!firstPensionYear) return [];

        const relevantYears = Object.keys(datosConsolidados)
            .map(Number)
            .filter(year => year >= firstPensionYear && year <= 2007)
            .sort((a, b) => a - b);
        
        let proyeccionAnterior = 0;

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
            proyeccionAnterior = proyeccionMesada;

            const numSmlmvProyectado = smlmv > 0 ? proyeccionMesada / smlmv : 0;
            const numSmlmvPagado = smlmv > 0 ? mesadaPagada / smlmv : 0;
            const diferencia = proyeccionMesada - mesadaPagada;
            const numMesadas = countMesadasInYear(year);
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

    }, [selectedPensioner, payments, historicalPayments]);
    
    const totalGeneralRetroactivas = useMemo(() => {
        return tabla1Data.reduce((acc, row) => acc + row.totalRetroactivas, 0);
    }, [tabla1Data]);

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
                                        <TableHead>Reajuste en % SMLMV</TableHead>
                                        <TableHead>Proyección de Mesada Fiduprevisora con % SMLMV</TableHead>
                                        <TableHead># de SMLMV (En el Reajuste x SMLMV)</TableHead>
                                        <TableHead>Reajuste en % IPC</TableHead>
                                        <TableHead>Mesada Pagada Fiduprevisora reajuste con IPCs</TableHead>
                                        <TableHead># de SMLMV (En el Reajuste x IPC)</TableHead>
                                        <TableHead>Diferencias de Mesadas</TableHead>
                                        <TableHead># de Mesadas</TableHead>
                                        <TableHead>Total Diferencias Retroactivas</TableHead>
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
                                </TableBody>
                                <TableBody>
                                    <TableRow className="font-bold bg-muted">
                                        <TableCell colSpan={10} className="text-right">TOTAL GENERAL RETROACTIVAS</TableCell>
                                        <TableCell>{formatCurrency(totalGeneralRetroactivas)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No se encontraron datos de pagos para este pensionado en los años relevantes (1999-2007).</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
