'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProcesoCancelado } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, Loader2, Download, Search, Filter, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPeriodoToMonthYear, parsePaymentDetailName, formatFirebaseTimestamp } from '@/lib/helpers';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


// Extend the jsPDF type to include the autoTable method
declare module 'jspdf' {
    interface jsPDF {
      autoTable: (options: any) => jsPDF;
    }
}

const ITEMS_PER_PAGE = 20;

export default function PagoSentenciasPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [procesos, setProcesos] = useState<ProcesoCancelado[]>([]);
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [uniqueYears, setUniqueYears] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "procesoscancelados"));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ProcesoCancelado));

                const sortedData = data.sort((a, b) => {
                    const dateA = a.creadoEn ? new Date((a.creadoEn as any).seconds * 1000) : new Date(0);
                    const dateB = b.creadoEn ? new Date((b.creadoEn as any).seconds * 1000) : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });

                setProcesos(sortedData);
                
                const years = [...new Set(data.map(p => p.año).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
                setUniqueYears(years);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los datos de sentencias." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [toast]);

     const filteredProcesos = useMemo(() => {
        setCurrentPage(1); // Reset page when filters change
        return procesos.filter(p => {
            const searchTermLower = searchTerm.toLowerCase();
            const searchMatch = searchTermLower === '' ||
                p.pensionadoId.toLowerCase().includes(searchTermLower);
            
            const yearMatch = selectedYear === 'all' || p.año === selectedYear;

            return searchMatch && yearMatch;
        });
    }, [procesos, searchTerm, selectedYear]);

    const paginatedProcesos = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProcesos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredProcesos, currentPage]);

    const totalPages = Math.ceil(filteredProcesos.length / ITEMS_PER_PAGE);

    const exportToExcel = () => {
        if (filteredProcesos.length === 0) {
            toast({ variant: 'destructive', title: "Sin Datos", description: "No hay datos filtrados para exportar." });
            return;
        }

        const dataToExport = filteredProcesos.flatMap(p => 
            p.conceptos.map(c => ({
                "ID Pensionado": p.pensionadoId,
                "Periodo de Pago": formatPeriodoToMonthYear(p.periodoPago),
                "Concepto": parsePaymentDetailName(c.nombre),
                "Ingresos": c.ingresos,
                "Egresos": c.egresos,
                "Año": p.año,
                "Fecha Liquidacion": p.fechaLiquidacion,
                "ID Pago": p.pagoId,
            }))
        );

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos de Sentencias");

        XLSX.writeFile(workbook, `Reporte_Pagos_Sentencias_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "Exportación exitosa", description: "El archivo de Excel ha sido generado." });
    };
    
    const handlePrint = () => {
        if (filteredProcesos.length === 0) {
            toast({ variant: 'destructive', title: "Sin Datos", description: "No hay datos filtrados para imprimir." });
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(18);
        doc.text('Reporte de Pagos por Sentencias', 14, 22);
        doc.setFontSize(11);
        const dateStr = `Generado el: ${format(new Date(), "d 'de' LLLL, yyyy", { locale: es })}`;
        doc.text(dateStr, 14, 30);

        const tableColumn = ["ID Pensionado", "Periodo", "Concepto", "Ingresos", "Egresos", "Año Liquid."];
        const tableRows: any[][] = [];

        filteredProcesos.forEach(p => {
            p.conceptos.forEach(c => {
                 const row = [
                    p.pensionadoId,
                    formatPeriodoToMonthYear(p.periodoPago),
                    parsePaymentDetailName(c.nombre),
                    formatCurrency(c.ingresos),
                    formatCurrency(c.egresos),
                    p.año
                ];
                tableRows.push(row);
            });
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74] },
            styles: { fontSize: 8, cellPadding: 2 },
        });

        doc.save(`Reporte_Pagos_Sentencias_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Gavel className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl md:text-3xl font-headline text-foreground">
                                    Pago de Sentencias
                                </CardTitle>
                                <CardDescription>
                                    Visualice y exporte los datos de pagos por sentencias judiciales.
                                </CardDescription>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handlePrint} disabled={isLoading || filteredProcesos.length === 0}>
                                <Printer className="mr-2 h-4 w-4" />
                                Exportar a PDF
                            </Button>
                            <Button size="sm" onClick={exportToExcel} disabled={isLoading || filteredProcesos.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar a Excel
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros de Búsqueda
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por ID de pensionado..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                         <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading || uniqueYears.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Año Fiscal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Años</SelectItem>
                                {uniqueYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                    <CardDescription>
                        {`${filteredProcesos.length} registros encontrados.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <DataTableSkeleton columnCount={5} rowCount={5} />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID Pensionado</TableHead>
                                        <TableHead>Periodo de Pago</TableHead>
                                        <TableHead>Conceptos</TableHead>
                                        <TableHead className="text-right">Valores</TableHead>
                                        <TableHead className="text-right">Total Proceso</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProcesos.map((p) => {
                                        const totalProceso = p.conceptos.reduce((acc, c) => acc + c.ingresos, 0);
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="align-top font-medium py-3">{p.pensionadoId}</TableCell>
                                                <TableCell className="align-top py-3">{formatPeriodoToMonthYear(p.periodoPago)}</TableCell>
                                                <TableCell className="p-0 align-top">
                                                    <div className="divide-y divide-border">
                                                        {p.conceptos.map(c => <div className="px-4 py-3" key={c.codigo}>{parsePaymentDetailName(c.nombre)}</div>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-0 align-top text-right">
                                                    <div className="divide-y divide-border font-medium">
                                                        {p.conceptos.map(c => <div className="px-4 py-3" key={c.codigo}>{formatCurrency(c.ingresos)}</div>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold align-top py-3">
                                                    {formatCurrency(totalProceso)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {paginatedProcesos.length === 0 && !isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                                No se encontraron datos con los filtros aplicados.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                             {totalPages > 1 && (
                                <div className="flex justify-between items-center p-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
