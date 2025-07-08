'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Banknote, Search } from 'lucide-react';
import { payments } from '@/lib/data';
import { formatCurrency } from '@/lib/helpers';

export default function PagosPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const allPayments = useMemo(() => {
        return payments.flatMap(userPayment => 
            userPayment.paymentHistory.map(p => ({
                ...p,
                userName: userPayment.user.name,
                userDocument: userPayment.user.document,
            }))
        );
    }, []);

    const filteredPayments = useMemo(() => {
        if (!searchTerm) return allPayments;
        return allPayments.filter(p => 
            p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.userDocument.includes(searchTerm) ||
            p.documentRef.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allPayments, searchTerm]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Banknote className="h-6 w-6" />
                        Historial de Pagos
                    </CardTitle>
                    <CardDescription>
                        Consulte todos los registros de pagos realizados en el sistema.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por usuario, documento o referencia..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Pago</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Periodo</TableHead>
                                <TableHead>Documento Ref.</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.map(payment => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">{payment.id}</TableCell>
                                    <TableCell>
                                        <div>{payment.userName}</div>
                                        <div className="text-xs text-muted-foreground">{payment.userDocument}</div>
                                    </TableCell>
                                    <TableCell>{payment.period}</TableCell>
                                    <TableCell>{payment.documentRef}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(payment.amount)}</TableCell>
                                </TableRow>
                            ))}
                            {filteredPayments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No se encontraron pagos con los criterios de búsqueda.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
