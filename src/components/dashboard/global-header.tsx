'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePensioner } from '@/context/pensioner-provider';
import { Pensioner } from '@/lib/data';
import { parseEmployeeName } from '@/lib/helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, User, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';


function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function GlobalHeader() {
    const { selectedPensioner, setSelectedPensioner } = usePensioner();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Pensioner[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const searchGlobal = useCallback(async (searchVal: string) => {
        if (searchVal.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const isNumeric = /^\d+$/.test(searchVal);
            const searchPromises = [];

            // Stage 1: Search in 'pensionados' collection
            if (isNumeric) {
                const docQuery = query(
                    collection(db, "pensionados"),
                    where("documento", ">=", searchVal),
                    where("documento", "<=", searchVal + '\uf8ff'),
                    limit(10)
                );
                searchPromises.push(getDocs(docQuery));
            }
            const nameQuery = query(
                collection(db, "pensionados"),
                where("empleado", ">=", searchVal.toUpperCase()),
                where("empleado", "<=", searchVal.toUpperCase() + '\uf8ff'),
                limit(10)
            );
            searchPromises.push(getDocs(nameQuery));
            
            // Stage 2: Search in 'procesos' collection
            if (isNumeric) {
                const idClienteQuery = query(
                    collection(db, "procesos"),
                    where("identidad_clientes", ">=", searchVal),
                    where("identidad_clientes", "<=", searchVal + '\uf8ff'),
                    limit(10)
                );
                searchPromises.push(getDocs(idClienteQuery));
            }
            const demandanteQuery = query(
                collection(db, "procesos"),
                where("nombres_demandante", ">=", searchVal.toUpperCase()),
                where("nombres_demandante", "<=", searchVal.toUpperCase() + '\uf8ff'),
                limit(10)
            );
            searchPromises.push(getDocs(demandanteQuery));


            const snapshots = await Promise.all(searchPromises);
            
            const pensionersData = snapshots.flatMap(snapshot =>
                snapshot.docs
                .filter(doc => doc.data().documento || doc.data().identidad_clientes) // Filter out docs without an ID
                .map(doc => {
                    const data = doc.data();
                    if ('empleado' in data) { // It's from 'pensionados'
                        return { id: doc.id, ...data } as Pensioner;
                    }
                    // It's from 'procesos', adapt it
                    return {
                        id: data.identidad_clientes || doc.id,
                        documento: data.identidad_clientes,
                        empleado: data.nombres_demandante,
                        dependencia1: data.jurisdiccion || 'N/A',
                        centroCosto: 'N/A',
                        // Add other required Pensioner fields with default values
                    } as Pensioner;
                })
            );
            
            // Remove duplicates based on the document/ID
            const uniqueResults = Array.from(new Map(pensionersData.map(p => [p.documento, p])).values());

            setSearchResults(uniqueResults);

        } catch (error) {
            console.error("Error searching:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        searchGlobal(debouncedSearchTerm);
    }, [debouncedSearchTerm, searchGlobal]);

    const handleSelect = (pensioner: Pensioner) => {
        setSelectedPensioner(pensioner);
        setOpen(false);
        setSearchTerm('');
        router.push('/dashboard/pensionado');
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-4">
                 <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[300px] justify-between"
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
                                            value={pensioner.documento}
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
            {/* Could add more header elements here */}
        </header>
    );
}
