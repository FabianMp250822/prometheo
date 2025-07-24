'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient, DajusticiaPayment } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, User, FileDown, Briefcase, TrendingUp, TrendingDown, Sigma, Send } from 'lucide-react';
import { formatCurrency, formatFirebaseTimestamp } from '@/lib/helpers';
import { DocumentViewerModal } from '@/components/dashboard/document-viewer-modal';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function PagosClientePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clienteId = params.clienteId as string;

  const [client, setClient] = useState<DajusticiaClient | null>(null);
  const [payments, setPayments] = useState<DajusticiaPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  
  const fetchClientData = useCallback(async () => {
    if (!clienteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const clientDocRef = doc(db, 'nuevosclientes', clienteId);
      const clientDocSnap = await getDoc(clientDocRef);

      if (!clientDocSnap.exists()) {
        throw new Error('No se encontró el cliente especificado.');
      }
      const clientData = { id: clientDocSnap.id, ...clientDocSnap.data() } as DajusticiaClient;
      setClient(clientData);
      
      const paymentsCollectionRef = collection(db, 'nuevosclientes', clienteId, 'pagos');
      const paymentsSnapshot = await getDocs(paymentsCollectionRef);
      const paymentsData = paymentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as DajusticiaPayment))
        .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      setPayments(paymentsData);

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleViewDocument = (url: string, title: string) => {
    setDocumentUrl(url);
    setDocumentTitle(title);
  };
  
  const handleResendSupport = async (payment: DajusticiaPayment) => {
      // This is a placeholder for the actual email sending logic.
      // In a real app, this would call a server action or a cloud function.
      toast({
          title: "Función no implementada",
          description: "La lógica para reenviar el correo de soporte aún no está conectada."
      });
      console.log("Reenviar soporte para:", payment);
      // Example of what the call might look like:
      // await resendSupportEmail({ clientId: client?.id, paymentId: payment.id });
  };
  
  const summary = React.useMemo(() => {
    if (!client) return { totalPagado: 0, saldoPendiente: 0 };
    const totalPagado = payments.reduce((acc, pago) => acc + pago.monto, 0);
    const saldoPendiente = client.salario - totalPagado;
    return { totalPagado, saldoPendiente };
  }, [client, payments]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (error) {
     return (
        <div className="p-4 md:p-8">
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.back()} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
        </div>
     )
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/contabilidad/historial-pagos')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Historial de Pagos del Cliente</h1>
                <p className="text-muted-foreground">Detalles financieros y pagos registrados para {client?.nombres} {client?.apellidos}.</p>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><p className="text-sm text-muted-foreground">Nombre Completo</p><p>{client?.nombres} {client?.apellidos}</p></div>
                <div><p className="text-sm text-muted-foreground">Cédula</p><p>{client?.cedula}</p></div>
                <div><p className="text-sm text-muted-foreground">Grupo</p><p>{client?.grupo}</p></div>
                <div><p className="text-sm text-muted-foreground">Correo</p><p>{client?.correo}</p></div>
                <div><p className="text-sm text-muted-foreground">Celular</p><p>{client?.celular}</p></div>
                <div><p className="text-sm text-muted-foreground">Dirección</p><p>{client?.direccion}</p></div>
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
                    <div><p className="text-sm text-muted-foreground">Monto Total Acuerdo</p><p className="font-bold text-lg">{formatCurrency(client?.salario || 0)}</p></div>
                    <div><p className="text-sm text-muted-foreground">Plazo</p><p className="font-bold text-lg">{client?.plazoMeses} meses</p></div>
                    <div><p className="text-sm text-muted-foreground">Cuota Mensual</p><p className="font-bold text-lg">{formatCurrency(parseFloat(client?.cuotaMensual || '0'))}</p></div>
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

        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
            <CardDescription>{payments.length} pagos registrados para este cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Monto Neto</TableHead>
                        <TableHead>Descuento</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map(pago => (
                        <TableRow key={pago.id}>
                            <TableCell>{formatFirebaseTimestamp(pago.fecha)}</TableCell>
                            <TableCell>{formatCurrency(pago.monto)}</TableCell>
                            <TableCell>{formatCurrency(pago.montoNeto)}</TableCell>
                            <TableCell>{formatCurrency(pago.descuento)}</TableCell>
                            <TableCell>{formatCurrency(pago.vendedor)}</TableCell>
                            <TableCell>{formatCurrency(pago.empresa)}</TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                                <Button
                                    variant="outline" size="icon"
                                    disabled={!pago.soporteURL}
                                    onClick={() => handleViewDocument(pago.soporteURL, `Soporte de pago`)}>
                                    <FileDown className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon"
                                    onClick={() => handleResendSupport(pago)}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                     {payments.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                                No se han registrado pagos para este cliente.
                            </TableCell>
                        </TableRow>
                     )}
                </TableBody>
            </Table>
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
