'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, Search, Loader2 } from 'lucide-react';
import { UserPayment } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Pensioner = {
    name: string;
    document: string;
    avatarUrl: string;
    department: string;
    status: 'Analizado' | 'Pendiente';
}

export default function ListadoPensionadosPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [pensioners, setPensioners] = useState<Pensioner[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPensioners = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "USUARIOS_SENTENCIAS_COLLECTION"));
                const querySnapshot = await getDocs(q);
                const pensionersData = querySnapshot.docs.map(doc => {
                    const data = doc.data() as UserPayment;
                    return {
                        ...data.user,
                        department: data.department,
                        status: data.analyzedAt ? 'Analizado' : 'Pendiente'
                    };
                });
                setPensioners(pensionersData);
            } catch (error) {
                console.error("Error fetching pensioners from Firestore:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPensioners();
    }, []);

    const filteredPensioners = useMemo(() => {
        if (!searchTerm) return pensioners;
        return pensioners.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.document.includes(searchTerm)
        );
    }, [pensioners, searchTerm]);
    
    const getStatusClass = (status: string) => {
        return status === 'Analizado'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-amber-100 text-amber-800';
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Listado de Pensionados
                    </CardTitle>
                    <CardDescription>
                        Explore la lista completa de pensionados registrados en el sistema.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                     <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre o documento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
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
                                <TableHead>Nombre</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Dependencia</TableHead>
                                <TableHead>Estado Análisis</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPensioners.map(p => (
                                <TableRow key={p.document}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={p.avatarUrl} alt={p.name} data-ai-hint="person portrait" />
                                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{p.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{p.document}</TableCell>
                                    <TableCell>{p.department}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn('text-xs', getStatusClass(p.status))}>
                                            {p.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {filteredPensioners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No se encontraron pensionados.
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
