'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pensioner, Payment, PaymentDetail } from '@/lib/data';
import { parsePaymentDetailName, formatCurrency, timestampToDate, parseEmployeeName } from '@/lib/helpers';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface PaymentDetailsSheetProps {
    pensioner: Pensioner | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function PaymentDetailsSheet({ pensioner, isOpen, onOpenChange }: PaymentDetailsSheetProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!pensioner) return;

        const fetchPayments = async () => {
            setIsLoading(true);
            try {
                const paymentsQuery = query(
                    collection(db, 'pensionados', pensioner.id, 'pagos'),
                    orderBy('fechaProcesado', 'desc')
                );
                const querySnapshot = await getDocs(paymentsQuery);
                const paymentsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Payment));
                setPayments(paymentsData);
            } catch (error) {
                console.error("Error fetching payments:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPayments();
    }, [pensioner]);

    const paymentsByYear = useMemo(() => {
        return payments.reduce((acc, payment) => {
            const year = payment.año || new Date(timestampToDate(payment.fechaProcesado) || Date.now()).getFullYear().toString();
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(payment);
            return acc;
        }, {} as Record<string, Payment[]>);
    }, [payments]);
    
    const years = useMemo(() => Object.keys(paymentsByYear).sort((a,b) => Number(b) - Number(a)), [paymentsByYear]);

    if (!pensioner) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-headline">{parseEmployeeName(pensioner.empleado)}</SheetTitle>
                    <SheetDescription>Documento: {pensioner.documento}</SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">No se encontraron pagos para este pensionado.</div>
                    ) : (
                        <Tabs defaultValue={years[0]} className="w-full">
                            <TabsList>
                                {years.map(year => (
                                    <TabsTrigger key={year} value={year}>
                                        <Calendar className="mr-2 h-4 w-4" /> {year}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {years.map(year => (
                                <TabsContent key={year} value={year} className="mt-4 space-y-4">
                                    {paymentsByYear[year].map(payment => (
                                        <Card key={payment.id}>
                                            <CardContent className="pt-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-semibold">Periodo: {payment.periodoPago}</h3>
                                                    <Badge variant="secondary">{timestampToDate(payment.fechaProcesado)?.toLocaleDateString()}</Badge>
                                                </div>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Concepto</TableHead>
                                                            <TableHead className="text-right">Ingresos</TableHead>
                                                            <TableHead className="text-right">Egresos</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {payment.detalles.map((detail, index) => (
                                                            <TableRow key={index} className={detail.nombre.includes('Totales') ? 'font-bold bg-muted/50' : ''}>
                                                                <TableCell>{parsePaymentDetailName(detail.nombre)}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(detail.ingresos)}</TableCell>
                                                                <TableCell className="text-right text-destructive">{formatCurrency(detail.egresos)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}