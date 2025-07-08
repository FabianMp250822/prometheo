'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pensioner, Payment } from '@/lib/data';
import { parsePaymentDetailName, formatCurrency, parseEmployeeName, parsePeriodoPago } from '@/lib/helpers';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, FileText, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface PaymentDetailsSheetProps {
    pensioner: Pensioner | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

// Define the sentence concepts we are looking for based on the payment detail name prefix.
const SENTENCE_CONCEPTS: Record<string, string> = {
    '470': 'Costas Procesales',
    '785': 'Retro Mesada Adicional M1',
    '475': 'Procesos y Sentencia Judiciales',
};
const SENTENCE_CODES = Object.keys(SENTENCE_CONCEPTS);

interface SentencePayment {
    paymentId: string;
    concept: string;
    periodoPago: string;
    amount: number;
}


export function PaymentDetailsSheet({ pensioner, isOpen, onOpenChange }: PaymentDetailsSheetProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!pensioner) {
            setPayments([]); // Clear payments if pensioner is null
            return;
        }

        const fetchPayments = async () => {
            setIsLoading(true);
            try {
                // Query without server-side ordering to prevent potential index issues.
                const paymentsQuery = query(
                    collection(db, 'pensionados', pensioner.id, 'pagos')
                );
                const querySnapshot = await getDocs(paymentsQuery);
                
                let paymentsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Payment));

                // Sort client-side to ensure newest payments are first, based on payment period.
                paymentsData.sort((a, b) => {
                    const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                    const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                    return dateB.getTime() - dateA.getTime();
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
    }, [pensioner]);

    // Memoize the extraction of sentence-related payments
    const sentencePayments = useMemo((): SentencePayment[] => {
        if (!payments.length) return [];
        
        const foundPayments: SentencePayment[] = [];

        payments.forEach(payment => {
            payment.detalles.forEach(detail => {
                const matchedCode = SENTENCE_CODES.find(code => detail.nombre?.startsWith(`${code}-`));

                if (matchedCode && detail.ingresos > 0) {
                    foundPayments.push({
                        paymentId: payment.id,
                        concept: parsePaymentDetailName(detail.nombre), // Use helper to clean up the name
                        periodoPago: payment.periodoPago,
                        amount: detail.ingresos,
                    });
                }
            });
        });

        return foundPayments;
    }, [payments]);


    const paymentsByYear = useMemo(() => {
        return payments.reduce((acc, payment) => {
            const year = payment.año || (payment.fechaProcesado ? new Date(payment.fechaProcesado).getFullYear().toString() : new Date().getFullYear().toString());
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(payment);
            return acc;
        }, {} as Record<string, Payment[]>);
    }, [payments]);
    
    const years = useMemo(() => Object.keys(paymentsByYear).sort((a,b) => Number(b) - Number(a)), [paymentsByYear]);

    const handleSentenceClick = (paymentId: string) => {
        const element = document.getElementById(`payment-${paymentId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        element?.classList.add('ring-2', 'ring-accent', 'ring-offset-2');
        setTimeout(() => {
            element?.classList.remove('ring-2', 'ring-accent', 'ring-offset-2');
        }, 2000);
    };

    if (!pensioner) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-4xl flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle className="text-2xl font-headline">{parseEmployeeName(pensioner.empleado)}</SheetTitle>
                    <SheetDescription>Documento: {pensioner.documento}</SheetDescription>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {sentencePayments.length > 0 && (
                                <Card className="bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Resumen de Pagos por Sentencia
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Concepto</TableHead>
                                                    <TableHead>Fecha de Pago</TableHead>
                                                    <TableHead className="text-right">Valor Recibido</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sentencePayments.map((p, index) => (
                                                    <TableRow key={index} onClick={() => handleSentenceClick(p.paymentId)} className="cursor-pointer hover:bg-background">
                                                        <TableCell className="font-medium">{p.concept}</TableCell>
                                                        <TableCell>{p.periodoPago || 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(p.amount)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {payments.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">No se encontraron pagos para este pensionado.</div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                        <Banknote className="h-5 w-5" />
                                        <h3 className="text-lg font-semibold text-foreground">Historial de Pagos Detallado</h3>
                                    </div>
                                    <Tabs defaultValue={years[0]} className="w-full">
                                        <TabsList className="h-auto flex-wrap justify-start">
                                            {years.map(year => (
                                                <TabsTrigger key={year} value={year}>
                                                    <Calendar className="mr-2 h-4 w-4" /> {year}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {years.map(year => (
                                            <TabsContent key={year} value={year} className="mt-4 space-y-4">
                                                {paymentsByYear[year].map(payment => (
                                                    <Card key={payment.id} id={`payment-${payment.id}`} className="transition-all duration-300">
                                                        <CardContent className="pt-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="font-semibold">Periodo: {payment.periodoPago}</h3>
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
                                                                        <TableRow key={index} className={detail.nombre?.includes('Totales') ? 'font-bold bg-muted/50' : ''}>
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
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
