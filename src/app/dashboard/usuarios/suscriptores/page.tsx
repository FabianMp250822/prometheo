
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Subscriber {
    id: string;
    email: string;
    subscribedAt?: any; // Can be a Firebase Timestamp
}

export default function SuscriptoresPage() {
    const { toast } = useToast();
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSubscribers = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'suscriptores_boletin'), orderBy('subscribedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const subscribersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email,
                subscribedAt: doc.data().subscribedAt,
            } as Subscriber));
            setSubscribers(subscribersData);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los suscriptores.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSubscribers();
    }, [fetchSubscribers]);

    const formatSubscriptionDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate();
            return format(date, 'd MMMM, yyyy, h:mm a', { locale: es });
        } catch (error) {
            return 'Fecha inválida';
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-headline flex items-center gap-2">
                                <MailCheck className="h-6 w-6" />
                                Suscriptores al Boletín
                            </CardTitle>
                            <CardDescription>
                                Lista de correos electrónicos suscritos al boletín informativo.
                            </CardDescription>
                        </div>
                         <Button onClick={fetchSubscribers} variant="outline" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Refrescar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Correo Electrónico</TableHead>
                                    <TableHead>Fecha de Suscripción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscribers.length > 0 ? (
                                    subscribers.map(subscriber => (
                                        <TableRow key={subscriber.id}>
                                            <TableCell className="font-medium">{subscriber.email}</TableCell>
                                            <TableCell>{formatSubscriptionDate(subscriber.subscribedAt)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            No se encontraron suscriptores.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
