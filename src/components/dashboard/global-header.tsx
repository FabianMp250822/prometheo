'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePensioner } from '@/context/pensioner-provider';
import type { Pensioner } from '@/lib/data';
import { parseEmployeeName } from '@/lib/helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, User, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

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

export function GlobalHeader() {
    const { selectedPensioner, setSelectedPensioner } = usePensioner();
    const { isMobile } = useSidebar();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Pensioner[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const searchGlobal = useCallback(async (searchVal: string) => {
        setIsSearching(true);
        try {
            // --- 1. Primary Search in 'pensionados' ---
            const pensionersRef = collection(db, 'pensionados');
            const searchTermUpper = searchVal.toUpperCase();

            const docQuery = query(
                pensionersRef,
                where('documento', '>=', searchVal),
                where('documento', '<=', searchVal + '\uf8ff'),
                limit(15)
            );

            const nameQuery = query(
                pensionersRef,
                where('empleado', '>=', searchTermUpper),
                where('empleado', '<=', searchTermUpper + '\uf8ff'),
                limit(15)
            );

            const [pensionerDocSnapshot, pensionerNameSnapshot] = await Promise.all([
                getDocs(docQuery),
                getDocs(nameQuery),
            ]);
            
            const combinedPensionerResults: Map<string, Pensioner> = new Map();
            pensionerDocSnapshot.forEach(doc => combinedPensionerResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner));
            pensionerNameSnapshot.forEach(doc => combinedPensionerResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner));

            let finalResults = Array.from(combinedPensionerResults.values());

            // --- 2. Secondary Search in 'procesos' if no results in 'pensionados' ---
            if (finalResults.length === 0) {
                const procesosRef = collection(db, 'procesos');
                let procesosQuery;

                if (/^\d+$/.test(searchVal)) { // Search by document
                    procesosQuery = query(
                        procesosRef,
                        where('identidad_clientes', '>=', searchVal),
                        where('identidad_clientes', '<=', searchVal + '\uf8ff'),
                        limit(15)
                    );
                } else { // Search by name
                    procesosQuery = query(
                        procesosRef,
                        where('nombres_demandante', '>=', searchTermUpper),
                        where('nombres_demandante', '<=', searchTermUpper + '\uf8ff'),
                        limit(15)
                    );
                }
                
                const procesosSnapshot = await getDocs(procesosQuery);
                const procesosResults = procesosSnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Adapt process data to Pensioner type
                    return {
                        id: doc.id,
                        documento: data.identidad_clientes || 'N/A',
                        empleado: data.nombres_demandante || 'Proceso sin nombre',
                        dependencia1: 'PROCESO', // To identify the source
                        centroCosto: data.despacho || 'N/A',
                    } as Pensioner;
                });
                finalResults = procesosResults;
            }

            setSearchResults(finalResults);
        } catch (error) {
            console.error("Error during global search:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (debouncedSearchTerm.length >= 3) {
            searchGlobal(debouncedSearchTerm);
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearchTerm, searchGlobal]);

    const handleSelect = (pensioner: Pensioner) => {
        setSelectedPensioner(pensioner);
        setOpen(false);
        setSearchTerm('');
        setSearchResults([]);
        router.push('/dashboard/pensionado');
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2">
                 {isMobile && <SidebarTrigger />}
                 <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[200px] md:w-[300px] justify-between"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            {selectedPensioner
                                ? parseEmployeeName(selectedPensioner.empleado)
                                : "Buscar pensionado..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Buscar por nombre o documento..."
                                value={searchTerm}
                                onValueChange={setSearchTerm}
                            />
                            <CommandList>
                                {isSearching && <div className="p-2 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                                {!isSearching && searchResults.length === 0 && searchTerm.length > 2 && <CommandEmpty>No se encontraron resultados.</CommandEmpty>}
                                <CommandGroup>
                                    {searchResults.map((pensioner) => (
                                        <CommandItem
                                            key={pensioner.id}
                                            value={`${pensioner.empleado} ${pensioner.documento}`}
                                            onSelect={() => handleSelect(pensioner)}
                                        >
                                            <div>
                                                <div>{parseEmployeeName(pensioner.empleado)}</div>
                                                <div className="text-xs text-muted-foreground">{pensioner.documento}</div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {selectedPensioner && (
                    <div className="text-sm text-muted-foreground hidden md:block">
                        <User className="inline-block mr-2 h-4 w-4" />
                        <span className="font-semibold text-foreground">Pensionado Activo:</span> {parseEmployeeName(selectedPensioner.empleado)}
                    </div>
                )}
            </div>
            <div className="flex-1" />
        </header>
    );
}
