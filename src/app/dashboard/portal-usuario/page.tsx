
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldQuestion, Briefcase, FileSignature, MessageSquare, User, Hash, Sigma, TrendingDown, TrendingUp, Handshake, Info } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, collectionGroup } from 'firebase/firestore';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/helpers';
import { SupportChat } from '@/components/dashboard/portal-usuario/support-chat';
import { PaymentManager } from '@/components/dashboard/portal-usuario/payment-manager';

function InfoField({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-1">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value || 'N/A'}</p>
            </div>
        </div>
    );
}

export default function PortalUsuarioPage() {
    const { user } = useAuth();
    const [clientData, setClientData] = useState<{ client: DajusticiaClient; payments: DajusticiaPayment[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClientData = useCallback(async () => {
        if (!user || !user.email) {
            setError("No se pudo identificar al usuario.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Find the client document using their email
            const clientQuery = query(collection(db, "nuevosclientes"), where("correo", "==", user.email), limit(1));
            const clientSnapshot = await getDocs(clientQuery);

            if (clientSnapshot.empty) {
                throw new Error("No se encontró un perfil de cliente asociado a este usuario.");
            }

            const clientDoc = clientSnapshot.docs[0];
            const client = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;

            // Fetch payments from subcollection
            const paymentsQuery = query(collection(db, "nuevosclientes", client.id, "pagos"));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DajusticiaPayment));
            
            setClientData({ client, payments });

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchClientData();
    }, [fetchClientData]);

    const summary = React.useMemo(() => {
        if (!clientData) return { totalPagado: 0, saldoPendiente: 0 };
        const totalPagado = clientData.payments.reduce((acc, pago) => acc + pago.monto, 0);
        const saldoPendiente = clientData.client.salario - totalPagado;
        return { totalPagado, saldoPendiente };
    }, [clientData]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (!clientData) {
        return (
             <div className="p-8">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Sin Datos</AlertTitle>
                    <AlertDescription>No se encontró información de cliente. Si cree que esto es un error, por favor contacte a soporte.</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const { client } = clientData;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <ShieldQuestion className="h-6 w-6" />
                        Bienvenido a su Portal, {client.nombres}
                    </CardTitle>
                    <CardDescription>
                        Aquí puede consultar el estado de su cuenta, gestionar sus pagos y comunicarse con nosotros.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="resumen"><Briefcase className="mr-2 h-4 w-4" /> Resumen</TabsTrigger>
                    <TabsTrigger value="pagos"><FileSignature className="mr-2 h-4 w-4" /> Mis Pagos</TabsTrigger>
                    <TabsTrigger value="soporte"><MessageSquare className="mr-2 h-4 w-4" /> Soporte</TabsTrigger>
                </TabsList>
                
                <TabsContent value="resumen" className="mt-4 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Información Personal</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoField icon={<Hash />} label="Cédula" value={client.cedula} />
                            <InfoField icon={<User />} label="Nombre Completo" value={`${client.nombres} ${client.apellidos}`} />
                             <InfoField icon={<Handshake className="text-primary" />} label="Abogado Asignado" value="Dr. Robinson Rada Gonzalez" />
                        </CardContent>
                    </Card>
                     <Card className="border-accent">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2 text-accent">
                                <Briefcase className="h-5 w-5" /> Resumen del Acuerdo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid md:grid-cols-3 gap-6 text-sm">
                                <div><p className="text-sm text-muted-foreground">Monto Total Acuerdo</p><p className="font-bold text-lg">{formatCurrency(client.salario || 0)}</p></div>
                                <div><p className="text-sm text-muted-foreground">Plazo</p><p className="font-bold text-lg">{client.plazoMeses} meses</p></div>
                                <div><p className="text-sm text-muted-foreground">Cuota Mensual</p><p className="font-bold text-lg">{formatCurrency(parseFloat(client.cuotaMensual || '0'))}</p></div>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/50">
                                    <p className="text-sm text-green-800 dark:text-green-300">Total Pagado</p>
                                    <p className="font-bold text-xl text-green-700 dark:text-green-200">{formatCurrency(summary.totalPagado)}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/50">
                                    <p className="text-sm text-red-800 dark:text-red-300">Saldo Pendiente</p>
                                    <p className="font-bold text-xl text-red-700 dark:text-red-200">{formatCurrency(summary.saldoPendiente)}</p>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pagos" className="mt-4">
                    <PaymentManager client={client} />
                </TabsContent>
                
                <TabsContent value="soporte" className="mt-4">
                    <SupportChat />
                </TabsContent>
            </Tabs>
        </div>
    );
}
