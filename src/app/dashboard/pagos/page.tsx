'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Banknote, Search, Loader2 } from 'lucide-react';
import { Pensioner } from '@/lib/data';
import { parseEmployeeName } from '@/lib/helpers';
import { PaymentDetailsSheet } from '@/components/dashboard/payment-details-sheet';
import { usePensioner } from '@/context/pensioner-provider';

const ITEMS_PER_PAGE = 50;

export default function PagosPage() {
    const [pensioners, setPensioners] = useState<Pensioner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    
    const [uniqueDependencias, setUniqueDependencias] = useState<string[]>([]);
    const [uniqueCentrosCosto, setUniqueCentrosCosto] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        searchTerm: '',
        dependencia: 'all',
        centroCosto: 'all',
    });
    
    const { setSelectedPensioner } = usePensioner();
    const [sheetPensioner, setSheetPensioner] = useState<Pensioner | null>(null);

    // State for hybrid search
    const [isDeepSearching, setIsDeepSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Pensioner[] | null>(null);

    const buildQuery = useCallback((cursor?: QueryDocumentSnapshot<DocumentData>) => {
        let q = query(collection(db, "pensionados"), orderBy("documento"));

        if (filters.dependencia !== 'all') {
            q = query(q, where("dependencia1", "==", filters.dependencia));
        }
        if (filters.centroCosto !== 'all') {
            q = query(q, where("centroCosto", "==", filters.centroCosto));
        }
        if (cursor) {
            q = query(q, startAfter(cursor));
        }
        
        return query(q, limit(ITEMS_PER_PAGE));
    }, [filters.dependencia, filters.centroCosto]);


    const fetchPensioners = useCallback(async (isInitial = true) => {
        if (isInitial) {
            setIsLoading(true);
            setPensioners([]); 
        } else {
            setIsLoadingMore(true);
        }

        try {
            const q = buildQuery(isInitial ? undefined : lastDoc);
            const querySnapshot = await getDocs(q);

            const newPensioners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            
            setLastDoc(lastVisible || null);
            setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE);

            if (isInitial) {
                setPensioners(newPensioners);
            } else {
                setPensioners(prev => [...prev, ...newPensioners]);
            }
            
        } catch (error) {
            console.error("Error fetching pensioners:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [buildQuery, lastDoc]);
    
    useEffect(() => {
        const fetchFilterValues = async () => {
             try {
                const depSnapshot = await getDocs(query(collection(db, "pensionados")));
                const deps = new Set<string>();
                const centros = new Set<string>();

                depSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.dependencia1) deps.add(data.dependencia1);
                    if (data.centroCosto) centros.add(data.centroCosto);
                });

                setUniqueDependencias(Array.from(deps).sort());
                setUniqueCentrosCosto(Array.from(centros).sort());

            } catch (error) {
                console.error("Error fetching filter values:", error);
            }
        };
        fetchFilterValues();
        fetchPensioners(true);
    }, [filters.dependencia, filters.centroCosto]);

    const filteredBySearch = useMemo(() => {
        if (!filters.searchTerm) return pensioners;
        return pensioners.filter(pensioner => 
            (pensioner.empleado || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
            (pensioner.documento || '').toLowerCase().includes(filters.searchTerm.toLowerCase())
        );
    }, [pensioners, filters.searchTerm]);

    const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
        // Reset deep search results when filters change
        if (filterType !== 'searchTerm') {
             setSearchResults(null);
        }
    };

    const handleDeepSearch = async () => {
        if (filters.searchTerm.length < 3) return;
        setIsDeepSearching(true);
        setSearchResults(null);

        try {
            const searchTermLower = filters.searchTerm.toLowerCase();
            const allPensionersQuery = query(collection(db, 'pensionados'));
            const querySnapshot = await getDocs(allPensionersQuery);
            
            const allDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));

            const results = allDocs.filter(pensioner => 
                (pensioner.empleado || '').toLowerCase().includes(searchTermLower) ||
                (pensioner.documento || '').toLowerCase().includes(searchTermLower)
            );
            
            setSearchResults(results);

        } catch (error) {
            console.error("Error during deep search:", error);
        } finally {
            setIsDeepSearching(false);
        }
    };

    const handleViewPayments = (pensioner: Pensioner) => {
        setSelectedPensioner(pensioner);
        setSheetPensioner(pensioner);
    };

    const displayData = searchResults !== null ? searchResults : filteredBySearch;
    const showDeepSearchButton = filters.searchTerm.length >= 3 && filteredBySearch.length === 0 && searchResults === null;

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative md:col-span-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nombre o documento..."
                                value={filters.searchTerm}
                                onChange={(e) => {
                                    handleFilterChange('searchTerm', e.target.value);
                                    setSearchResults(null); // Reset deep search on new input
                                }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filters.dependencia} onValueChange={value => handleFilterChange('dependencia', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Dependencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Dependencias</SelectItem>
                                {uniqueDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={filters.centroCosto} onValueChange={value => handleFilterChange('centroCosto', value)}>
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
                            {searchResults !== null 
                                ? `Mostrando ${searchResults.length} resultados de la búsqueda profunda.`
                                : `Mostrando ${filteredBySearch.length} de ${pensioners.length} pensionados cargados.`
                            }
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
                                {displayData.map(pensioner => (
                                    <TableRow key={pensioner.id}>
                                        <TableCell className="font-medium">{parseEmployeeName(pensioner.empleado)}</TableCell>
                                        <TableCell>{pensioner.documento}</TableCell>
                                        <TableCell>{pensioner.dependencia1}</TableCell>
                                        <TableCell>{pensioner.centroCosto}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewPayments(pensioner)}>
                                                Ver Pagos
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {displayData.length === 0 && !isLoading && !isDeepSearching && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                             No se encontraron pensionados con los criterios aplicados.
                                             {showDeepSearchButton && (
                                                <Button variant="link" onClick={handleDeepSearch}>
                                                    Buscar en toda la base de datos
                                                </Button>
                                             )}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {isDeepSearching && (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <div className="flex justify-center py-4">
                            {hasMore && searchResults === null && !filters.searchTerm && (
                                <Button onClick={() => fetchPensioners(false)} disabled={isLoadingMore}>
                                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Cargar más
                                </Button>
                            )}
                            {!hasMore && pensioners.length > 0 && searchResults === null && !filters.searchTerm && (
                                <p className="text-sm text-muted-foreground">Has llegado al final de la lista.</p>
                            )}
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>

            <PaymentDetailsSheet
                pensioner={sheetPensioner}
                isOpen={!!sheetPensioner}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setSheetPensioner(null);
                    }
                }}
            />
        </div>
    );
}
