'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, PlusCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { legalConcepts, UserPayment } from '@/lib/data';
import { formatCurrency } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';

const liquidations = [
    { id: 'LIQ-001', userId: 'FzP6XftfysbK6n4yS4yO', amount: 4500, date: '2023-10-16', status: 'Pagada' },
    { id: 'LIQ-002', userId: 'N4TjbfT1Fl0A4RcaQ0jN', amount: 3000, date: '2023-11-02', status: 'Pagada' },
    { id: 'LIQ-003', userId: 'O3n7m9wM2rVbF2gP1sYt', amount: 12000, date: '2024-03-02', status: 'En Proceso' },
    { id: 'LIQ-004', userId: 'Q5o1p0aZ9wVbF3gP2sYu', amount: 5000, date: '2024-05-10', status: 'Pendiente' },
];

export default function LiquidacionesPage() {
    const [users, setUsers] = useState<UserPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "USUARIOS_SENTENCIAS_COLLECTION"));
                const querySnapshot = await getDocs(q);
                const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserPayment));
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching users from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

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
                                        {isLoading ? (
                                            <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin"/></div>
                                        ) : (
                                            users.map(u => <SelectItem key={u.user.document} value={u.user.document}>{u.user.name}</SelectItem>)
                                        )}
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
                         {isLoading ? (
                            <div className="flex justify-center items-center p-10">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        ) : (
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
                                        const user = users.find(u => u.id === liq.userId)?.user;
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
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
