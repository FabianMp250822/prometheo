'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
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
    const [pensioners, setPensioners] = useState<Pensioner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dependenciaFilter, setDependenciaFilter] = useState('all');
    const [centroCostoFilter, setCentroCostoFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedPensioner, setSelectedPensioner] = useState<Pensioner | null>(null);

    useEffect(() => {
        const fetchPensioners = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "pensionados"));
                const querySnapshot = await getDocs(q);
                const pensionersData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Pensioner));
                setPensioners(pensionersData);
            } catch (error) {
                console.error("Error fetching pensioners from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPensioners();
    }, []);

    const uniqueDependencias = useMemo(() => {
        const deps = new Set(pensioners.map(p => p.dependencia1).filter(Boolean));
        return Array.from(deps).sort();
    }, [pensioners]);

    const uniqueCentrosCosto = useMemo(() => {
        const centros = new Set(pensioners.map(p => p.centroCosto).filter(Boolean));
        return Array.from(centros).sort();
    }, [pensioners]);

    const filteredPensioners = useMemo(() => {
        return pensioners.filter(p => {
            const nameMatch = searchTerm ? parseEmployeeName(p.empleado).toLowerCase().includes(searchTerm.toLowerCase()) || p.documento.includes(searchTerm) : true;
            const depMatch = dependenciaFilter === 'all' || p.dependencia1 === dependenciaFilter;
            const centroMatch = centroCostoFilter === 'all' || p.centroCosto === centroCostoFilter;
            return nameMatch && depMatch && centroMatch;
        });
    }, [pensioners, searchTerm, dependenciaFilter, centroCostoFilter]);

    const paginatedPensioners = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        return filteredPensioners.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPensioners, currentPage]);

    const totalPages = Math.ceil(filteredPensioners.length / ITEMS_PER_PAGE);

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
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="pl-10"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={dependenciaFilter} onValueChange={value => { setDependenciaFilter(value); setCurrentPage(0); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Dependencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Dependencias</SelectItem>
                                {uniqueDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={centroCostoFilter} onValueChange={value => { setCentroCostoFilter(value); setCurrentPage(0); }}>
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
                                {filteredPensioners.length === 0 && (
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
                                Página {currentPage + 1} de {totalPages}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}>
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