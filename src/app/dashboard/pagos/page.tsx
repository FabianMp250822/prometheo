'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Banknote, Search, Loader2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Pensioner } from '@/lib/data';
import { parseEmployeeName } from '@/lib/helpers';
import { PaymentDetailsSheet } from '@/components/dashboard/payment-details-sheet';

const ITEMS_PER_PAGE = 20;

export default function PagosPage() {
    const [allPensioners, setAllPensioners] = useState<Pensioner[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [uniqueDependencias, setUniqueDependencias] = useState<string[]>([]);
    const [uniqueCentrosCosto, setUniqueCentrosCosto] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        searchTerm: '',
        dependencia: 'all',
        centroCosto: 'all',
    });
    
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedPensioner, setSelectedPensioner] = useState<Pensioner | null>(null);

    // Fetch all data on initial load
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const pensionersQuery = query(collection(db, "pensionados"), orderBy("documento"));
                const querySnapshot = await getDocs(pensionersQuery);
                
                const pensionersData: Pensioner[] = [];
                const deps = new Set<string>();
                const centros = new Set<string>();

                querySnapshot.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() } as Pensioner;
                    pensionersData.push(data);
                    if (data.dependencia1) deps.add(data.dependencia1);
                    if (data.centroCosto) centros.add(data.centroCosto);
                });

                setAllPensioners(pensionersData);
                setUniqueDependencias(Array.from(deps).sort());
                setUniqueCentrosCosto(Array.from(centros).sort());

            } catch (error) {
                console.error("Error fetching pensioners:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredPensioners = useMemo(() => {
        setCurrentPage(0); // Reset to first page whenever filters change

        return allPensioners.filter(pensioner => {
            const searchTermMatch = filters.searchTerm 
                ? parseEmployeeName(pensioner.empleado).toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
                  pensioner.documento.includes(filters.searchTerm)
                : true;
            
            const dependenciaMatch = filters.dependencia === 'all' || pensioner.dependencia1 === filters.dependencia;
            
            const centroCostoMatch = filters.centroCosto === 'all' || pensioner.centroCosto === filters.centroCosto;

            return searchTermMatch && dependenciaMatch && centroCostoMatch;
        });
    }, [allPensioners, filters]);

    const pageCount = Math.ceil(filteredPensioners.length / ITEMS_PER_PAGE);
    const paginatedPensioners = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredPensioners.slice(start, end);
    }, [filteredPensioners, currentPage]);


    const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Banknote className="h-6 w-6" />
                        Gestión de Pagos
                    </CardTitle>
                    <CardDescription>
                        Consulte los registros de pagos de los pensionados.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <Card>
                <CardHeader className="gap-4">
                    <div className="relative w-full md:w-1/2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre o documento..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={filters.dependencia} onValueChange={value => handleFilterChange('dependencia', value)} disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Dependencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Dependencias</SelectItem>
                                {uniqueDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={filters.centroCosto} onValueChange={value => handleFilterChange('centroCosto', value)} disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Centro de Costo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Centros de Costo</SelectItem>
                                {uniqueCentrosCosto.map(centro => <SelectItem key={centro} value={centro}>{centro}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center items-center p-10">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                    <>
                        <div className='mb-2 text-sm text-muted-foreground'>
                            Mostrando {paginatedPensioners.length} de {filteredPensioners.length} resultados.
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Dependencia</TableHead>
                                    <TableHead>Centro de Costo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedPensioners.map(pensioner => (
                                    <TableRow key={pensioner.id}>
                                        <TableCell className="font-medium">{parseEmployeeName(pensioner.empleado)}</TableCell>
                                        <TableCell>{pensioner.documento}</TableCell>
                                        <TableCell>{pensioner.dependencia1}</TableCell>
                                        <TableCell>{pensioner.centroCosto}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => setSelectedPensioner(pensioner)}>
                                                Ver Pagos
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedPensioners.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No se encontraron pensionados con los criterios de búsqueda.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <div className="flex items-center justify-between p-2 mt-4">
                            <div className="text-sm text-muted-foreground">
                                Página {currentPage + 1} de {pageCount > 0 ? pageCount : 1}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 0}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(pageCount - 1)} disabled={currentPage >= pageCount - 1 || pageCount === 0}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>

            {selectedPensioner && (
                <PaymentDetailsSheet
                    pensioner={selectedPensioner}
                    isOpen={!!selectedPensioner}
                    onOpenChange={(isOpen) => !isOpen && setSelectedPensioner(null)}
                />
            )}
        </div>
    );
}