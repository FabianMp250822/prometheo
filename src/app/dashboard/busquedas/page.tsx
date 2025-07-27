
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ClipboardList, ListFilter, UserSearch } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, AlertTriangle } from 'lucide-react';
import { format, isWithinInterval, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { parseEmployeeName, formatCurrency, parsePeriodoPago, parseDepartmentName } from '@/lib/helpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pensioner } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    // State for payment search
    const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({ from: new Date(), to: new Date() });
    const [paymentResults, setPaymentResults] = useState<PaymentResult[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    
    // State for retirement search
    const [uniqueDependencias, setUniqueDependencias] = useState<string[]>([]);
    const [selectedDependencia, setSelectedDependencia] = useState('');
    const [retirementDate, setRetirementDate] = useState('');
    const [retirementResults, setRetirementResults] = useState<Pensioner[]>([]);
    const [isLoadingRetirement, setIsLoadingRetirement] = useState(false);
    
    const pensionerCache = new Map<string, { nombre: string; documento: string }>();

    // Fetch dependencies for the dropdown
    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const depSnapshot = await getDocs(query(collection(db, "pensionados")));
                const deps = new Set<string>();
                depSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.dependencia1) deps.add(data.dependencia1);
                });
                setUniqueDependencias(Array.from(deps).sort());
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las dependencias.' });
            }
        };
        fetchDependencies();
    }, [toast]);


    const handlePaymentSearch = useCallback(async () => {
        if (!dateRange.from || !dateRange.to) {
            toast({
                variant: 'destructive',
                title: 'Rango de Fechas Incompleto',
                description: 'Por favor, seleccione una fecha de inicio y una de fin.',
            });
            return;
        }

        setIsLoadingPayments(true);
        setPaymentResults([]);
        pensionerCache.clear();

        try {
            const startYear = getYear(dateRange.from).toString();
            const endYear = getYear(dateRange.to).toString();
            const yearsToQuery = [...new Set([startYear, endYear])];
            
            const paymentsQuery = query(
                collectionGroup(db, 'pagos'),
                where('año', 'in', yearsToQuery)
            );

            const querySnapshot = await getDocs(paymentsQuery);
            if (querySnapshot.empty) {
                 toast({ title: 'Sin Resultados', description: 'No se encontraron pagos en los años seleccionados.' });
                 setIsLoadingPayments(false);
                 return;
            }

            let filteredPayments: any[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const periodoDates = parsePeriodoPago(data.periodoPago);
                 if (periodoDates.startDate && isWithinInterval(periodoDates.startDate, { start: dateRange.from!, end: dateRange.to! })) {
                    const pensionadoId = doc.ref.parent.parent?.id;
                    if (pensionadoId) {
                       filteredPayments.push({ ...data, pensionadoId });
                    }
                }
            });

            if (filteredPayments.length > 0) {
                 const pensionerIds = [...new Set(filteredPayments.map(p => p.pensionadoId))];
                 for (let i = 0; i < pensionerIds.length; i += 30) {
                    const chunk = pensionerIds.slice(i, i + 30);
                    const pensionerQuery = query(collection(db, 'pensionados'), where('documento', 'in', chunk));
                    const pensionerSnapshot = await getDocs(pensionerQuery);
                    pensionerSnapshot.forEach(pensionerDoc => {
                        const data = pensionerDoc.data();
                        pensionerCache.set(pensionerDoc.id, { nombre: data.empleado, documento: data.documento });
                    });
                }
            }

            const finalResults = filteredPayments.map(p => {
                const pensionerInfo = pensionerCache.get(p.pensionadoId);
                return {
                    pensionadoId: p.pensionadoId,
                    pensionadoNombre: pensionerInfo?.nombre || 'Desconocido',
                    pensionadoDocumento: pensionerInfo?.documento || 'N/A',
                    periodoPago: p.periodoPago,
                    valorNeto: p.valorNeto,
                    fechaProcesado: p.fechaProcesado?.toDate ? format(p.fechaProcesado.toDate(), "d MMM, yyyy", { locale: es }) : 'N/A',
                }
            })

            if (finalResults.length === 0) {
                 toast({ title: 'Sin Resultados', description: 'Ningún periodo de pago coincide con el rango de fechas exacto.' });
            }

            setPaymentResults(finalResults);

        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error en la Búsqueda',
                description: `Ocurrió un error al consultar Firestore. Asegúrese de que los índices necesarios estén creados. ${error.message}`,
            });
        } finally {
            setIsLoadingPayments(false);
        }
    }, [dateRange, toast]);

    const handleJubilacionSearch = async () => {
        if (!selectedDependencia || !retirementDate) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Debe seleccionar una dependencia y una fecha.' });
            return;
        }
        setIsLoadingRetirement(true);
        setRetirementResults([]);

        try {
            const q = query(
                collection(db, 'pensionados'),
                where('dependencia1', '==', selectedDependencia),
                where('ano_jubilacion', '==', retirementDate)
            );
            const querySnapshot = await getDocs(q);
            const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            setRetirementResults(results);

            if (results.length === 0) {
                toast({ title: 'Sin resultados', description: 'No se encontraron pensionados con esa fecha y dependencia.' });
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error de Búsqueda', description: error.message });
        } finally {
            setIsLoadingRetirement(false);
        }
    };


    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <ListFilter className="h-6 w-6" />
                        Búsquedas Avanzadas
                    </CardTitle>
                    <CardDescription>
                        Herramientas de consulta para encontrar información específica en la base de datos.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><UserSearch className="h-5 w-5"/> Búsqueda por Fecha de Jubilación</CardTitle>
                    <CardDescription>Encuentre pensionados según su dependencia y fecha de retiro.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 items-end">
                        <div>
                            <Label htmlFor="dependencia-select">Dependencia</Label>
                            <Select value={selectedDependencia} onValueChange={setSelectedDependencia}>
                                <SelectTrigger id="dependencia-select"><SelectValue placeholder="Seleccione dependencia..." /></SelectTrigger>
                                <SelectContent>
                                    {uniqueDependencias.map(dep => (
                                        <SelectItem key={dep} value={dep}>{parseDepartmentName(dep)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="retirement-date">Fecha de Jubilación</Label>
                            <Input id="retirement-date" type="date" value={retirementDate} onChange={e => setRetirementDate(e.target.value)} />
                        </div>
                        <Button onClick={handleJubilacionSearch} disabled={isLoadingRetirement}>
                             {isLoadingRetirement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                             Buscar por Jubilación
                        </Button>
                    </div>
                     {isLoadingRetirement ? (
                        <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                     ) : retirementResults.length > 0 && (
                        <div className="mt-6">
                             <h4 className="text-md font-semibold mb-2">Resultados de Jubilación</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Fecha Jubilación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {retirementResults.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{parseEmployeeName(p.empleado)}</TableCell>
                                            <TableCell>{p.documento}</TableCell>
                                            <TableCell>{p.ano_jubilacion}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                        </div>
                     )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><ClipboardList className="h-5 w-5"/> Búsqueda de Pagos por Periodo</CardTitle>
                    <CardDescription>
                        Filtre los pensionados que recibieron pagos correspondientes a un rango de fechas específico.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full md:w-auto justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? format(dateRange.from, "d 'de' LLLL, yyyy", { locale: es }) : <span>Fecha de Inicio</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} initialFocus /></PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full md:w-auto justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.to ? format(dateRange.to, "d 'de' LLLL, yyyy", { locale: es }) : <span>Fecha de Fin</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} initialFocus /></PopoverContent>
                        </Popover>
                        <Button onClick={handlePaymentSearch} disabled={isLoadingPayments} className="w-full md:w-auto">
                            {isLoadingPayments ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Buscar Pagos
                        </Button>
                    </div>
                    
                    <h4 className="text-md font-semibold mb-2">Resultados de Pagos</h4>
                    {isLoadingPayments ? (
                        <div className="flex justify-center items-center p-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    ) : paymentResults.length > 0 ? (
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
                                {paymentResults.map((r, index) => (
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
                            <p className="text-muted-foreground">Seleccione un rango de fechas y haga clic en buscar para ver los resultados.</p>
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
