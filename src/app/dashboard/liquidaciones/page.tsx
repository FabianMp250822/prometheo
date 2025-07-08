'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, PlusCircle } from 'lucide-react';
import { useMemo } from 'react';
import { payments, legalConcepts } from '@/lib/data';
import { formatCurrency } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';

const liquidations = [
    { id: 'LIQ-001', userId: 'usr_001', amount: 4500, date: '2023-10-16', status: 'Pagada' },
    { id: 'LIQ-002', userId: 'usr_003', amount: 3000, date: '2023-11-02', status: 'Pagada' },
    { id: 'LIQ-003', userId: 'usr_004', amount: 12000, date: '2024-03-02', status: 'En Proceso' },
    { id: 'LIQ-004', userId: 'usr_002', amount: 5000, date: '2024-05-10', status: 'Pendiente' },
];

export default function LiquidacionesPage() {
    const users = useMemo(() => payments.map(p => p.user), []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pagada': return 'bg-green-100 text-green-800';
            case 'En Proceso': return 'bg-blue-100 text-blue-800';
            case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <TrendingUp className="h-6 w-6" />
                        Liquidaciones
                    </CardTitle>
                    <CardDescription>
                        Genere y consulte liquidaciones de pagos judiciales.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" />
                            Nueva Liquidación
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4">
                            <div>
                                <Label htmlFor="user">Usuario</Label>
                                <Select>
                                    <SelectTrigger id="user">
                                        <SelectValue placeholder="Seleccione un usuario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => <SelectItem key={u.document} value={u.document}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="concept">Concepto</Label>
                                <Select>
                                    <SelectTrigger id="concept">
                                        <SelectValue placeholder="Seleccione un concepto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {legalConcepts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="amount">Monto</Label>
                                <Input id="amount" type="number" placeholder="Ingrese el monto" />
                            </div>
                            <Button className="w-full">Generar Liquidación</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl">Historial de Liquidaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {liquidations.map(liq => {
                                    const user = payments.find(p => p.id === liq.userId)?.user;
                                    return (
                                        <TableRow key={liq.id}>
                                            <TableCell className="font-medium">{liq.id}</TableCell>
                                            <TableCell>{user?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(liq.amount)}</TableCell>
                                            <TableCell>{liq.date}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusBadge(liq.status)}>{liq.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
