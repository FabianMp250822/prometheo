'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileDown, BellRing, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collection, getDocs, query, where, or, limit, orderBy, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { syncProviredNotifications } from '@/services/provired-api-service';

interface Notification {
    id: string;
    notificacion: string;
    fechaPublicacion: string;
    demandante: string;
    demandado: string;
    descripcion: string;
    proceso: string;
    radicacion: string;
    rutaAuto: string;
}

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

export default function NotificacionesPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const { toast } = useToast();

    // Sync state
    const [isSyncing, startSyncTransition] = useTransition();
    const [syncMessage, setSyncMessage] = useState('');


    const fetchPaginatedNotifications = useCallback(async (cursor?: QueryDocumentSnapshot<DocumentData> | null) => {
        const loadMore = !!cursor;
        if (!loadMore) {
            setIsLoading(true);
            setLastDoc(null);
        } else {
            setIsLoadingMore(true);
        }
        setError(null);

        try {
            let q = query(
                collection(db, "provired_notifications"),
                orderBy("fechaPublicacion", "desc"),
                limit(ITEMS_PER_PAGE)
            );

            if (loadMore && cursor) {
                q = query(q, startAfter(cursor));
            }

            const snapshot = await getDocs(q);
            const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];

            setLastDoc(lastVisible || null);
            setHasMore(newNotifications.length === ITEMS_PER_PAGE);

            if (loadMore) {
                setNotifications(prev => [...prev, ...newNotifications]);
            } else {
                setNotifications(newNotifications);
            }

        } catch (err: any) {
            console.error("Error fetching notifications:", err);
            setError("Ocurrió un error al cargar las notificaciones. Asegúrese de que los índices de Firestore estén creados.");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    const searchNotificationsInFirebase = useCallback(async (searchVal: string) => {
        setIsLoading(true);
        setError(null);
        setNotifications([]);
        setHasMore(false);

        try {
            const notificationsRef = collection(db, "provired_notifications");
            const searchLower = searchVal.toLowerCase();
            
            const demandanteQuery = query(notificationsRef, where("demandante_lower", ">=", searchLower), where("demandante_lower", "<=", searchLower + '\uf8ff'), limit(ITEMS_PER_PAGE));
            const demandadoQuery = query(notificationsRef, where("demandado_lower", ">=", searchLower), where("demandado_lower", "<=", searchLower + '\uf8ff'), limit(ITEMS_PER_PAGE));
            const radicacionQuery = query(notificationsRef, where("radicacion", ">=", searchVal), where("radicacion", "<=", searchVal + '\uf8ff'), limit(ITEMS_PER_PAGE));
            const procesoQuery = query(notificationsRef, where("proceso", ">=", searchVal.toUpperCase()), where("proceso", "<=", searchVal.toUpperCase() + '\uf8ff'), limit(ITEMS_PER_PAGE));


            const [demandanteSnap, demandadoSnap, radicacionSnap, procesoSnap] = await Promise.all([
                getDocs(demandanteQuery),
                getDocs(demandadoQuery),
                getDocs(radicacionQuery),
                getDocs(procesoQuery),
            ]);

            const resultsMap = new Map<string, Notification>();
            const addResultsToMap = (snapshot: any) => {
                 snapshot.docs.forEach((doc: any) => {
                    if (!resultsMap.has(doc.id)) {
                        resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as Notification);
                    }
                });
            }
            
            addResultsToMap(demandanteSnap);
            addResultsToMap(demandadoSnap);
            addResultsToMap(radicacionSnap);
            addResultsToMap(procesoSnap);
            
            const combinedResults = Array.from(resultsMap.values())
              .sort((a, b) => new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime());

            setNotifications(combinedResults);

        } catch (err: any) {
            console.error("Error searching notifications:", err);
            setError("Ocurrió un error al buscar en Firebase. Es posible que falten índices para los campos de búsqueda.");
            toast({ variant: 'destructive', title: 'Error de Búsqueda', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);


    useEffect(() => {
        if (debouncedSearchTerm.length >= 3) {
            searchNotificationsInFirebase(debouncedSearchTerm);
        } else if (debouncedSearchTerm.length === 0) {
            fetchPaginatedNotifications();
        }
    }, [debouncedSearchTerm, fetchPaginatedNotifications, searchNotificationsInFirebase]);

    const handleSync = () => {
        startSyncTransition(async () => {
            setSyncMessage('Iniciando sincronización, por favor espere...');
            toast({ title: 'Sincronización Iniciada', description: 'Obteniendo todas las notificaciones. Este proceso puede tardar varios minutos.' });

            const result = await syncProviredNotifications();

            if (result.success) {
                toast({ title: 'Sincronización Completa', description: `${result.count} notificaciones fueron procesadas.` });
                fetchPaginatedNotifications();
            } else {
                toast({ variant: 'destructive', title: 'Error de Sincronización', description: result.message });
                setError(result.message || 'Ocurrió un error desconocido.');
            }
             setTimeout(() => {
                setSyncMessage('');
            }, 5000);
        });
    };

    return (
        <>
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div>
                            <CardTitle className="text-2xl font-headline flex items-center gap-2">
                                <BellRing className="h-6 w-6" />
                                Archivo de Notificaciones
                            </CardTitle>
                            <CardDescription>
                                Explore el historial de notificaciones o busque por demandante, demandado o radicación.
                            </CardDescription>
                        </div>
                        <Button onClick={handleSync} disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Sincronizar Notificaciones
                        </Button>
                    </CardHeader>
                     {isSyncing && (
                        <CardContent>
                            <div className="flex items-center gap-4">
                               <Loader2 className="h-4 w-4 animate-spin" />
                               <p className="text-sm text-muted-foreground">{syncMessage}</p>
                            </div>
                        </CardContent>
                    )}
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Escriba para buscar (mín. 3 caracteres)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resultados</CardTitle>
                        <CardDescription>
                             {isLoading ? 'Cargando...' : `${notifications.length} notificaciones mostradas.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && notifications.length === 0 ? (
                            <div className="flex justify-center items-center p-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                        ) : error ? (
                             <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error al Cargar Datos</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : (
                            <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha Pub.</TableHead>
                                            <TableHead>Demandante</TableHead>
                                            <TableHead>Demandado</TableHead>
                                            <TableHead>Radicación</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">PDF</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <TableRow key={n.id}>
                                                    <TableCell className="font-medium whitespace-nowrap">{n.fechaPublicacion}</TableCell>
                                                    <TableCell>{n.demandante}</TableCell>
                                                    <TableCell>{n.demandado}</TableCell>
                                                    <TableCell>{n.radicacion}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-sm">{n.descripcion}</TableCell>
                                                    <TableCell className="text-right">
                                                        {n.rutaAuto && (
                                                            <Button asChild variant="outline" size="sm">
                                                                <a href={n.rutaAuto} target="_blank" rel="noopener noreferrer">
                                                                    <FileDown className="mr-2 h-4 w-4" /> Ver
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    {searchTerm ? "No se encontraron resultados para su búsqueda." : "No hay notificaciones para mostrar."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {hasMore && !debouncedSearchTerm && (
                                <div className="pt-4 flex justify-center">
                                    <Button onClick={() => fetchPaginatedNotifications(lastDoc)} disabled={isLoadingMore}>
                                        {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Cargar más
                                    </Button>
                                </div>
                            )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
