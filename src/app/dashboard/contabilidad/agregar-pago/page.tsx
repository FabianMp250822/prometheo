'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { DajusticiaClient } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, Loader2, FileUp, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ClientWithPayments extends DajusticiaClient {
  pagos: any[];
}

export default function AgregarPagoPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientWithPayments[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [uniqueGroups, setUniqueGroups] = useState<string[]>([]);

  const [selectedClient, setSelectedClient] = useState<ClientWithPayments | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Form state for new payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const fetchClientsAndPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsSnapshot = await getDocs(collection(db, 'nuevosclientes'));
      const clientsData = await Promise.all(
        clientsSnapshot.docs.map(async (clientDoc) => {
          const clientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
          const paymentsSnapshot = await getDocs(collection(db, 'nuevosclientes', clientDoc.id, 'pagos'));
          const pagos = paymentsSnapshot.docs.map(pDoc => ({ id: pDoc.id, ...pDoc.data() }));
          return { ...clientData, pagos };
        })
      );
      
      const groups = [...new Set(clientsData.map(c => c.grupo).filter(Boolean))].sort();
      setUniqueGroups(groups);
      setClients(clientsData);
      setFilteredClients(clientsData);
      
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los clientes.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClientsAndPayments();
  }, [fetchClientsAndPayments]);

  useEffect(() => {
    const applyFilters = () => {
        const filtered = clients.filter(client => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = `${client.nombres} ${client.apellidos}`.toLowerCase().includes(searchLower);
            const cedulaMatch = client.cedula.includes(searchLower);
            const groupMatch = groupFilter === 'all' || client.grupo === groupFilter;
            return (nameMatch || cedulaMatch) && groupMatch;
        });
        setFilteredClients(filtered);
    };
    applyFilters();
  }, [searchTerm, groupFilter, clients]);

  const openPaymentModal = (client: ClientWithPayments) => {
    setSelectedClient(client);
    setPaymentAmount('');
    setPaymentDate('');
    setSupportFile(null);
    setIsPaymentModalOpen(true);
  };
  
  const closePaymentModal = () => {
      if (isSavingPayment) return;
      setIsPaymentModalOpen(false);
      setSelectedClient(null);
  }

  const handleSavePayment = async () => {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0 || !paymentDate || !supportFile || !selectedClient) {
          toast({ variant: 'destructive', title: 'Datos Incompletos', description: 'Complete todos los campos del pago.' });
          return;
      }
      setIsSavingPayment(true);

      try {
          // Upload support file
          const supportRef = ref(storage, `soportes/${selectedClient.id}/${Date.now()}_${supportFile.name}`);
          await uploadBytes(supportRef, supportFile);
          const supportURL = await getDownloadURL(supportRef);

          // Calculate payment details
          const monto = parseFloat(paymentAmount);
          const descuento = 0; // Assuming 0 discount for now
          const montoNeto = monto - descuento;
          const vendedor = montoNeto * 0.23076923076923077;
          const empresa = montoNeto * 0.7692307692307693;
          
          const paymentData = {
              monto,
              descuento,
              montoNeto,
              fecha: paymentDate,
              vendedor,
              empresa,
              soporteURL: supportURL
          };

          const paymentRef = await addDoc(collection(db, 'nuevosclientes', selectedClient.id, 'pagos'), paymentData);

          // TODO: Add email sending logic here later
          // const emailData = { ... };
          // await fetch('...', { method: 'POST', body: JSON.stringify(emailData) });
          
          toast({ title: 'Éxito', description: 'Pago registrado y soporte subido exitosamente.' });
          
          // Refresh data locally to avoid re-fetching all clients
          const newPayment = { id: paymentRef.id, ...paymentData };
          const updatedClients = clients.map(c => 
              c.id === selectedClient.id 
              ? { ...c, pagos: [...c.pagos, newPayment] } 
              : c
          );
          setClients(updatedClients);
          closePaymentModal();

      } catch (error: any) {
          console.error("Error saving payment:", error);
          toast({ variant: 'destructive', title: 'Error al Guardar', description: error.message });
      } finally {
          setIsSavingPayment(false);
      }
  };


  const financialSummary = (client: ClientWithPayments) => {
      const cuotaMensual = parseFloat(client.cuotaMensual || '0');
      const plazoMeses = parseInt(client.plazoMeses, 10) || 0;
      const totalAPagar = cuotaMensual * plazoMeses;
      const totalPagado = client.pagos ? client.pagos.reduce((sum, pago) => sum + parseFloat(pago.montoNeto || '0'), 0) : 0;
      const deuda = totalAPagar - totalPagado;
      return { totalAPagar, totalPagado, deuda };
  };

  const paymentBreakdown = () => {
    if (!paymentAmount) return null;
    const monto = parseFloat(paymentAmount);
    if (isNaN(monto) || monto <= 0) return null;

    const descuento = 0;
    const montoNeto = monto - descuento;
    return {
      descuento: formatCurrency(descuento),
      montoNeto: formatCurrency(montoNeto),
      empresa: formatCurrency(montoNeto * 0.7692307692307693),
      vendedor: formatCurrency(montoNeto * 0.23076923076923077)
    };
  };
  const breakdown = paymentBreakdown();

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center gap-2">
              <PlusCircle className="h-6 w-6" />
              Agregar Pago a Cliente
            </CardTitle>
            <CardDescription>Busque un cliente y registre un nuevo pago para su cuenta.</CardDescription>
          </CardHeader>
        </Card>

        <Card>
            <CardHeader className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nombre o cédula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                        <SelectValue placeholder="Filtrar por grupo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Grupos</SelectItem>
                        {uniqueGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Cédula</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead>Total a Pagar</TableHead>
                                <TableHead>Total Pagado</TableHead>
                                <TableHead>Deuda Actual</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map(client => {
                                const summary = financialSummary(client);
                                return (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.nombres} {client.apellidos}</TableCell>
                                    <TableCell>{client.cedula}</TableCell>
                                    <TableCell>{client.grupo}</TableCell>
                                    <TableCell>{formatCurrency(summary.totalAPagar)}</TableCell>
                                    <TableCell className="text-green-600 font-medium">{formatCurrency(summary.totalPagado)}</TableCell>
                                    <TableCell className="text-red-600 font-medium">{formatCurrency(summary.deuda)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button onClick={() => openPaymentModal(client)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Pago
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                )
                            })}
                            {filteredClients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">No se encontraron clientes.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                )}
            </CardContent>
        </Card>
      </div>

      {isPaymentModalOpen && selectedClient && (
         <Dialog open={isPaymentModalOpen} onOpenChange={closePaymentModal}>
            <DialogContent className="sm:max-w-md" onInteractOutside={e => { if (isSavingPayment) e.preventDefault(); }}>
                <DialogHeader>
                    <DialogTitle>Registrar Pago para {selectedClient.nombres}</DialogTitle>
                    <DialogDescription>Deuda actual: {formatCurrency(financialSummary(selectedClient).deuda)}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="payment-date">Fecha del Pago</Label>
                            <Input id="payment-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div>
                             <Label htmlFor="payment-amount">Monto del Pago</Label>
                            <Input id="payment-amount" type="number" placeholder="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="support-file">Soporte de Pago (PDF, Imagen)</Label>
                        <Input id="support-file" type="file" accept="image/*,application/pdf" onChange={e => setSupportFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                     {breakdown && (
                        <Alert>
                            <AlertTitle>Desglose del Pago</AlertTitle>
                            <AlertDescription asChild>
                                <ul className="text-sm space-y-1 mt-2">
                                    <li className="flex justify-between"><span>Monto Neto:</span> <strong>{breakdown.montoNeto}</strong></li>
                                    <li className="flex justify-between"><span>Comisión Vendedor:</span> <span className="text-muted-foreground">{breakdown.vendedor}</span></li>
                                    <li className="flex justify-between"><span>Para Empresa:</span> <span className="text-muted-foreground">{breakdown.empresa}</span></li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closePaymentModal} disabled={isSavingPayment}>Cancelar</Button>
                    <Button onClick={handleSavePayment} disabled={isSavingPayment}>
                        {isSavingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                        Guardar Pago
                    </Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

    </>
  );
}

    