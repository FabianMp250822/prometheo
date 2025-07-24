'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProcesoCancelado } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, Loader2, Download, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPeriodoToMonthYear, parsePaymentDetailName } from '@/lib/helpers';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { getProcesosCancelados } from '@/services/pensioner-service';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';

export default function SentenciasPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [procesos, setProcesos] = useState<ProcesoCancelado[]>([]);
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');

    const [uniqueYears, setUniqueYears] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await getProcesosCancelados();
                setProcesos(data);
                const years = [...new Set(data.map(p => p.año).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
                setUniqueYears(years);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los datos." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [toast]);

     const filteredProcesos = useMemo(() => {
        return procesos.filter(p => {
            const searchTermLower = searchTerm.toLowerCase();
            const searchMatch = searchTermLower === '' ||
                p.pensionadoId.toLowerCase().includes(searchTermLower);
            
            const yearMatch = selectedYear === 'all' || p.año === selectedYear;

            return searchMatch && yearMatch;
        });
    }, [procesos, searchTerm, selectedYear]);

    const exportToExcel = () => {
        if (filteredProcesos.length === 0) {
            toast({ variant: 'destructive', title: "Error", description: "No hay datos filtrados para exportar." });
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "Procesos Cancelados");

        XLSX.writeFile(workbook, `Reporte_Procesos_Cancelados_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "Exportación exitosa", description: "El archivo de Excel ha sido generado." });
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
                                    Análisis de Sentencias
                                </CardTitle>
                                <CardDescription>
                                    Visualice y exporte los datos de procesos cancelados.
                                </CardDescription>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button size="sm" onClick={exportToExcel} disabled={filteredProcesos.length === 0}>
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
                                    {filteredProcesos.map((p) => {
                                        const totalProceso = p.conceptos.reduce((acc, c) => acc + c.ingresos, 0);
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="align-middle font-medium">{p.pensionadoId}</TableCell>
                                                <TableCell className="align-middle">{formatPeriodoToMonthYear(p.periodoPago)}</TableCell>
                                                <TableCell className="p-0 align-middle">
                                                    <div className="divide-y divide-border">
                                                        {p.conceptos.map(c => <div className="px-4 py-3" key={c.codigo}>{parsePaymentDetailName(c.nombre)}</div>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-0 align-middle text-right">
                                                    <div className="divide-y divide-border font-medium">
                                                        {p.conceptos.map(c => <div className="px-4 py-3" key={c.codigo}>{formatCurrency(c.ingresos)}</div>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold align-middle">
                                                    {formatCurrency(totalProceso)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredProcesos.length === 0 && !isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No se encontraron datos con los filtros aplicados.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
