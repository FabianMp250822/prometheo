
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UploadCloud, FileClock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { DajusticiaClient } from '@/lib/data';
import { formatCurrency, formatFirebaseTimestamp } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface PaymentSupport {
    id: string;
    montoReportado: number;
    fechaPago: string;
    fechaSubida: any;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    soporteURL: string;
    nombreArchivo: string;
}

interface PaymentManagerProps {
    client: DajusticiaClient;
}

export function PaymentManager({ client }: PaymentManagerProps) {
    const { toast } = useToast();
    const [monto, setMonto] = useState('');
    const [fecha, setFecha] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [paymentSupports, setPaymentSupports] = useState<PaymentSupport[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Listen for real-time updates on payment supports
    useEffect(() => {
        if (!client.id) return;
        const supportsRef = collection(db, "nuevosclientes", client.id, "soportes_pago");
        const q = query(supportsRef, orderBy("fechaSubida", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const supportsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PaymentSupport));
            setPaymentSupports(supportsData);
            setIsLoadingHistory(false);
        }, (error) => {
            console.error("Error fetching payment supports:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar el historial de soportes." });
            setIsLoadingHistory(false);
        });

        return () => unsubscribe();
    }, [client.id, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!monto || !fecha || !file) {
            toast({ variant: 'destructive', title: "Datos incompletos", description: "Por favor, complete todos los campos." });
            return;
        }
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `soportes_clientes/${client.id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const supportData = {
                montoReportado: parseFloat(monto),
                fechaPago: fecha,
                nombreArchivo: file.name,
                soporteURL: downloadURL,
                estado: 'Pendiente',
                fechaSubida: serverTimestamp(),
            };
            
            await addDoc(collection(db, "nuevosclientes", client.id, "soportes_pago"), supportData);
            
            toast({ title: "Soporte Enviado", description: "Su comprobante de pago ha sido enviado para validación." });
            // Reset form
            setMonto('');
            setFecha('');
            setFile(null);
            // Type assertion to clear file input
            (document.getElementById('file-upload') as HTMLInputElement).value = '';

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error al subir", description: error.message });
        } finally {
            setIsUploading(false);
        }
    };
    
    const getStatusBadge = (status: PaymentSupport['estado']) => {
        switch(status) {
            case 'Pendiente': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><FileClock className="mr-1 h-3 w-3"/>Pendiente</Badge>;
            case 'Aprobado': return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3"/>Aprobado</Badge>;
            case 'Rechazado': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/>Rechazado</Badge>;
            default: return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3"/>{status}</Badge>;
        }
    };


    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cargar Soporte de Pago</CardTitle>
                    <CardDescription>Envíe aquí su comprobante de pago para que sea validado por nuestro equipo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="monto">Monto Pagado</Label>
                            <Input id="monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="1000000" required />
                        </div>
                        <div>
                            <Label htmlFor="fecha">Fecha del Pago</Label>
                            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required max={format(new Date(), 'yyyy-MM-dd')} />
                        </div>
                        <div>
                            <Label htmlFor="file-upload">Comprobante (PDF, JPG, PNG)</Label>
                            <Input id="file-upload" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required accept="application/pdf,image/jpeg,image/png" />
                        </div>
                        <Button type="submit" disabled={isUploading} className="w-full">
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            Enviar Soporte para Validación
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Soportes Enviados</CardTitle>
                    <CardDescription>Aquí puede ver el estado de los comprobantes que ha subido.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                         <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : paymentSupports.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">No ha enviado ningún soporte de pago.</p>
                    ) : (
                        <div className="overflow-y-auto max-h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha Pago</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentSupports.map(support => (
                                        <TableRow key={support.id}>
                                            <TableCell>{support.fechaPago}</TableCell>
                                            <TableCell>{formatCurrency(support.montoReportado)}</TableCell>
                                            <TableCell>{getStatusBadge(support.estado)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
