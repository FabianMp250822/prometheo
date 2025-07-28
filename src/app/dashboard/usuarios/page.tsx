'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, Users, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Pensioner } from '@/lib/data';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const functions = getFunctions();
const createUserCallable = httpsCallable(functions, 'createUser');
const listUsersCallable = httpsCallable(functions, 'listUsers');

interface AppUser {
    id: string;
    nombre: string;
    email: string;
    rol: string;
}

const roles = ["Administrador", "Abogado", "Abogado Externo", "Contador"];

export default function UsuariosPage() {
    const { toast } = useToast();
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rol, setRol] = useState('');
    
    const [pensioners, setPensioners] = useState<Pensioner[]>([]);
    const [selectedPensioners, setSelectedPensioners] = useState<Pensioner[]>([]);
    const [openPensionerSelect, setOpenPensionerSelect] = useState(false);

    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);

    const fetchPensioners = useCallback(async () => {
        try {
            const q = query(collection(db, "pensionados"));
            const querySnapshot = await getDocs(q);
            const pensionersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pensioner));
            setPensioners(pensionersData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los pensionados.' });
        }
    }, [toast]);
    
    const fetchUsers = useCallback(async () => {
        setIsFetchingUsers(true);
        try {
            const result = await listUsersCallable();
            const usersData = result.data as AppUser[];
            setUsers(usersData);
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error al cargar usuarios', description: error.message });
        } finally {
            setIsFetchingUsers(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPensioners();
        fetchUsers();
    }, [fetchPensioners, fetchUsers]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !email || !password || !rol) {
            toast({ variant: 'destructive', title: 'Error', description: 'Todos los campos son obligatorios.' });
            return;
        }
        setIsLoading(true);
        try {
            const associatedPensioners = rol === 'Abogado' ? selectedPensioners.map(p => p.id) : [];
            
            await createUserCallable({
                email,
                password,
                displayName: nombre,
                role: rol,
                associatedPensioners,
            });

            toast({ title: 'Éxito', description: `Usuario ${nombre} creado con el rol de ${rol}.` });
            setNombre('');
            setEmail('');
            setPassword('');
            setRol('');
            setSelectedPensioners([]);
            await fetchUsers();

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error al crear usuario', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Gestión de Usuarios
                    </CardTitle>
                    <CardDescription>
                        Cree, vea y administre los usuarios que tienen acceso a la plataforma.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Crear Nuevo Usuario
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div><Label htmlFor="nombre">Nombre Completo</Label><Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
                            <div><Label htmlFor="email">Correo Electrónico</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                            <div><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
                            <div><Label htmlFor="rol">Rol de Usuario</Label>
                                <Select onValueChange={setRol} value={rol}>
                                    <SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {rol === 'Abogado' && (
                                <div>
                                    <Label>Asociar Pensionados</Label>
                                    <Popover open={openPensionerSelect} onOpenChange={setOpenPensionerSelect}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start">
                                                {selectedPensioners.length > 0 ? `${selectedPensioners.length} seleccionados` : "Seleccionar pensionados"}
                                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar pensionado..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron pensionados.</CommandEmpty>
                                                    <CommandGroup>
                                                        {pensioners.map(p => {
                                                            const isSelected = selectedPensioners.some(sp => sp.id === p.id);
                                                            return (
                                                                <CommandItem
                                                                    key={p.id}
                                                                    onSelect={() => {
                                                                        if (isSelected) {
                                                                            setSelectedPensioners(selectedPensioners.filter(sp => sp.id !== p.id));
                                                                        } else {
                                                                            setSelectedPensioners([...selectedPensioners, p]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}/>
                                                                    <span>{p.empleado}</span>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Crear Usuario
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                 <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl">Listado de Usuarios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isFetchingUsers ? (
                            <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.nombre}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell><Badge variant="secondary">{user.rol}</Badge></TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
