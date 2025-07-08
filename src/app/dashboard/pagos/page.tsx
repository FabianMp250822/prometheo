
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, where, QueryDocumentSnapshot, DocumentData, getCountFromServer } from 'firebase/firestore';
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
    const [isOptionsLoading, setIsOptionsLoading] = useState(true);

    const [uniqueDependencias, setUniqueDependencias] = useState<string[]>([]);
    const [uniqueCentrosCosto, setUniqueCentrosCosto] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        searchTerm: '',
        dependencia: 'all',
        centroCosto: 'all',
    });
    
    // pagination state
    const [currentPage, setCurrentPage] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
    
    const [selectedPensioner, setSelectedPensioner] = useState<Pensioner | null>(null);

    // Fetch unique options for filters.
    useEffect(() => {
        const fetchOptions = async () => {
            setIsOptionsLoading(true);
            try {
                // NOTE: For performance on large datasets, this list should be stored
                // in a separate 'metadata' document in Firestore.
                const querySnapshot = await getDocs(collection(db, "pensionados"));
                const deps = new Set<string>();
                const centros = new Set<string>();
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.dependencia1) deps.add(data.dependencia1);
                    if (data.centroCosto) centros.add(data.centroCosto);
                });
                setUniqueDependencias(Array.from(deps).sort());
                setUniqueCentrosCosto(Array.from(centros).sort());
            } catch (error) {
                console.error("Error fetching filter options:", error);
            } finally {
                setIsOptionsLoading(false);
            }
        };

        fetchOptions();
    }, []);

    const fetchPensioners = useCallback(async (page: number) => {
        setIsLoading(true);
        try {
            const pensionersCollection = collection(db, "pensionados");
            
            let baseQuery;
            if (filters.searchTerm) {
                baseQuery = query(pensionersCollection, where("documento", "==", filters.searchTerm));
            } else {
                // The base order is by 'documento' for consistent pagination.
                baseQuery = query(pensionersCollection, orderBy("documento"));
                if (filters.dependencia !== 'all') {
                    baseQuery = query(baseQuery, where("dependencia1", "==", filters.dependencia));
                }
                if (filters.centroCosto !== 'all') {
                    // NOTE: Combining this with other 'where' clauses requires a composite index in Firestore.
                    // e.g., on (dependencia1, centroCosto, documento).
                    baseQuery = query(baseQuery, where("centroCosto", "==", filters.centroCosto));
                }
            }

            // Only fetch total count when filters change (on the first page)
            if (page === 0) {
                const countSnapshot = await getCountFromServer(baseQuery);
                const total = countSnapshot.data().count;
                setPageCount(Math.ceil(total / ITEMS_PER_PAGE));
            }
            
            let pageQuery = baseQuery;
            const cursor = pageCursors[page];
            if (page > 0 && cursor) {
                pageQuery = query(pageQuery, startAfter(cursor), limit(ITEMS_PER_PAGE));
            } else {
                pageQuery = query(pageQuery, limit(ITEMS_PER_PAGE));
            }

            const documentSnapshots = await getDocs(pageQuery);

            const pensionersData = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            setPensioners(pensionersData);

            const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;
            if (newLastVisible) {
                setPageCursors(prev => {
                    const newCursors = [...prev];
                    newCursors[page + 1] = newLastVisible;
                    return newCursors;
                });
            }
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching pensioners:", error);
            setPensioners([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters, pageCursors]);

    // Effect to reset and fetch data when filters change
    useEffect(() => {
        setPageCursors([null]);
        fetchPensioners(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

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
                        Consulte los registros de pagos de los pensionados con filtros y paginación optimizada.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <Card>
                <CardHeader className="gap-4">
                    <div className="relative w-full md:w-1/2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por documento exacto..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={filters.dependencia} onValueChange={value => handleFilterChange('dependencia', value)} disabled={isOptionsLoading || !!filters.searchTerm}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Dependencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Dependencias</SelectItem>
                                {uniqueDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={filters.centroCosto} onValueChange={value => handleFilterChange('centroCosto', value)} disabled={isOptionsLoading || !!filters.searchTerm}>
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
                                {pensioners.map(pensioner => (
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
                                {pensioners.length === 0 && (
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
                                Página {currentPage + 1} de {pageCount}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => fetchPensioners(0)} disabled={currentPage === 0}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => fetchPensioners(currentPage - 1)} disabled={currentPage === 0}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => fetchPensioners(currentPage + 1)} disabled={currentPage >= pageCount - 1}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => fetchPensioners(pageCount - 1)} disabled={currentPage >= pageCount - 1}>
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

