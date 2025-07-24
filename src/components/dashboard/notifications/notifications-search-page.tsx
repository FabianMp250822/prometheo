'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileDown, BellRing, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReportNotifications } from '@/services/provired-api-service';
import { DocumentViewerModal } from '../document-viewer-modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export function NotificationsSearchPage() {
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState<string | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getReportNotifications();
                if (response.success && Array.isArray(response.data)) {
                    setAllNotifications(response.data);
                } else {
                    throw new Error(response.message || 'Failed to fetch notifications.');
                }
            } catch (err: any) {
                setError(err.message);
                toast({ variant: 'destructive', title: 'Error', description: err.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotifications();
    }, [toast]);

    const filteredNotifications = useMemo(() => {
        if (!searchTerm) {
            return allNotifications;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return allNotifications.filter(n =>
            n.demandante?.toLowerCase().includes(lowercasedTerm) ||
            n.demandado?.toLowerCase().includes(lowercasedTerm) ||
            n.radicacion?.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, allNotifications]);

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
                            Busque notificaciones por demandante, demandado o número de radicación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Escriba para buscar..."
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
                            {isLoading ? 'Cargando...' : `${filteredNotifications.length} notificaciones encontradas.`}
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
                                        {filteredNotifications.length > 0 ? (
                                            filteredNotifications.map((n) => (
                                                <TableRow key={`${n.notificacion}-${n.radicacion}`}>
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
                                                    No se encontraron notificaciones con los criterios de búsqueda.
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
