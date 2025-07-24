'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Search, UserCheck, Loader2 } from 'lucide-react';
import type { DajusticiaClient } from '@/lib/data';
import { GenerarContratoModal } from '@/components/dashboard/generar-contrato-modal';
import { GenerarPoderModal } from '@/components/dashboard/generar-poder-modal';

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

export default function DocumentosSoportePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<DajusticiaClient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    const [selectedClient, setSelectedClient] = useState<DajusticiaClient | null>(null);
    const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
    const [isPoderModalOpen, setIsPoderModalOpen] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const searchClients = useCallback(async (searchVal: string) => {
        if (searchVal.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const clientsRef = collection(db, "nuevosclientes");
            const nameQuery = query(
                clientsRef,
                where("nombres", ">=", searchVal.toUpperCase()),
                where("nombres", "<=", searchVal.toUpperCase() + '\uf8ff'),
                limit(10)
            );
            const cedulaQuery = query(
                clientsRef,
                where("cedula", ">=", searchVal),
                where("cedula", "<=", searchVal + '\uf8ff'),
                limit(10)
            );

            const [nameSnapshot, cedulaSnapshot] = await Promise.all([getDocs(nameQuery), getDocs(cedulaQuery)]);
            
            const clientsData = new Map<string, DajusticiaClient>();
            nameSnapshot.forEach(doc => clientsData.set(doc.id, { id: doc.id, ...doc.data() } as DajusticiaClient));
            cedulaSnapshot.forEach(doc => clientsData.set(doc.id, { id: doc.id, ...doc.data() } as DajusticiaClient));
            
            setSearchResults(Array.from(clientsData.values()));

        } catch (error) {
            console.error("Error searching clients:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        searchClients(debouncedSearchTerm);
    }, [debouncedSearchTerm, searchClients]);

    const handleSelectClient = (client: DajusticiaClient) => {
        setSelectedClient(client);
        setSearchTerm(`${client.nombres} ${client.apellidos}`);
        setIsDropdownVisible(false);
    };
    
    const clientInfo = useMemo(() => {
        if (!selectedClient) return null;
        return [
            { label: 'Nombres', value: selectedClient.nombres },
            { label: 'Apellidos', value: selectedClient.apellidos },
            { label: 'Cédula', value: selectedClient.cedula },
            { label: 'Celular', value: selectedClient.celular },
            { label: 'Correo', value: selectedClient.correo },
            { label: 'Dirección', value: selectedClient.direccion },
            { label: 'Grupo', value: selectedClient.grupo },
        ];
    }, [selectedClient]);

    return (
        <>
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <FileText className="h-6 w-6" />
                            Documentos de Soporte
                        </CardTitle>
                        <CardDescription>
                            Busque un cliente para generar contratos, poderes y otros documentos de soporte.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">1. Buscar Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o cédula..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsDropdownVisible(true);
                                }}
                                onBlur={() => setTimeout(() => setIsDropdownVisible(false), 150)}
                                onFocus={() => setIsDropdownVisible(true)}
                                className="pl-10"
                            />
                            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                             {isDropdownVisible && searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map(client => (
                                        <div
                                            key={client.id}
                                            className="p-3 cursor-pointer hover:bg-muted"
                                            onClick={() => handleSelectClient(client)}
                                        >
                                            <p className="font-medium">{client.nombres} {client.apellidos}</p>
                                            <p className="text-sm text-muted-foreground">C.C. {client.cedula}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 {selectedClient && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-600"/>Cliente Seleccionado</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {clientInfo?.map(info => (
                                <div key={info.label}>
                                    <p className="font-semibold text-muted-foreground">{info.label}</p>
                                    <p>{info.value}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                
                <Card>
                     <CardHeader>
                        <CardTitle className="text-xl">2. Generar Documentos</CardTitle>
                        <CardDescription>Seleccione el tipo de documento que desea generar para el cliente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="flex flex-wrap gap-4">
                            <Button onClick={() => setIsContratoModalOpen(true)} disabled={!selectedClient}>
                                Generar Contrato
                            </Button>
                            <Button onClick={() => setIsPoderModalOpen(true)} disabled={!selectedClient} variant="secondary">
                                Generar Poder
                            </Button>
                             <Button disabled>
                                Generar Otro Documento (Próximamente)
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {isContratoModalOpen && selectedClient && (
                <GenerarContratoModal 
                    cliente={selectedClient} 
                    onClose={() => setIsContratoModalOpen(false)}
                />
            )}
             {isPoderModalOpen && selectedClient && (
                <GenerarPoderModal 
                    cliente={selectedClient} 
                    onClose={() => setIsPoderModalOpen(false)}
                />
            )}
        </>
    );
}
