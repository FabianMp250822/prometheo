
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Pensioner } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, User, Search, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseEmployeeName } from '@/lib/helpers';

interface PensionerSearchProps {
    onPensionerSelect: (pensioner: Pensioner | null) => void;
}

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

export function PensionerSearch({ onPensionerSelect }: PensionerSearchProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Pensioner[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedValue, setSelectedValue] = useState<Pensioner | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const searchPensioners = useCallback(async (searchVal: string) => {
        setIsSearching(true);
        try {
            const pensionersRef = collection(db, 'pensionados');
            const searchTermUpper = searchVal.toUpperCase();

            const docQuery = query(
                pensionersRef,
                where('documento', '>=', searchVal),
                where('documento', '<=', searchVal + '\uf8ff'),
                limit(10)
            );

            const nameQuery = query(
                pensionersRef,
                where('empleado', '>=', searchTermUpper),
                where('empleado', '<=', searchTermUpper + '\uf8ff'),
                limit(10)
            );

            const [docSnapshot, nameSnapshot] = await Promise.all([
                getDocs(docQuery),
                getDocs(nameQuery),
            ]);
            
            const combinedResults: Map<string, Pensioner> = new Map();
            docSnapshot.forEach(doc => combinedResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner));
            nameSnapshot.forEach(doc => combinedResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner));

            setSearchResults(Array.from(combinedResults.values()));
        } catch (error) {
            console.error("Error searching pensioners:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (debouncedSearchTerm.length >= 3) {
            searchPensioners(debouncedSearchTerm);
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearchTerm, searchPensioners]);

    const handleSelect = (pensioner: Pensioner) => {
        setSelectedValue(pensioner);
        setOpen(false);
        setSearchTerm('');
        setSearchResults([]);
        onPensionerSelect(pensioner);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full md:w-[400px] justify-between"
                >
                    <Search className="mr-2 h-4 w-4" />
                    {selectedValue
                        ? parseEmployeeName(selectedValue.empleado)
                        : "Buscar pensionado para analizar..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
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
    );
}
