'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Eye, BellRing, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collection, getDocs, query, where, or, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotificationsByDemandanteModal } from '@/components/dashboard/notifications/notifications-by-demandante-modal';
import { Badge } from '@/components/ui/badge';

interface Notification {
    id: string;
    notificacion: string;
    fechaPublicacion: string;
    demandante: string;
    demandante_lower: string;
    demandado: string;
    descripcion: string;
    proceso: string;
    radicacion: string;
    rutaAuto: string;
}

interface GroupedNotification {
    demandante: string;
    demandante_lower: string;
    notifications: Notification[];
    lastNotificationDate: string;
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

export default function NotificacionesPage() {
    const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const [selectedDemandante, setSelectedDemandante] = useState<GroupedNotification | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { toast } = useToast();

    const processAndSetNotifications = useCallback((docs: any[]) => {
        const notificationsMap = new Map<string, { demandante: string; demandante_lower: string; notifications: Notification[] }>();
        
        docs.forEach(doc => {
            const notif = { id: doc.id, ...doc.data() } as Notification;
            const key = notif.demandante_lower;
            if (!notificationsMap.has(key)) {
                notificationsMap.set(key, {
                    demandante: notif.demandante,
                    demandante_lower: notif.demandante_lower,
                    notifications: []
                });
            }
            notificationsMap.get(key)!.notifications.push(notif);
        });

        const grouped: GroupedNotification[] = Array.from(notificationsMap.values()).map(group => {
            group.notifications.sort((a, b) => new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime());
            return {
                ...group,
                lastNotificationDate: group.notifications[0].fechaPublicacion
            };
        });
        
        grouped.sort((a, b) => new Date(b.lastNotificationDate).getTime() - new Date(a.lastNotificationDate).getTime());
        setGroupedNotifications(grouped);

    }, []);

    const fetchAllNotifications = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, "provired_notifications"),
                orderBy("fechaPublicacion", "desc"),
                limit(2000) // Fetch a larger set for grouping
            );
            const snapshot = await getDocs(q);
            processAndSetNotifications(snapshot.docs);
        } catch (err: any) {
            console.error("Error fetching notifications:", err);
            setError("Ocurrió un error al cargar las notificaciones. Asegúrese de que los índices de Firestore estén creados.");
        } finally {
            setIsLoading(false);
        }
    }, [processAndSetNotifications]);
    
    const searchNotificationsInFirebase = useCallback(async (searchVal: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const notificationsRef = collection(db, "provired_notifications");
            const searchLower = searchVal.toLowerCase();
            
            const demandanteQuery = query(notificationsRef, where("demandante_lower", ">=", searchLower), where("demandante_lower", "<=", searchLower + '\uf8ff'), limit(50));
            const demandadoQuery = query(notificationsRef, where("demandado_lower", ">=", searchLower), where("demandado_lower", "<=", searchLower + '\uf8ff'), limit(50));

            const [demandanteSnap, demandadoSnap] = await Promise.all([
                getDocs(demandanteQuery),
                getDocs(demandadoQuery),
            ]);

            const resultsMap = new Map<string, any>();
            demandanteSnap.docs.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() }));
            demandadoSnap.docs.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() }));

            processAndSetNotifications(Array.from(resultsMap.values()));

        } catch (err: any) {
            console.error("Error searching notifications:", err);
            setError("Ocurrió un error al buscar. Es posible que falten índices para los campos de búsqueda.");
            toast({ variant: 'destructive', title: 'Error de Búsqueda', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast, processAndSetNotifications]);


    useEffect(() => {
        if (debouncedSearchTerm.length >= 3) {
            searchNotificationsInFirebase(debouncedSearchTerm);
        } else if (debouncedSearchTerm.length === 0) {
            fetchAllNotifications();
        }
    }, [debouncedSearchTerm, fetchAllNotifications, searchNotificationsInFirebase]);

    const handleViewDetails = (group: GroupedNotification) => {
        setSelectedDemandante(group);
        setIsModalOpen(true);
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
                                Explore el historial de notificaciones agrupado por demandante.
                            </CardDescription>
                        </div>
                         <Button onClick={fetchAllNotifications} disabled={isLoading}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refrescar Datos
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por demandante o demandado (mín. 3 caracteres)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Demandantes con Actuaciones</CardTitle>
                        <CardDescription>
                             {isLoading ? 'Cargando...' : `${groupedNotifications.length} demandantes encontrados.`}
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
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Demandante</TableHead>
                                            <TableHead>Demandado</TableHead>
                                            <TableHead>Última Actuación</TableHead>
                                            <TableHead>Nº de Actuaciones</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedNotifications.length > 0 ? (
                                            groupedNotifications.map((group) => (
                                                <TableRow key={group.demandante_lower}>
                                                    <TableCell className="font-medium">{group.demandante}</TableCell>
                                                    <TableCell>{group.notifications[0]?.demandado || 'N/A'}</TableCell>
                                                    <TableCell>{group.lastNotificationDate}</TableCell>
                                                    <TableCell><Badge variant="secondary">{group.notifications.length}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(group)}>
                                                            <Eye className="mr-2 h-4 w-4" /> Ver Actuaciones
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    {searchTerm ? "No se encontraron resultados para su búsqueda." : "No hay notificaciones para mostrar."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {isModalOpen && selectedDemandante && (
                <NotificationsByDemandanteModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    demandante={selectedDemandante}
                />
            )}
        </>
    );
}
