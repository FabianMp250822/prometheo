'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, where, QueryDocumentSnapshot, DocumentData, or } from 'firebase/firestore';
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

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

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

    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);
    
    // This effect is to reset pagination and list when filters change
    useEffect(() => {
      setPensioners([]);
      setLastDoc(null);
      setHasMore(true);
      if(!debouncedSearchTerm) {
        fetchInitialPensioners(true);
      }
    }, [filters.dependencia, filters.centroCosto]);

    const buildQuery = useCallback((isSearch = false, cursor?: QueryDocumentSnapshot<DocumentData>) => {
        let q;
        const collectionRef = collection(db, "pensionados");

        if (isSearch) {
            const searchTermUpper = debouncedSearchTerm.toUpperCase();
            // Firestore does not support case-insensitive search natively.
            // A common workaround is to search for a range starting with the term.
            q = query(collectionRef, 
                or(
                    where("empleado", ">=", searchTermUpper),
                    where("empleado", "<=", searchTermUpper + '\uf8ff'),
                    where("documento", "==", debouncedSearchTerm)
                ),
                orderBy("empleado"), 
                limit(ITEMS_PER_PAGE)
            );
        } else {
            q = query(collectionRef, orderBy("documento"));

            if (filters.dependencia !== 'all') {
                q = query(q, where("dependencia1", "==", filters.dependencia));
            }
            if (filters.centroCosto !== 'all') {
                q = query(q, where("centroCosto", "==", filters.centroCosto));
            }
            if (cursor) {
                q = query(q, startAfter(cursor));
            }
            
            q = query(q, limit(ITEMS_PER_PAGE));
        }
        
        return q;

    }, [filters.dependencia, filters.centroCosto, debouncedSearchTerm]);


    const fetchInitialPensioners = useCallback(async (isInitial = true) => {
        if (isInitial) {
            setIsLoading(true);
            setPensioners([]); 
        } else {
            setIsLoadingMore(true);
        }

        try {
            const q = buildQuery(false, isInitial ? undefined : lastDoc);
            const querySnapshot = await getDocs(q);

            const newPensioners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            
            setLastDoc(lastVisible || null);
            setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE);

            setPensioners(prev => isInitial ? newPensioners : [...prev, ...newPensioners]);
            
        } catch (error) {
            console.error("Error fetching pensioners:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [buildQuery, lastDoc]);
    
    // Effect to fetch initial data for filters dropdowns
    useEffect(() => {
        const fetchFilterValues = async () => {
             try {
                // These reads are acceptable as they are metadata for UI and unlikely to change frequently.
                // Could be moved to a separate "metadata" collection for further optimization if they grow large.
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
        fetchInitialPensioners(true);
    }, []);

    // Effect for handling search
    useEffect(() => {
        const search = async () => {
            if (debouncedSearchTerm.length < 3) {
                if(pensioners.length === 0 && !isLoading) fetchInitialPensioners(true); // reload initial if search is cleared
                return;
            }
            setIsSearching(true);
            setIsLoading(true);

            try {
                const q = buildQuery(true);
                const querySnapshot = await getDocs(q);
                
                const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
                
                setPensioners(results);
                setHasMore(false); // No pagination for search results

            } catch (error) {
                console.error("Error during search:", error);
            } finally {
                setIsSearching(false);
                setIsLoading(false);
            }
        };

        if (debouncedSearchTerm) {
          search();
        } else {
          setPensioners([]); // Clear search results
          fetchInitialPensioners(true); // Fetch initial paginated data
        }
    }, [debouncedSearchTerm]);


    const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    const handleViewPayments = (pensioner: Pensioner) => {
        setSelectedPensioner(pensioner);
        setSheetPensioner(pensioner);
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative md:col-span-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nombre o documento..."
                                value={filters.searchTerm}
                                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                className="pl-10"
                            />
                             {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                        <Select value={filters.dependencia} onValueChange={value => handleFilterChange('dependencia', value)} disabled={!!debouncedSearchTerm}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Dependencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Dependencias</SelectItem>
                                {uniqueDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={filters.centroCosto} onValueChange={value => handleFilterChange('centroCosto', value)} disabled={!!debouncedSearchTerm}>
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
                            {debouncedSearchTerm.length >= 3 
                                ? `Mostrando ${pensioners.length} resultados para "${debouncedSearchTerm}".`
                                : `Mostrando registros paginados.`
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
                                {pensioners.map(pensioner => (
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
                                {pensioners.length === 0 && !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                             No se encontraron pensionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <div className="flex justify-center py-4">
                            {hasMore && !debouncedSearchTerm && (
                                <Button onClick={() => fetchInitialPensioners(false)} disabled={isLoadingMore}>
                                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Cargar más
                                </Button>
                            )}
                            {!hasMore && pensioners.length > 0 && !debouncedSearchTerm && (
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
