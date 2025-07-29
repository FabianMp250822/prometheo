
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, BellOff, FileDown } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface Office {
    IdDes: string;
    despacho: string;
}

interface Notification {
    fechaPublicacion: string;
    demandante: string;
    demandado: string;
    descripcion: string;
    rutaAuto: string;
    [key: string]: any;
}

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    office: Office | null;
    notifications: Notification[];
    isLoading: boolean;
}

export function NotificationsModal({ isOpen, onClose, office, notifications, isLoading }: NotificationsModalProps) {

    if (!office) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Notificaciones para: {office.despacho}</DialogTitle>
                        <DialogDescription>
                            Lista de notificaciones encontradas para este despacho.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : notifications.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha Pub.</TableHead>
                                            <TableHead>Demandante</TableHead>
                                            <TableHead>Demandado</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">PDF</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notifications.map((notif, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="text-xs align-top">{notif.fechaPublicacion}</TableCell>
                                                <TableCell className="font-medium align-top">{notif.demandante}</TableCell>
                                                <TableCell className="align-top">{notif.demandado}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground align-top">{notif.descripcion}</TableCell>
                                                <TableCell className="text-right align-top">
                                                    {notif.rutaAuto && (
                                                        <Button asChild variant="ghost" size="icon">
                                                          <a href={notif.rutaAuto} target="_blank" rel="noopener noreferrer">
                                                            <FileDown className="h-4 w-4 text-primary" />
                                                          </a>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <BellOff className="h-12 w-12 mb-4" />
                                    <h3 className="text-lg font-semibold">Sin Notificaciones</h3>
                                    <p>No se encontraron notificaciones para este despacho.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
