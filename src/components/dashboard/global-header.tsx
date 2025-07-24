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
        setIsSearching(true);
        try {
            const pensionadosRef = collection(db, "pensionados");
            
            // Query for document
            const docQuery = query(pensionadosRef, 
                where("documento", ">=", searchVal), 
                where("documento", "<=", searchVal + '\uf8ff'), 
                limit(15)
            );

            // Query for name (empleado)
            const nameQuery = query(pensionadosRef, 
                where("empleado", ">=", searchVal.toUpperCase()), 
                where("empleado", "<=", searchVal.toUpperCase() + '\uf8ff'), 
                limit(15)
            );

            const [docSnapshot, nameSnapshot] = await Promise.all([
                getDocs(docQuery),
                getDocs(nameQuery)
            ]);

            const combinedResults: Map<string, Pensioner> = new Map();

            docSnapshot.forEach(doc => {
                combinedResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner);
            });
            nameSnapshot.forEach(doc => {
                combinedResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner);
            });

            setSearchResults(Array.from(combinedResults.values()));

        } catch (error) {
            console.error("Error searching pensionados:", error);
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
