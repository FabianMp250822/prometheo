'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, Loader2, UserX } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { collection, getDocs, query, doc, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PagosHistoricoRecord, CausanteRecord } from '@/lib/data';
import { formatCurrency, parsePeriodoPago, formatFirebaseTimestamp } from '@/lib/helpers';

const smlmvData: { [year: number]: number } = {
    1998: 203826, 1999: 236460, 2000: 260100, 2001: 286000, 2002: 309000, 2003: 332000, 
    2004: 358000, 2005: 381500, 2006: 408000, 2007: 433700, 2008: 461500, 2009: 496900, 
    2010: 515000, 2011: 535600, 2012: 566700, 2013: 589500, 2014: 616000, 2015: 644350, 
    2016: 689455, 2017: 737717, 2018: 781242, 2019: 828116, 2020: 877803, 2021: 908526, 
    2022: 1000000, 2023: 1160000, 2024: 1300000, 2025: 1423500
};

const ipcData: { [year: number]: number } = {
    1998: 16.70, 1999: 9.23, 2000: 8.75, 2001: 7.65, 2002: 6.99, 2003: 6.49,
    2004: 5.50, 2005: 4.85, 2006: 4.48, 2007: 5.69, 2008: 7.67, 2009: 2.00,
    2010: 3.17, 2011: 3.73, 2012: 2.44, 2013: 1.94, 2014: 3.66, 2015: 6.77,
    2016: 5.75, 2017: 4.09, 2018: 3.18, 2019: 3.80, 2020: 1.61, 2021: 5.62,
    2022: 13.12, 2023: 9.28, 2024: 7.13, 2025: 4.82 
};

