'use client';

import React, { useState, useEffect } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import { getPensionerAdditionalDetails, type LastPaymentData } from '@/app/actions/get-pensioner-additional-details';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSquare, ServerCrash, History, Landmark, Hash, Tag, Loader2, Banknote, FileText } from 'lucide-react';
import { formatCurrency, formatPeriodoToMonthYear, parseEmployeeName, parseDepartmentName, parsePaymentDetailName, parsePeriodoPago } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { Payment, PaymentDetail } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function InfoField({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-1">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value || 'N/A'}</p>
            </div>
        </div>
    );
}

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


export default function PensionadoPage() {
    const { selectedPensioner } = usePensioner();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPensioner?.id) {
            setIsLoading(true);
            setError(null);
            setPayments([]);
            
            const fetchPayments = async () => {
                try {
                    const paymentsQuery = query(collection(db, 'pensionados', selectedPensioner.id, 'pagos'));
                    const querySnapshot = await getDocs(paymentsQuery);
                    let paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
                    
                    paymentsData.sort((a, b) => {
                        const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                        const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                        return dateB.getTime() - dateA.getTime();
                    });
                    
                    setPayments(paymentsData);
                } catch (e) {
                    console.error(e);
                    setError('Ocurrió un error al buscar los datos de pagos del pensionado.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPayments();
        } else {
            setPayments([]);
            setIsLoading(false);
        }
    }, [selectedPensioner]);

    const sentencePayments = React.useMemo((): SentencePayment[] => {
        if (!payments.length) return [];
        const foundPayments: SentencePayment[] = [];
        payments.forEach(payment => {
            payment.detalles.forEach(detail => {
                const matchedCode = SENTENCE_CODES.find(code => detail.nombre?.startsWith(`${code}-`));
                if (matchedCode && detail.ingresos > 0) {
                    foundPayments.push({
                        paymentId: payment.id,
                        concept: parsePaymentDetailName(detail.nombre),
                        periodoPago: payment.periodoPago,
                        amount: detail.ingresos,
                    });
                }
            });
        });
        return foundPayments;
    }, [payments]);

    if (isLoading) {
         return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold">Cargando Hoja de Vida...</h2>
                <p className="text-muted-foreground max-w-md">
                    Estamos consolidando toda la información del pensionado seleccionado.
                </p>
            </div>
        );
    }

    if (!selectedPensioner) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <UserSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Seleccione un Pensionado</h2>
                <p className="text-muted-foreground max-w-md">
                    Utilice el buscador en el encabezado para encontrar y seleccionar un pensionado. Una vez seleccionado, su hoja de vida completa aparecerá aquí.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <UserSquare className="h-6 w-6" />
                        Hoja de Vida del Pensionado
                    </CardTitle>
                    <CardDescription>Resumen de la información de {parseEmployeeName(selectedPensioner.empleado)}.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoField icon={<Hash />} label="Documento" value={selectedPensioner.documento} />
                    <InfoField icon={<Landmark />} label="Dependencia" value={parseDepartmentName(selectedPensioner.dependencia1)} />
                    <InfoField icon={<Tag />} label="Centro de Costo" value={selectedPensioner.centroCosto} />
                </CardContent>
            </Card>

            {error && (
                 <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Error al Cargar Detalles Adicionales</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && (
                <>
                    {sentencePayments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <FileText className="h-5 w-5" /> Resumen de Pagos por Sentencia
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Concepto</TableHead>
                                            <TableHead>Periodo de Pago</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sentencePayments.map((p, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{p.concept}</TableCell>
                                                <TableCell>{formatPeriodoToMonthYear(p.periodoPago)}</TableCell>
                                                <TableCell className="text-right font-semibold text-primary">{formatCurrency(p.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <History className="h-5 w-5" /> Historial de Pagos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             {payments.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Periodo</TableHead>
                                            <TableHead>Año</TableHead>
                                            <TableHead className="text-right">Total Ingresos</TableHead>
                                            <TableHead className="text-right">Total Egresos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.slice(0, 2).map(payment => {
                                            const totalIngresos = payment.detalles.reduce((sum, d) => sum + (d.ingresos || 0), 0);
                                            const totalEgresos = payment.detalles.reduce((sum, d) => sum + (d.egresos || 0), 0);
                                            return (
                                                <TableRow key={payment.id}>
                                                    <TableCell>{payment.periodoPago}</TableCell>
                                                    <TableCell>{payment.año}</TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(totalIngresos)}</TableCell>
                                                    <TableCell className="text-right font-medium text-red-600">{formatCurrency(totalEgresos)}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No se encontraron registros de pagos para este pensionado.</p>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
