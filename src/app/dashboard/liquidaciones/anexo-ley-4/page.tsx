'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, User, Hash, Loader2, UserX } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { parseEmployeeName, formatCurrency } from '@/lib/helpers';
import type { Payment, PagosHistoricoRecord } from '@/lib/data';
import { collection, doc, getDocs, getDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- Static Data ---
const datosConsolidados: { [year: number]: { smlmv: number; ipc: number; reajusteSMLMV: number } } = {
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
  1998: 16.70, 1999: 9.23, 2000: 8.75, 2001: 7.65, 2002: 6.99,
  2003: 6.49, 2004: 5.50, 2005: 4.85, 2006: 4.48, 2007: 5.69,
};

// --- Component ---
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
                // Fetch recent payments
                const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                const querySnapshot = await getDocs(paymentsQuery);
                const paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
                
                const uniquePayments = paymentsData.filter((payment, index, self) =>
                    index === self.findIndex((p) => p.periodoPago === payment.periodoPago)
                );
                setPayments(uniquePayments);

                // Fetch historical payments
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

        const allYearsWithPayments = new Set([
            ...payments.map(p => parseInt(p.año, 10)),
            ...historicalPayments.map(p => p.ANO_RET ?? 0)
        ].filter(year => year > 0));
        
        if (allYearsWithPayments.size === 0) return [];
        
        const firstPaymentYear = Math.min(...Array.from(allYearsWithPayments));
        const relevantYears = Object.keys(datosConsolidados)
            .map(Number)
            .filter(year => year >= firstPaymentYear && year <= 2007)
            .sort((a, b) => a - b);
        
        return relevantYears.map(year => {
            const smlmvData = datosConsolidados[year];
            const ipcAnterior = datosIPC[year - 1] || 0;
            
            // Find first payment of the year
            let mesadaPagada = 0;
            const paymentsForYear = payments.filter(p => parseInt(p.año, 10) === year);
            if (paymentsForYear.length > 0) {
                 const firstPayment = paymentsForYear.sort((a,b) => a.periodoPago.localeCompare(b.periodoPago))[0];
                 const mesadaDetail = firstPayment.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
                 if(mesadaDetail) mesadaPagada = mesadaDetail.ingresos;
            } else {
                const historicalRecord = historicalPayments.find(rec => rec.ANO_RET === year && rec.VALOR_ACT);
                if (historicalRecord) {
                    mesadaPagada = parseFloat(historicalRecord.VALOR_ACT!.replace(',', '.'));
                }
            }

            return {
                año: year,
                smlmv: smlmvData.smlmv,
                reajusteSMLMV: smlmvData.reajusteSMLMV,
                reajusteIPC: ipcAnterior,
                mesadaPagada: mesadaPagada
            };
        });

    }, [selectedPensioner, payments, historicalPayments]);

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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Año</TableHead>
                                        <TableHead>SMLMV</TableHead>
                                        <TableHead>Reajuste en % SMLMV</TableHead>
                                        <TableHead>Proyección Mesada</TableHead>
                                        <TableHead># de SMLMV (SMLMV)</TableHead>
                                        <TableHead>Reajuste en % IPC</TableHead>
                                        <TableHead>Mesada Pagada (IPC)</TableHead>
                                        <TableHead># de SMLMV (IPC)</TableHead>
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
                                           <TableCell>{row.reajusteSMLMV}%</TableCell>
                                           <TableCell>{formatCurrency(0)}</TableCell>
                                           <TableCell>0.00</TableCell>
                                           <TableCell>{row.reajusteIPC}%</TableCell>
                                           <TableCell>{formatCurrency(row.mesadaPagada)}</TableCell>
                                           <TableCell>0.00</TableCell>
                                           <TableCell>{formatCurrency(0)}</TableCell>
                                           <TableCell>0</TableCell>
                                           <TableCell>{formatCurrency(0)}</TableCell>
                                       </TableRow>
                                   ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No se encontraron datos de pagos para este pensionado en los años relevantes.</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
