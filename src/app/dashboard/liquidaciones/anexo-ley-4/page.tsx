'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, User, Hash, Loader2, UserX } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { parseEmployeeName, formatCurrency } from '@/lib/helpers';
import type { Payment, PagosHistoricoRecord } from '@/lib/data';
import { collection, doc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- Static Data ---
const smlmvData: { [year: number]: number } = {
    1999: 236460, 2000: 260100, 2001: 286000, 2002: 309000, 2003: 332000, 
    2004: 358000, 2005: 381500, 2006: 408000, 2007: 433700
};

const reajusteSMLMVData: { [year: number]: number } = {
    1999: 16.01, 2000: 10.00, 2001: 9.96, 2002: 8.04, 2003: 7.44,
    2004: 7.83, 2005: 6.56, 2006: 6.95, 2007: 6.30
};

const ipcData: { [year: number]: number } = {
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

        const getFirstPension = (year: number): number => {
            const recentPayment = payments.find(p => parseInt(p.año, 10) === year);
            if (recentPayment) {
                const mesada = recentPayment.detalles.find(d => d.nombre?.includes('Mesada Pensional') || d.codigo === 'MESAD');
                if (mesada && mesada.ingresos > 0) return mesada.ingresos;
            }
            const historicalRecord = historicalPayments.find(p => p.ANO_RET === year && p.VALOR_ACT);
            if (historicalRecord) return parseFloat(historicalRecord.VALOR_ACT!.replace(',', '.'));
            return 0;
        };
        
        const countPaymentsInYear = (year: number): number => {
            return payments.filter(p => parseInt(p.año, 10) === year).length;
        };

        let firstPensionYear = 0;
        for(let year = 1999; year <= 2007; year++){
            if(getFirstPension(year) > 0) {
                firstPensionYear = year;
                break;
            }
        }
        
        if (!firstPensionYear) return [];
        
        const relevantYears = Object.keys(smlmvData)
            .map(Number)
            .filter(year => year >= firstPensionYear && year <= 2007)
            .sort((a, b) => a - b);
        
        let proyeccionAnterior = 0;

        return relevantYears.map((year, index) => {
            const smlmv = smlmvData[year] || 0;
            const reajusteSMLMV = reajusteSMLMVData[year] || 0;
            const ipcAnterior = ipcData[year - 1] || 0;
            const mesadaPagada = getFirstPension(year);

            let proyeccionMesada = 0;
            if (index === 0) {
                proyeccionMesada = mesadaPagada;
            } else {
                const reajusteMayor = Math.max(reajusteSMLMV, ipcAnterior);
                proyeccionMesada = proyeccionAnterior * (1 + (reajusteMayor / 100));
            }
            proyeccionAnterior = proyeccionMesada;


            const numSmlmvProyectado = 0;
            const numSmlmvPagado = 0;
            const diferencia = 0;
            const numMesadas = 0;
            const totalRetroactivas = 0;

            return {
                año: year,
                smlmv,
                reajusteSMLMV,
                proyeccionMesada,
                numSmlmvProyectado,
                reajusteIPC: ipcAnterior,
                mesadaPagada,
                numSmlmvPagado,
                diferencia,
                numMesadas,
                totalRetroactivas,
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
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Año</TableHead>
                                        <TableHead>SMLMV</TableHead>
                                        <TableHead>Reajuste en % SMLMV</TableHead>
                                        <TableHead>Proyección de Mesada Fiduprevisora con % SMLMV</TableHead>
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
