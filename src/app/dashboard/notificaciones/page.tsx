
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileDown, BellRing, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerModal } from '@/components/dashboard/document-viewer-modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collection, getDocs, query, where, or, limit, orderBy, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Notification {
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

    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchNotifications = useCallback(async (loadMore = false) => {
        if (debouncedSearchTerm) return; // Don't fetch if searching
        
        if (!loadMore) {
            setIsLoading(true);
            setNotifications([]);
            setLastDoc(null);
            setHasMore(true);
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

            if (loadMore && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const newNotifications = snapshot.docs.map(doc => doc.data() as Notification);
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            
            setLastDoc(lastVisible || null);
            setHasMore(newNotifications.length === ITEMS_PER_PAGE);
            setNotifications(prev => loadMore ? [...prev, ...newNotifications] : newNotifications);

        } catch (err: any) {
             console.error("Error fetching notifications:", err);
             setError("Ocurrió un error al cargar las notificaciones. Asegúrese de que los índices de Firestore estén creados (ej: provired_notifications por fechaPublicacion desc).");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [lastDoc, debouncedSearchTerm]);


    useEffect(() => {
        const searchNotifications = async () => {
            if (debouncedSearchTerm.length < 3) {
                 if(debouncedSearchTerm === '') fetchNotifications(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            setNotifications([]);

            try {
                const notificationsRef = collection(db, "provired_notifications");
                const searchLower = debouncedSearchTerm.toLowerCase();
                const q = query(
                    notificationsRef,
                    or(
                        where("demandante_lower", ">=", searchLower),
                        where("demandante_lower", "<=", searchLower + '\uf8ff'),
                        where("demandado_lower", ">=", searchLower),
                        where("demandado_lower", "<=", searchLower + '\uf8ff'),
                        where("radicacion", ">=", debouncedSearchTerm),
                        where("radicacion", "<=", debouncedSearchTerm + '\uf8ff')
                    ),
                    limit(ITEMS_PER_PAGE)
                );

                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(doc => doc.data() as Notification);
                setNotifications(results);
                setHasMore(false); // Disable pagination for search results
                
            } catch (err: any) {
                console.error("Error searching notifications:", err);
                setError("Ocurrió un error al buscar en Firebase.");
                toast({ variant: 'destructive', title: 'Error de Búsqueda', description: err.message });
            } finally {
                setIsLoading(false);
            }
        };

        if (debouncedSearchTerm) {
            searchNotifications();
        } else {
            fetchNotifications(false);
        }
    }, [debouncedSearchTerm, fetchNotifications, toast]);

    const handleViewDocument = (url: string, title: string) => {
        setDocumentUrl(url);
        setDocumentTitle(title);
    };

    return (
        <>
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <BellRing className="h-6 w-6" />
                            Archivo de Notificaciones
                        </CardTitle>
                        <CardDescription>
                            Explore el historial de notificaciones de Provired o busque por demandante, demandado o radicación.
                        </CardDescription>
                    </CardHeader>
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
                        {isLoading ? (
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
                                            notifications.map((n, index) => (
                                                <TableRow key={`${n.notificacion}-${n.radicacion}-${index}`}>
                                                    <TableCell className="font-medium whitespace-nowrap">{n.fechaPublicacion}</TableCell>
                                                    <TableCell>{n.demandante}</TableCell>
                                                    <TableCell>{n.demandado}</TableCell>
                                                    <TableCell>{n.radicacion}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-sm">{n.descripcion}</TableCell>
                                                    <TableCell className="text-right">
                                                        {n.rutaAuto && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewDocument(n.rutaAuto, `PDF Proceso ${n.radicacion}`)}
                                                            >
                                                                <FileDown className="mr-2 h-4 w-4" /> Ver
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
                            {!debouncedSearchTerm && hasMore && (
                                <div className="pt-4 flex justify-center">
                                    <Button onClick={() => fetchNotifications(true)} disabled={isLoadingMore}>
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
            {documentUrl && (
                <DocumentViewerModal
                    url={documentUrl}
                    title={documentTitle || "Visor de Documento"}
                    onClose={() => setDocumentUrl(null)}
                />
            )}
        </>
    );
}
