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
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Pensioner[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const searchPensioners = useCallback(async (searchVal: string) => {
        if (searchVal.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const isNumeric = /^\d+$/.test(searchVal);
            let pensionersQuery;

            if (isNumeric) {
                pensionersQuery = query(
                    collection(db, "pensionados"),
                    where("documento", ">=", searchVal),
                    where("documento", "<=", searchVal + '\uf8ff'),
                    limit(10)
                );
            } else {
                pensionersQuery = query(
                    collection(db, "pensionados"),
                    where("empleado", ">=", searchVal.toUpperCase()),
                    where("empleado", "<=", searchVal.toUpperCase() + '\uf8ff'),
                    limit(10)
                );
            }

            const querySnapshot = await getDocs(pensionersQuery);
            const pensionersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            setSearchResults(pensionersData);

        } catch (error) {
            console.error("Error searching pensioners:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        searchPensioners(debouncedSearchTerm);
    }, [debouncedSearchTerm, searchPensioners]);

    const handleSelect = (pensioner: Pensioner) => {
        setSelectedPensioner(pensioner);
        setOpen(false);
        setSearchTerm('');
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
                            <User className="mr-2 h-4 w-4" />
                            {selectedPensioner
                                ? parseEmployeeName(selectedPensioner.empleado)
                                : "Seleccionar pensionado..."}
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
                        <span className="font-semibold text-foreground">Documento:</span> {selectedPensioner.documento} | <span className="font-semibold text-foreground">Dependencia:</span> {selectedPensioner.dependencia1}
                    </div>
                )}
            </div>
            <div className="flex-1" />
            {/* Could add more header elements here */}
        </header>
    );
}
