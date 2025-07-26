
'use client';

import React, { useState, useCallback } from 'react';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, CalendarIcon, AlertTriangle, ListFilter } from 'lucide-react';
import { format, isWithinInterval, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { parseEmployeeName, formatCurrency, parsePeriodoPago } from '@/lib/helpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PaymentResult {
    pensionadoId: string;
    pensionadoNombre: string;
    pensionadoDocumento: string;
    periodoPago: string;
    valorNeto: string;
    fechaProcesado: string;
}

export default function BusquedasPage() {
    const { toast } = useToast();
    const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({ from: new Date(), to: new Date() });
    const [results, setResults] = useState<PaymentResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const pensionerCache = new Map<string, { nombre: string; documento: string }>();

    const handleSearch = useCallback(async () => {
        if (!dateRange.from || !dateRange.to) {
            toast({
                variant: 'destructive',
                title: 'Rango de Fechas Incompleto',
                description: 'Por favor, seleccione una fecha de inicio y una de fin.',
            });
            return;
        }

        setIsLoading(true);
        setResults([]);
        pensionerCache.clear();

        try {
            const startYear = getYear(dateRange.from).toString();
            const endYear = getYear(dateRange.to).toString();
            const yearsToQuery = startYear === endYear ? [startYear] : [startYear, endYear];
            
            const paymentsQuery = query(
                collectionGroup(db, 'pagos'),
                where('año', 'in', yearsToQuery)
            );

            const querySnapshot = await getDocs(paymentsQuery);
            if (querySnapshot.empty) {
                 toast({ title: 'Sin Resultados', description: 'No se encontraron pagos en los años seleccionados.' });
                 setIsLoading(false);
                 return;
            }

            const paymentResults: PaymentResult[] = [];
            const pensionerIdsToFetch = new Set<string>();

            // First pass: filter by date range and collect pensioner IDs
            querySnapshot.forEach(paymentDoc => {
                const paymentData = paymentDoc.data();
                const periodoDates = parsePeriodoPago(paymentData.periodoPago);
                if (periodoDates.startDate && isWithinInterval(periodoDates.startDate, { start: dateRange.from!, end: dateRange.to! })) {
                    const pensionadoId = paymentDoc.ref.parent.parent?.id;
                    if (pensionadoId) {
                        pensionerIdsToFetch.add(pensionadoId);
                    }
                }
            });

            // Fetch all required pensioner data in batches
            if (pensionerIdsToFetch.size > 0) {
                const idsArray = Array.from(pensionerIdsToFetch);
                const chunks = [];
                for (let i = 0; i < idsArray.length; i += 30) {
                    chunks.push(idsArray.slice(i, i + 30));
                }

                for (const chunk of chunks) {
                    const pensionerQuery = query(collection(db, 'pensionados'), where('documento', 'in', chunk));
                    const pensionerSnapshot = await getDocs(pensionerQuery);
                    pensionerSnapshot.forEach(pensionerDoc => {
                        const data = pensionerDoc.data();
                        pensionerCache.set(pensionerDoc.id, { nombre: data.empleado, documento: data.documento });
                    });
                }
            }

            // Second pass: construct final results
            querySnapshot.forEach(paymentDoc => {
                const paymentData = paymentDoc.data();
                const periodoDates = parsePeriodoPago(paymentData.periodoPago);
                if (periodoDates.startDate && isWithinInterval(periodoDates.startDate, { start: dateRange.from!, end: dateRange.to! })) {
                    const pensionadoId = paymentDoc.ref.parent.parent?.id;
                    if (pensionadoId) {
                        const pensionerInfo = pensionerCache.get(pensionadoId);
                        paymentResults.push({
                            pensionadoId: pensionadoId,
                            pensionadoNombre: pensionerInfo?.nombre || 'Desconocido',
                            pensionadoDocumento: pensionerInfo?.documento || 'N/A',
                            periodoPago: paymentData.periodoPago,
                            valorNeto: paymentData.valorNeto,
                            fechaProcesado: paymentData.fechaProcesado?.toDate ? format(paymentData.fechaProcesado.toDate(), "d MMM, yyyy", { locale: es }) : 'N/A',
                        });
                    }
                }
            });
            
            if (paymentResults.length === 0) {
                 toast({ title: 'Sin Resultados', description: 'Ningún periodo de pago coincide con el rango de fechas exacto.' });
            }

            setResults(paymentResults);

        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error en la Búsqueda',
                description: `Ocurrió un error al consultar Firestore. Asegúrese de que los índices necesarios estén creados. ${error.message}`,
            });
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, toast]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <ListFilter className="h-6 w-6" />
                        Búsqueda Avanzada de Pagos
                    </CardTitle>
                    <CardDescription>
                        Filtre los pensionados que recibieron pagos correspondientes a un rango de fechas específico.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full md:w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from ? format(dateRange.from, "d 'de' LLLL, yyyy", { locale: es }) : <span>Fecha de Inicio</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} initialFocus /></PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full md:w-[280px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.to ? format(dateRange.to, "d 'de' LLLL, yyyy", { locale: es }) : <span>Fecha de Fin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} initialFocus /></PopoverContent>
                    </Popover>
                     <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Buscar Pagos
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                    <CardDescription>{results.length} pagos encontrados en el rango seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    ) : results.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pensionado</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Periodo Pagado</TableHead>
                                    <TableHead>Fecha de Procesado</TableHead>
                                    <TableHead className="text-right">Valor Neto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((r, index) => (
                                    <TableRow key={`${r.pensionadoId}-${index}`}>
                                        <TableCell className="font-medium">{parseEmployeeName(r.pensionadoNombre)}</TableCell>
                                        <TableCell>{r.pensionadoDocumento}</TableCell>
                                        <TableCell>{r.periodoPago}</TableCell>
                                        <TableCell>{r.fechaProcesado}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(parseFloat(r.valorNeto.replace(/\./g, '').replace(',', '.')))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Por favor, seleccione un rango de fechas y haga clic en buscar para ver los resultados.</p>
                        </div>
                    )}
                     <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Nota sobre Índices</AlertTitle>
                        <AlertDescription>
                            Para que esta búsqueda funcione correctamente, es necesario tener un índice en Firestore para el campo `año` en la colección de grupo `pagos`. La búsqueda se realiza por año y se filtra por el periodo exacto en el código para mayor precisión.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
