
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy, limit, startAfter, endBefore, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface Prospecto {
    id: string;
    nombre: string;
    apellidos: string;
    cedula: string;
    celular: string;
    correo: string;
    fechaRegistro?: any; // Can be a Firebase Timestamp
}

const ITEMS_PER_PAGE = 15;

export default function ProspectosPage() {
    const { toast } = useToast();
    const [prospectos, setProspectos] = useState<Prospecto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchProspectos = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
        setIsLoading(true);
        try {
            let q;
            const prospectosRef = collection(db, 'prospectos');
            const baseQuery = query(prospectosRef, orderBy('nombre'), limit(ITEMS_PER_PAGE));

            if (direction === 'next' && lastVisible) {
                q = query(prospectosRef, orderBy('nombre'), startAfter(lastVisible), limit(ITEMS_PER_PAGE));
            } else if (direction === 'prev' && firstVisible) {
                q = query(prospectosRef, orderBy('nombre', 'desc'), startAfter(firstVisible), limit(ITEMS_PER_PAGE));
            } else {
                q = baseQuery;
            }

            const querySnapshot = await getDocs(q);
            const prospectosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prospecto));

            if (direction === 'prev') {
                prospectosData.reverse(); // Since we queried backwards
            }

            if (!querySnapshot.empty) {
                setFirstVisible(querySnapshot.docs[0]);
                setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
                setProspectos(prospectosData);
                if (direction === 'next') setCurrentPage(p => p + 1);
                if (direction === 'prev') setCurrentPage(p => p - 1);
                if (direction === 'first') setCurrentPage(1);
            } else if (direction !== 'first') {
                // If we are trying to go next/prev and get no results, stay on the same page
                toast({ variant: 'default', title: 'Fin de la Lista', description: 'No hay más registros para mostrar.' });
            } else {
                setProspectos([]);
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los prospectos.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast, lastVisible, firstVisible]);

    useEffect(() => {
        // Initial fetch
        fetchProspectos();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredProspectos = prospectos.filter(p => 
        `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm) ||
        p.correo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Gestión de Prospectos
                    </CardTitle>
                    <CardDescription>
                        Lista de usuarios que se han registrado a través del formulario público.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                 <CardHeader>
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, cédula o correo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Cédula</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Fecha de Registro</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProspectos.length > 0 ? (
                                    filteredProspectos.map(prospecto => (
                                        <TableRow key={prospecto.id}>
                                            <TableCell className="font-medium">{prospecto.nombre} {prospecto.apellidos}</TableCell>
                                            <TableCell>{prospecto.cedula}</TableCell>
                                            <TableCell>
                                                <div>{prospecto.correo}</div>
                                                <div className="text-xs text-muted-foreground">{prospecto.celular}</div>
                                            </TableCell>
                                            <TableCell>{prospecto.fechaRegistro ? format(prospecto.fechaRegistro.toDate(), 'PPpp') : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No se encontraron prospectos.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchProspectos('prev')}
                                disabled={currentPage <= 1 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4"/>
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchProspectos('next')}
                                disabled={!lastVisible || isLoading || prospectos.length < ITEMS_PER_PAGE}
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4"/>
                            </Button>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
