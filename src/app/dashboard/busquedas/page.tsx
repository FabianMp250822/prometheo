
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListFilter, UserSearch, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2 } from 'lucide-react';
import { format, isWithinInterval, parse, isValid, isBefore, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { parseEmployeeName, parseDepartmentName } from '@/lib/helpers';
import { Pensioner } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';

const parseSpanishDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Try YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = parse(dateStr, 'yyyy-MM-dd', new Date());
        return isValid(date) ? date : null;
    }

    // Try DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            const date = new Date(year, month - 1, day);
            return isValid(date) ? date : null;
        }
    }

    return null;
};


export default function BusquedasPage() {
    const { toast } = useToast();
    
    const [uniqueDependencias, setUniqueDependencias] = useState<string[]>([]);
    const [selectedDependencia, setSelectedDependencia] = useState('');
    const [retirementResults, setRetirementResults] = useState<Pensioner[]>([]);
    const [isLoadingRetirement, setIsLoadingRetirement] = useState(false);
    
    const [jubilacionSearchType, setJubilacionSearchType] = useState<'antes' | 'despues' | 'rango'>('rango');
    const [jubilacionDate1, setJubilacionDate1] = useState('');
    const [jubilacionDate2, setJubilacionDate2] = useState('');

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

    const handleJubilacionSearch = useCallback(async () => {
        if (!selectedDependencia) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Debe seleccionar una dependencia.' });
            return;
        }

        const date1 = parse(jubilacionDate1, 'yyyy-MM-dd', new Date());
        const date2 = jubilacionSearchType === 'rango' ? parse(jubilacionDate2, 'yyyy-MM-dd', new Date()) : null;

        if (jubilacionSearchType !== 'rango' && !isValid(date1)) {
            toast({ variant: 'destructive', title: 'Fecha inválida', description: 'Por favor ingrese una fecha válida (AAAA-MM-DD).' });
            return;
        }
        if (jubilacionSearchType === 'rango' && (!isValid(date1) || !isValid(date2))) {
            toast({ variant: 'destructive', title: 'Fechas inválidas', description: 'Por favor ingrese un rango de fechas válido.' });
            return;
        }

        setIsLoadingRetirement(true);
        setRetirementResults([]);

        try {
            const q = query(
                collection(db, 'pensionados'),
                where('dependencia1', '==', selectedDependencia)
            );
            
            const querySnapshot = await getDocs(q);
            const allPensionersFromDep = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            
            const results = allPensionersFromDep.filter(pensioner => {
                const dateSource = pensioner.fechaPensionado || pensioner.ano_jubilacion;
                if (!dateSource) return false;

                const pensionDate = parseSpanishDate(dateSource);
                if (!pensionDate) return false;

                switch(jubilacionSearchType) {
                    case 'antes':
                        return isBefore(pensionDate, date1);
                    case 'despues':
                        return isAfter(pensionDate, date1);
                    case 'rango':
                        return isWithinInterval(pensionDate, { start: date1, end: date2! });
                    default:
                        return false;
                }
            });
            
            setRetirementResults(results);

            if (results.length === 0) {
                toast({ title: 'Sin resultados', description: 'No se encontraron pensionados con esos criterios.' });
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error de Búsqueda', description: 'La consulta falló. Verifique los índices en Firestore.' });
        } finally {
            setIsLoadingRetirement(false);
        }
    }, [selectedDependencia, jubilacionSearchType, jubilacionDate1, jubilacionDate2, toast]);
    
    const handleExportToExcel = () => {
        if (retirementResults.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Sin Datos',
                description: 'No hay resultados de jubilación para exportar.',
            });
            return;
        }

        const dataToExport = retirementResults.map((p, index) => ({
            '#': index + 1,
            'Nombre': parseEmployeeName(p.empleado),
            'Documento': p.documento,
            'Fecha Jubilación': p.fechaPensionado || p.ano_jubilacion,
            'Dependencia': parseDepartmentName(p.dependencia1),
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Jubilados');

        worksheet['!cols'] = [
            { wch: 5 },
            { wch: 40 },
            { wch: 15 },
            { wch: 15 },
            { wch: 30 },
        ];

        XLSX.writeFile(workbook, `Reporte_Jubilados_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
                            <Label htmlFor="search-type-select">Tipo de Búsqueda</Label>
                             <Select value={jubilacionSearchType} onValueChange={(v) => setJubilacionSearchType(v as any)}>
                                <SelectTrigger id="search-type-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rango">Rango</SelectItem>
                                    <SelectItem value="antes">Antes de</SelectItem>
                                    <SelectItem value="despues">Después de</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 md:col-span-3 lg:col-span-1 lg:items-end">
                            <div className='flex-1'>
                                <Label htmlFor="retirement-date-1">{jubilacionSearchType === 'rango' ? 'Desde' : 'Fecha'}</Label>
                                <Input id="retirement-date-1" type="text" placeholder="AAAA-MM-DD" value={jubilacionDate1} onChange={e => setJubilacionDate1(e.target.value)} />
                            </div>
                            {jubilacionSearchType === 'rango' && (
                               <div className='flex-1'>
                                    <Label htmlFor="retirement-date-2">Hasta</Label>
                                    <Input id="retirement-date-2" type="text" placeholder="AAAA-MM-DD" value={jubilacionDate2} onChange={e => setJubilacionDate2(e.target.value)} />
                               </div>
                            )}
                        </div>
                    </div>
                     <div className="mt-4 flex justify-end">
                        <Button onClick={handleJubilacionSearch} disabled={isLoadingRetirement}>
                            {isLoadingRetirement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Buscar Jubilados
                        </Button>
                    </div>

                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="text-md font-semibold">Resultados de Jubilación ({retirementResults.length})</h4>
                            <Button onClick={handleExportToExcel} disabled={retirementResults.length === 0} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Exportar a Excel
                            </Button>
                        </div>
                        {isLoadingRetirement ? (
                            <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : retirementResults.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Fecha Jubilación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {retirementResults.map((p, index) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{parseEmployeeName(p.empleado)}</TableCell>
                                            <TableCell>{p.documento}</TableCell>
                                            <TableCell>{p.fechaPensionado || p.ano_jubilacion || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                        ) : (
                             <div className="text-center py-10">
                                <p className="text-muted-foreground">Realice una búsqueda para ver los resultados.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
