'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { ProcesoCancelado, Pensioner } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, Loader2, RotateCw, Download, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, parsePeriodoPago, parseEmployeeName, parsePaymentDetailName, timestampToDate, parseDepartmentName, formatPeriodoToMonthYear } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";
const PENSIONADOS_COLLECTION = "pensionados";

export default function SentenciasPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [procesos, setProcesos] = useState<ProcesoCancelado[]>([]);
    const { toast } = useToast();

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');

    // Dropdown options states
    const [uniqueDepartments, setUniqueDepartments] = useState<string[]>([]);
    const [uniqueYears, setUniqueYears] = useState<string[]>([]);


    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all 'procesoscancelados'
            const procesosQuery = query(collection(db, PROCESOS_CANCELADOS_COLLECTION));
            const procesosSnapshot = await getDocs(procesosQuery);
            let procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

            // 2. Get all unique pensioner IDs
            const pensionerIds = [...new Set(procesosData.map(p => p.pensionadoId))];
            
            // 3. Fetch all corresponding pensioners in chunks
            const pensionersData: { [key: string]: Pensioner } = {};
            const chunkSize = 30;
            for (let i = 0; i < pensionerIds.length; i += chunkSize) {
                const chunk = pensionerIds.slice(i, i + chunkSize);
                if (chunk.length === 0) continue; // Skip empty chunks
                const pensionerPromises = chunk.map(id => getDoc(doc(db, PENSIONADOS_COLLECTION, id)));
                const pensionerDocs = await Promise.all(pensionerPromises);

                pensionerDocs.forEach(pensionerDoc => {
                    if (pensionerDoc.exists()) {
                        const pensioner = { id: pensionerDoc.id, ...pensionerDoc.data() } as Pensioner;
                        pensionersData[pensioner.id] = pensioner;
                    }
                });
            }

            // 4. Enrich 'procesos' with pensioner info and calculate total amount
            let enrichedProcesos = procesosData.map(proceso => {
                const pensioner = pensionersData[proceso.pensionadoId];
                return {
                    ...proceso,
                    pensionerInfo: pensioner ? {
                        name: parseEmployeeName(pensioner.empleado),
                        document: pensioner.documento,
                        department: pensioner.dependencia1
                    } : undefined,
                };
            }).filter(p => p.pensionerInfo); // Filter out processos without pensioner info

            // 5. Sort by 'periodoPago' descending
            enrichedProcesos.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            setProcesos(enrichedProcesos);

            // 6. Extract unique values for filters
            const depts = new Set(enrichedProcesos.map(p => p.pensionerInfo?.department).filter(Boolean) as string[]);
            const years = new Set(enrichedProcesos.map(p => p.año).filter(Boolean));
            setUniqueDepartments(Array.from(depts).sort());
            setUniqueYears(Array.from(years).sort((a, b) => Number(b) - Number(a))); // Newest years first
            
            toast({ title: "Datos cargados", description: `${enrichedProcesos.length} registros de procesos encontrados.` });

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los datos." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

     const filteredProcesos = useMemo(() => {
        return procesos.filter(p => {
            if (!p.pensionerInfo) return false;

            const searchTermLower = searchTerm.toLowerCase();
            const searchMatch = searchTermLower === '' ||
                p.pensionerInfo.name.toLowerCase().includes(searchTermLower) ||
                p.pensionerInfo.document.includes(searchTermLower);

            const departmentMatch = selectedDepartment === 'all' || p.pensionerInfo.department === selectedDepartment;
            
            const yearMatch = selectedYear === 'all' || p.año === selectedYear;

            return searchMatch && departmentMatch && yearMatch;
        });
    }, [procesos, searchTerm, selectedDepartment, selectedYear]);

    const displayData = useMemo(() => {
        return filteredProcesos.flatMap(p => 
            p.conceptos.map(c => ({
                procesoId: p.id,
                pensionerInfo: p.pensionerInfo,
                periodoPago: p.periodoPago,
                concepto: c,
            }))
        );
    }, [filteredProcesos]);
    
    const exportToExcel = () => {
        if (filteredProcesos.length === 0) {
            toast({ variant: 'destructive', title: "Error", description: "No hay datos filtrados para exportar." });
            return;
        }

        const dataToExport = filteredProcesos.flatMap(p => 
            p.conceptos.map(c => ({
                "ID Pensionado": p.pensionadoId,
                "Nombre Pensionado": p.pensionerInfo?.name || 'N/A',
                "Dependencia": p.pensionerInfo?.department || 'N/A',
                "Periodo de Pago": formatPeriodoToMonthYear(p.periodoPago),
                "Concepto": parsePaymentDetailName(c.nombre),
                "Ingresos": c.ingresos,
                "Egresos": c.egresos,
                "Año": p.año,
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
                            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                                <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Recargar
                            </Button>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o documento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                         <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isLoading || uniqueDepartments.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Dependencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Dependencias</SelectItem>
                                {uniqueDepartments.map(dep => <SelectItem key={dep} value={dep}>{parseDepartmentName(dep)}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
                        {`${displayData.length} conceptos encontrados en ${filteredProcesos.length} procesos.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-10">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pensionado</TableHead>
                                        <TableHead>Dependencia</TableHead>
                                        <TableHead>Periodo de Pago</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead className="text-right">Ingresos</TableHead>
                                        <TableHead className="text-right">Egresos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayData.map((item, index) => (
                                        <TableRow key={`${item.procesoId}-${item.concepto.codigo}-${index}`}>
                                            <TableCell>
                                                <div className="font-medium">{item.pensionerInfo?.name || 'N/A'}</div>
                                                <div className="text-xs text-muted-foreground">{item.pensionerInfo?.document}</div>
                                            </TableCell>
                                            <TableCell>
                                                {parseDepartmentName(item.pensionerInfo?.department || 'N/A')}
                                            </TableCell>
                                            <TableCell>{formatPeriodoToMonthYear(item.periodoPago)}</TableCell>
                                            <TableCell>
                                                {parsePaymentDetailName(item.concepto.nombre)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(item.concepto.ingresos)}</TableCell>
                                            <TableCell className="text-right font-medium text-destructive">{formatCurrency(item.concepto.egresos)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {displayData.length === 0 && !isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
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
