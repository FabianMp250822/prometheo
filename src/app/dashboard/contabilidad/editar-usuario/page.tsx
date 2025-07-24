'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, where, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DajusticiaClient } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Search, Loader2, Edit, Trash2, Save, XCircle } from 'lucide-react';
import { DataTableSkeleton } from '@/components/dashboard/data-table-skeleton';
import { formatCurrency, parseEmployeeName } from '@/lib/helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const ITEMS_PER_PAGE = 20;

export default function EditarUsuarioPage() {
    const { toast } = useToast();
    const [clients, setClients] = useState<DajusticiaClient[]>([]);
    const [filteredClients, setFilteredClients] = useState<DajusticiaClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<DajusticiaClient | null>(null);
    const [formData, setFormData] = useState<Partial<DajusticiaClient>>({});
    const [isSaving, setIsSaving] = useState(false);

    const SALARIO_MINIMO = 1300000;

    const fetchClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'nuevosclientes'));
            const clientsSnapshot = await getDocs(q);
            const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DajusticiaClient));
            
            const activeClients = clientsData.filter(c => c.estado !== 'inactivo');
            
            activeClients.sort((a,b) => a.nombres.localeCompare(b.nombres));
            setClients(activeClients);
            setFilteredClients(activeClients);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los clientes.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        setCurrentPage(1);
        const filtered = clients.filter(client => 
            `${client.nombres} ${client.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.cedula.includes(searchTerm)
        );
        setFilteredClients(filtered);
    }, [searchTerm, clients]);

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredClients, currentPage]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

    const openEditModal = (client: DajusticiaClient) => {
        setSelectedClient(client);
        setFormData(client);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedClient(null);
        setFormData({});
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        let newSalario: number | undefined;
        let newCuota: string | undefined;

        const updatedFormData = { ...formData, [name]: value };

        if(name === 'multiplicadorSalario'){
            newSalario = SALARIO_MINIMO * parseFloat(value);
            updatedFormData.salario = newSalario;
        }

        if(name === 'plazoMeses' || newSalario !== undefined){
            const salarioActual = newSalario ?? formData.salario ?? 0;
            const plazoActual = parseInt(name === 'plazoMeses' ? value : (formData.plazoMeses ?? '0'), 10);
            if(plazoActual > 0){
                newCuota = (salarioActual / plazoActual).toFixed(2);
                updatedFormData.cuotaMensual = newCuota;
            }
        }
        
        setFormData(updatedFormData);
    };

    const handleSave = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        try {
            const clientDocRef = doc(db, 'nuevosclientes', selectedClient.id);
            // Ensure numeric fields are stored as numbers
            const dataToSave = {
                ...formData,
                salario: Number(formData.salario) || 0,
                plazoMeses: String(formData.plazoMeses) || '0',
                multiplicadorSalario: Number(formData.multiplicadorSalario) || 0,
                cuotaMensual: String(formData.cuotaMensual) || '0'
            };
            
            await setDoc(clientDocRef, dataToSave, { merge: true });
            toast({ title: 'Éxito', description: 'Cliente actualizado correctamente.' });
            
            // Refresh local data
            await fetchClients();
            closeEditModal();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (clientId: string) => {
        setIsLoading(true);
         try {
            const clientDocRef = doc(db, "nuevosclientes", clientId);
            await updateDoc(clientDocRef, { estado: 'inactivo' });

            toast({ title: 'Cliente Desactivado', description: 'El cliente ha sido ocultado de la lista.' });
            await fetchClients();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `No se pudo desactivar el cliente: ${error.message}` });
        } finally {
             setIsLoading(false);
        }
    };

    return (
    <>
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <UserCog className="h-6 w-6" />
                        Editar Cliente
                    </CardTitle>
                    <CardDescription>Busque un cliente para editar o desactivar su información.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nombre o cédula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                        <span className="ml-4 text-sm text-muted-foreground whitespace-nowrap">
                            {filteredClients.length} cliente(s) encontrado(s)
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <DataTableSkeleton columnCount={5} />
                    ) : (
                        <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Cédula</TableHead>
                                    <TableHead>Grupo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClients.map((client, index) => (
                                    <TableRow key={client.id}>
                                        <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                        <TableCell className="font-medium">{parseEmployeeName(client.nombres)} {client.apellidos}</TableCell>
                                        <TableCell>{client.cedula}</TableCell>
                                        <TableCell>{client.grupo}</TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEditModal(client)}>
                                                <Edit className="h-3 w-3 mr-1" /> Editar
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm"><Trash2 className="h-3 w-3 mr-1"/> Desactivar</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no eliminará al cliente, solo lo ocultará de la lista. Podrá ser reactivado en el futuro si es necesario.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(client.id)}>Continuar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedClients.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No se encontraron clientes.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center p-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
        
        {isEditModalOpen && selectedClient && (
            <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
                <DialogContent className="max-w-2xl" onInteractOutside={e => { if (isSaving) e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle>Editando a {parseEmployeeName(selectedClient.nombres)}</DialogTitle>
                        <DialogDescription>Realice los cambios necesarios y guárdelos.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[65vh] overflow-y-auto pr-4 space-y-4 py-4">
                        <Card>
                             <CardHeader><CardTitle className="text-lg">Información Personal</CardTitle></CardHeader>
                             <CardContent className="grid md:grid-cols-2 gap-4">
                                <div><Label>Nombres</Label><Input name="nombres" value={formData.nombres || ''} onChange={handleFormChange}/></div>
                                <div><Label>Apellidos</Label><Input name="apellidos" value={formData.apellidos || ''} onChange={handleFormChange}/></div>
                                <div><Label>Cédula</Label><Input name="cedula" value={formData.cedula || ''} onChange={handleFormChange}/></div>
                                <div><Label>Dirección</Label><Input name="direccion" value={formData.direccion || ''} onChange={handleFormChange}/></div>
                                <div><Label>Correo</Label><Input type="email" name="correo" value={formData.correo || ''} onChange={handleFormChange}/></div>
                                <div><Label>Teléfono Fijo</Label><Input name="telefonoFijo" value={formData.telefonoFijo || ''} onChange={handleFormChange}/></div>
                                <div><Label>Celular</Label><Input name="celular" value={formData.celular || ''} onChange={handleFormChange}/></div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Información de Contrato</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Grupo</Label><Input name="grupo" value={formData.grupo || ''} onChange={handleFormChange}/></div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div><Label>Aporte Op.</Label><Input value={formatCurrency(SALARIO_MINIMO)} readOnly className="bg-muted"/></div>
                                    <div><Label>Multiplicador</Label><Input type="number" name="multiplicadorSalario" value={formData.multiplicadorSalario || ''} onChange={handleFormChange}/></div>
                                    <div><Label>Salario a Cancelar</Label><Input value={formatCurrency(Number(formData.salario) || 0)} readOnly className="bg-muted"/></div>
                                    <div><Label>Plazo (Meses)</Label><Input type="number" name="plazoMeses" value={formData.plazoMeses || ''} onChange={handleFormChange}/></div>
                                    <div className="col-span-full"><Label>Cuota Mensual</Label><Input value={formatCurrency(parseFloat(formData.cuotaMensual || '0'))} readOnly className="font-bold text-lg h-auto bg-muted" /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditModal} disabled={isSaving}><XCircle className="mr-2 h-4 w-4"/>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </>
    );
}
