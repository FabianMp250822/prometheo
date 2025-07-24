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

            if (isNumeric) {
                // Search by document number
                const pensionadosDocQuery = query(collection(db, "pensionados"), where("documento", ">=", searchVal), where("documento", "<=", searchVal + '\uf8ff'), limit(5));
                const procesosDocQuery = query(collection(db, "procesos"), where("identidad_clientes", ">=", searchVal), where("identidad_clientes", "<=", searchVal + '\uf8ff'), limit(5));
                searchPromises.push(getDocs(pensionadosDocQuery), getDocs(procesosDocQuery));
            } else {
                // Search by name (case-insensitive by using uppercase)
                const upperSearchVal = searchVal.toUpperCase();
                const pensionadosNameQuery = query(collection(db, "pensionados"), where("empleado", ">=", upperSearchVal), where("empleado", "<=", upperSearchVal + '\uf8ff'), limit(5));
                const procesosNameQuery = query(collection(db, "procesos"), where("nombres_demandante", ">=", upperSearchVal), where("nombres_demandante", "<=", upperSearchVal + '\uf8ff'), limit(5));
                searchPromises.push(getDocs(pensionadosNameQuery), getDocs(procesosNameQuery));
            }

            const [pensionadosSnapshot, procesosSnapshot] = await Promise.all(searchPromises);

            const fromPensionados = pensionadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));

            const fromProcesos = procesosSnapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: data.identidad_clientes || doc.id,
                    documento: data.identidad_clientes,
                    empleado: data.nombres_demandante,
                    dependencia1: data.jurisdiccion || 'N/A',
                    centroCosto: 'N/A',
                 } as Pensioner
            });
            
            const combinedResults = [...fromPensionados, ...fromProcesos];
            const uniqueResults = Array.from(new Map(combinedResults.map(p => [p.documento, p])).values());

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
