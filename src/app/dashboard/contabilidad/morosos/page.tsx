
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserMinus, Send, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatFirebaseTimestamp } from '@/lib/helpers';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getFunctions, httpsCallable } from "firebase/functions";

interface ClientWithPayments extends DajusticiaClient {
  pagos: DajusticiaPayment[];
}

// Initialize functions
const functions = getFunctions();
const sendPaymentReminderCallable = httpsCallable(functions, 'sendPaymentReminder');

export default function MorososPage() {
  const [clients, setClients] = useState<ClientWithPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchClientsWithPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsSnapshot = await getDocs(collection(db, 'nuevosclientes'));
      const clientsData = await Promise.all(
        clientsSnapshot.docs.map(async (clientDoc) => {
          const clientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
          const paymentsSnapshot = await getDocs(collection(db, 'nuevosclientes', clientDoc.id, 'pagos'));
          const pagos = paymentsSnapshot.docs.map(pDoc => ({ id: pDoc.id, ...pDoc.data() } as DajusticiaPayment))
            .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          return { ...clientData, pagos };
        })
      );
      setClients(clientsData.filter(c => c.estado !== 'inactivo'));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los clientes.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClientsWithPayments();
  }, [fetchClientsWithPayments]);

  const defaulters = useMemo(() => {
    return clients.map(client => {
      const totalAPagar = client.salario || 0;
      const totalPagado = client.pagos.reduce((sum, pago) => sum + (pago.montoNeto || 0), 0);
      const deudaActual = totalAPagar - totalPagado;
      const ultimoPago = client.pagos[0]?.fecha || null;

      const plazoMeses = parseInt(client.plazoMeses, 10);
      if (deudaActual > 0 && client.pagos.length > 0 && plazoMeses) {
        const fechaUltimoPago = new Date(ultimoPago!);
        const fechaVencimiento = new Date(fechaUltimoPago.setMonth(fechaUltimoPago.getMonth() + plazoMeses));
        const hoy = new Date();
        const diasDeMora = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 3600 * 24));

        if (diasDeMora > 0) {
          return { ...client, deudaActual, ultimoPago, diasDeMora };
        }
      }
      return null;
    }).filter(Boolean) as (ClientWithPayments & { deudaActual: number; ultimoPago: string; diasDeMora: number })[];
  }, [clients]);

  const handleSendReminder = async (client: ClientWithPayments & { deudaActual: number }) => {
    setIsSending(client.id);
    try {
      const emailData = {
        emailUsuario: client.correo,
        nombreUsuario: `${client.nombres} ${client.apellidos}`,
        deudaActual: client.deudaActual.toFixed(2),
        cuotaSugerida: client.cuotaMensual,
      };

      await sendPaymentReminderCallable(emailData);

      toast({
        title: 'Correo Enviado',
        description: `Se ha enviado un recordatorio a ${client.nombres}.`,
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al Enviar',
        description: error.message || 'No se pudo enviar el correo.',
      });
    } finally {
      setIsSending(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 md:p-8"><DataTableSkeleton columnCount={5} /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <UserMinus className="h-6 w-6" />
            Gestión de Clientes Morosos
          </CardTitle>
          <CardDescription>Lista de clientes con pagos pendientes y vencidos.</CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Clientes en Mora ({defaulters.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {defaulters.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>¡Todo en Orden!</AlertTitle>
              <AlertDescription>
                No se encontraron clientes con pagos vencidos en este momento.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Último Pago</TableHead>
                  <TableHead>Días de Mora</TableHead>
                  <TableHead className="text-right">Deuda Actual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaulters.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nombres} {client.apellidos}</TableCell>
                    <TableCell>{client.grupo}</TableCell>
                    <TableCell>{formatFirebaseTimestamp(client.ultimoPago, 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium text-destructive">{client.diasDeMora}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(client.deudaActual)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleSendReminder(client)}
                        disabled={isSending === client.id}
                      >
                        {isSending === client.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar Recordatorio
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
