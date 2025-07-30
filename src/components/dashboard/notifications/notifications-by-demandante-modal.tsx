'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileDown, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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

interface GroupedNotification {
    demandante: string;
    notifications: Notification[];
}

interface NotificationsByDemandanteModalProps {
    isOpen: boolean;
    onClose: () => void;
    demandante: GroupedNotification | null;
}

export function NotificationsByDemandanteModal({ isOpen, onClose, demandante }: NotificationsByDemandanteModalProps) {

    if (!demandante) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Actuaciones de: {demandante.demandante}</DialogTitle>
                    <DialogDescription>
                        <Badge variant="secondary">{demandante.notifications.length} actuaciones encontradas.</Badge>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden border rounded-md">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Proceso</TableHead>
                                    <TableHead>Radicación</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-right">PDF</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {demandante.notifications.map((notif, index) => (
                                    <TableRow key={notif.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">{notif.fechaPublicacion}</TableCell>
                                        <TableCell>{notif.proceso}</TableCell>
                                        <TableCell>{notif.radicacion}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{notif.descripcion}</TableCell>
                                        <TableCell className="text-right">
                                            {notif.rutaAuto ? (
                                                <Button asChild variant="ghost" size="icon">
                                                    <Link href={notif.rutaAuto} target="_blank" rel="noopener noreferrer">
                                                        <FileDown className="h-4 w-4 text-primary" />
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <FileText className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
