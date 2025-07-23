'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, Loader2, UserX } from 'lucide-react';
import { usePensioner } from '@/context/pensioner-provider';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment } from '@/lib/data';
import { formatCurrency, parsePeriodoPago } from '@/lib/helpers';

const smlmvData: { [year: number]: number } = {
    1998: 203826, 1999: 236460, 2000: 260100, 2001: 286000, 2002: 309000, 2003: 332000, 
    2004: 358000, 2005: 381500, 2006: 408000, 2007: 433700, 2008: 461500, 2009: 496900, 
    2010: 515000, 2011: 535600, 2012: 566700, 2013: 589500, 2014: 616000, 2015: 644350, 
    2016: 689455, 2017: 737717, 2018: 781242, 2019: 828116, 2020: 877803, 2021: 908526, 
    2022: 1000000, 2023: 1160000, 2024: 1300000, 2025: 1423500
};

export default function AdquisitivoPage() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedPensioner) {
            setPayments([]);
            return;
        }

        const fetchPayments = async () => {
            setIsLoading(true);
            try {
                const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                const querySnapshot = await getDocs(paymentsQuery);
                let paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

                // Sort by start date to easily find the first payment of a year
                paymentsData.sort((a, b) => {
                    const dateA = parsePeriodoPago(a.periodoPago)?.startDate || new Date(9999, 0, 1);
                    const dateB = parsePeriodoPago(b.periodoPago)?.startDate || new Date(9999, 0, 1);
                    return dateA.getTime() - dateB.getTime();
                });
                
                setPayments(paymentsData);
            } catch (error) {
                console.error("Error fetching payments:", error);
                setPayments([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPayments();
    }, [selectedPensioner]);

    const tableData = useMemo(() => {
        if (payments.length === 0) return [];
        
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1998 + 1 }, (_, i) => 1998 + i);

        return years.map(year => {
            let paidByCompany = 0;

            // Find all payments for the given year.
            const paymentsInYear = payments.filter(p => {
                const paymentStartDate = parsePeriodoPago(p.periodoPago)?.startDate;
                return paymentStartDate?.getFullYear() === year;
            });

            // Iterate through the year's payments to find the first valid mesada.
            for (const payment of paymentsInYear) {
                const mesadaDetail = payment.detalles.find(d => 
                    (d.nombre === 'Mesada Pensional' || d.codigo === 'MESAD') && d.ingresos > 0
                );
                if (mesadaDetail) {
                    paidByCompany = mesadaDetail.ingresos;
                    break; // Stop once we've found the first valid one.
                }
            }

            return {
                year: year,
                smlmv: smlmvData[year] || 0,
                paidByCompany,
                pensionDeVejez: 0,
                unidadPensional: 0,
                numSmlmv: 0
            };
        });
    }, [payments]);

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
                                            <TableCell>{formatCurrency(row.pensionDeVejez)}</TableCell>
                                            <TableCell>{formatCurrency(row.unidadPensional)}</TableCell>
                                            <TableCell>{row.numSmlmv}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
