
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileDown, BellRing, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerModal } from '@/components/dashboard/document-viewer-modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, getDocs, query, where, or, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Notification {
    notificacion: string; // Unique ID for notification
    fechaPublicacion: string;
    demandante: string;
    demandado: string;
    descripcion: string;
    proceso: string;
    radicacion: string;
    rutaAuto: string;
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState<string | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        const fetchNotificationsFromFirebase = async () => {
            if (debouncedSearchTerm.length < 3) {
                setNotifications([]);
                if (debouncedSearchTerm === '') setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
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
                    limit(50) // Limit results for performance
                );

                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(doc => doc.data() as Notification);
                setNotifications(results);
                
            } catch (err: any) {
                console.error("Error searching notifications:", err);
                setError("Ocurrió un error al buscar en Firebase. Asegúrese de que los índices necesarios estén creados.");
                toast({ variant: 'destructive', title: 'Error de Búsqueda', description: err.message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotificationsFromFirebase();
    }, [debouncedSearchTerm, toast]);

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
                            Búsqueda de Notificaciones
                        </CardTitle>
                        <CardDescription>
                            Busque en el archivo de notificaciones de Firebase por demandante, demandado o número de radicación.
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
                            {isLoading ? 'Buscando...' : `${notifications.length} notificaciones encontradas.`}
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
                            <ScrollArea className="h-[60vh]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>Demandante</TableHead>
                                            <TableHead>Demandado</TableHead>
                                            <TableHead>Radicación</TableHead>
                                            <TableHead>Proceso</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notifications.length > 0 ? (
                                            notifications.map((n, index) => (
                                                <TableRow key={`${n.notificacion}-${n.radicacion}-${index}`}>
                                                    <TableCell className="font-medium">{n.demandante}</TableCell>
                                                    <TableCell>{n.demandado}</TableCell>
                                                    <TableCell>{n.radicacion}</TableCell>
                                                    <TableCell>{n.proceso}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-sm">{n.descripcion}</TableCell>
                                                    <TableCell className="text-right">
                                                        {n.rutaAuto && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewDocument(n.rutaAuto, `PDF Proceso ${n.radicacion}`)}
                                                            >
                                                                <FileDown className="mr-2 h-4 w-4" /> Ver PDF
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    {debouncedSearchTerm.length < 3 ? "Ingrese al menos 3 caracteres para buscar." : "No se encontraron notificaciones."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
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