export default function AdquisitivoPage() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [historicalPayments, setHistoricalPayments] = useState<PagosHistoricoRecord[]>([]);
    const [causanteRecords, setCausanteRecords] = useState<CausanteRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedPensioner) {
            setPayments([]);
            setHistoricalPayments([]);
            setCausanteRecords([]);
            return;
        }

        const fetchAllPayments = async () => {
            setIsLoading(true);
            try {
                // Fetch recent payments
                const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                const querySnapshot = await getDocs(paymentsQuery);
                let paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
                
                setPayments(paymentsData);
                
                // Fetch historical payments
                const historicalDocRef = doc(db, 'pagosHistorico', selectedPensioner.documento);
                const historicalDocSnap = await getDoc(historicalDocRef);
                if (historicalDocSnap.exists()) {
                    const data = historicalDocSnap.data();
                    if(data && Array.isArray(data.records)) {
                       setHistoricalPayments(data.records as PagosHistoricoRecord[]);
                    }
                } else {
                    setHistoricalPayments([]);
                }
                
                // Fetch causante records
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
                console.error("Error fetching payment data:", error);
                setPayments([]);
                setHistoricalPayments([]);
                setCausanteRecords([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllPayments();
    }, [selectedPensioner]);

    const tableData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1998 + 1 }, (_, i) => 1998 + i);

        // Step 1: Initial data population from all sources
        let initialData = years.map(year => {
            let paidByCompany = 0;

            const paymentsInYear = payments.filter(p => {
                const paymentStartDate = parsePeriodoPago(p.periodoPago)?.startDate;
                return paymentStartDate?.getFullYear() === year;
            });

            // Sort by start date to correctly handle bi-weekly payments
            paymentsInYear.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.startDate || new Date(9999, 0, 1);
                const dateB = parsePeriodoPago(b.periodoPago)?.startDate || new Date(9999, 0, 1);
                return dateA.getTime() - dateB.getTime();
            });
            
            if (paymentsInYear.length > 0) {
                 const firstPaymentMonth = parsePeriodoPago(paymentsInYear[0].periodoPago)?.startDate?.getMonth();
                 if (firstPaymentMonth !== undefined) {
                    const paymentsInFirstMonth = paymentsInYear.filter(p => {
                        const pDate = parsePeriodoPago(p.periodoPago)?.startDate;
                        return pDate?.getMonth() === firstPaymentMonth;
                    });
                    
                    paidByCompany = paymentsInFirstMonth.reduce((acc, p) => {
                        const mesadaDetail = p.detalles.find(d => 
                            (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0
                        );
                        return acc + (mesadaDetail?.ingresos || 0);
                    }, 0);
                 }
            } else if (historicalPayments.length > 0) {
                 const historicalRecord = historicalPayments.find(rec => rec.ANO_RET === year);
                 if (historicalRecord && historicalRecord.VALOR_ACT) {
                    const valorAct = parseFloat(historicalRecord.VALOR_ACT.replace(',', '.'));
                    if (!isNaN(valorAct) && valorAct > 0) {
                       paidByCompany = valorAct;
                    }
                 }
            }
            
            let pensionDeVejez = 0;
            if (causanteRecords.length > 0) {
                const causanteRecordForYear = causanteRecords.find(rec => {
                    if (!rec.fecha_desde) return false;
                    const recordDate = formatFirebaseTimestamp(rec.fecha_desde, 'yyyy-MM-dd');
                    const recordYear = new Date(recordDate).getFullYear() + 1; // +1 based on previous logic
                    return recordYear === year;
                });
                if (causanteRecordForYear && causanteRecordForYear.valor_iss) {
                    pensionDeVejez = causanteRecordForYear.valor_iss;
                }
            }

            return {
                year: year,
                smlmv: smlmvData[year] || 0,
                paidByCompany,
                pensionDeVejez,
                unidadPensional: 0,
                numSmlmv: 0,
                isProjected: false,
            };
        });
        
        // Step 2: Post-process to fill in missing "pensionDeVejez" values using IPC
        for (let i = 1; i < initialData.length; i++) {
            if (initialData[i].pensionDeVejez === 0) {
                const previousYearData = initialData[i - 1];
                if (previousYearData.pensionDeVejez > 0) {
                    const previousYearIpc = ipcData[previousYearData.year];
                    if (previousYearIpc !== undefined) {
                        initialData[i].pensionDeVejez = previousYearData.pensionDeVejez * (1 + previousYearIpc / 100);
                        initialData[i].isProjected = true;
                    }
                }
            }
        }

        // Step 3: Calculate derived values
        return initialData.map(data => {
            const unidadPensional = data.paidByCompany + data.pensionDeVejez;
            const numSmlmv = data.smlmv > 0 ? unidadPensional / data.smlmv : 0;
            return {
                ...data,
                unidadPensional: unidadPensional,
                numSmlmv: parseFloat(numSmlmv.toFixed(2))
            }
        });

    }, [payments, historicalPayments, causanteRecords]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Percent className="h-6 w-6" />
                        Poder Adquisitivo
                    </CardTitle>
                    <CardDescription>
                       Cálculo del poder adquisitivo de la pensión a lo largo del tiempo.
                       {selectedPensioner && <span className="block mt-1 font-semibold text-primary">Pensionado: {selectedPensioner.empleado}</span>}
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center p-10">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : !selectedPensioner ? (
                         <div className="flex flex-col items-center justify-center p-10 text-center">
                            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No hay un pensionado seleccionado</h3>
                            <p className="text-muted-foreground">Por favor, use el buscador global para seleccionar un pensionado y ver sus datos.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Año</TableHead>
                                            <TableHead>SMLMV</TableHead>
                                            <TableHead>Pagado por la empresa</TableHead>
                                            <TableHead>Pensión de Vejez</TableHead>
                                            <TableHead>Unidad Pensional</TableHead>
                                            <TableHead>#SMLMV</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tableData.map((row) => (
                                            <TableRow key={row.year}>
                                                <TableCell className="font-medium">{row.year}</TableCell>
                                                <TableCell>{formatCurrency(row.smlmv)}</TableCell>
                                                <TableCell>{formatCurrency(row.paidByCompany)}</TableCell>
                                                <TableCell>
                                                    {formatCurrency(row.pensionDeVejez)}
                                                    {row.isProjected && <span className="text-destructive">*</span>}
                                                </TableCell>
                                                <TableCell>{formatCurrency(row.unidadPensional)}</TableCell>
                                                <TableCell>{row.numSmlmv}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                             <div className="text-xs text-muted-foreground pt-4">
                                * Valores proyectados calculados con base en el IPC del año anterior.
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
