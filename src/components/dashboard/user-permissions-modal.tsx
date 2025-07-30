
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScrollArea } from '../ui/scroll-area';

interface User {
    id: string;
    nombre: string;
    rol: string;
    permissions?: { [key: string]: boolean };
}

interface UserPermissionsModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onPermissionsUpdate: () => void;
}

const allPermissions = [
    { id: 'canViewDashboard', label: 'Ver Dashboard Principal' },
    { id: 'canViewBuscador', label: 'Ver Buscador Global' },
    { id: 'canViewHojaDeVida', label: 'Ver Hoja de Vida Pensionado' },
    { id: 'canViewAgenda', label: 'Acceder a la Agenda' },
    { id: 'canViewLiquidaciones', label: 'Acceder a Liquidaciones' },
    { id: 'canViewPagosSentencias', label: 'Acceder a Pagos y Sentencias' },
    { id: 'canViewContabilidad', label: 'Acceder a Contabilidad' },
    { id: 'canViewProcesosEnLinea', label: 'Acceder a Procesos en Línea' },
    { id: 'canViewReportes', label: 'Ver Reportes' },
    { id: 'canViewGestionDemandas', label: 'Gestionar Demandas' },
    { id: 'canManageUsers', label: 'Gestionar Usuarios' },
    { id: 'canAccessConfiguracion', label: 'Acceder a Configuración' },
];

export function UserPermissionsModal({ user, isOpen, onClose, onPermissionsUpdate }: UserPermissionsModalProps) {
    const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (user?.permissions) {
            setPermissions(user.permissions);
        } else {
            setPermissions({});
        }
    }, [user]);

    const handlePermissionChange = (permissionId: string, value: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [permissionId]: value
        }));
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, {
                permissions: permissions
            });
            toast({ title: "Éxito", description: "Los permisos del usuario han sido actualizados." });
            onPermissionsUpdate();
            onClose();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: `No se pudieron guardar los permisos: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Permisos para {user.nombre}</DialogTitle>
                    <DialogDescription>
                        Rol actual: <span className="font-semibold text-primary">{user.rol}</span>. Active o desactive el acceso a las funcionalidades.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-6">
                    <div className="space-y-4 py-4">
                        {allPermissions.map(permission => (
                            <div key={permission.id} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <Label htmlFor={permission.id} className="text-sm">
                                    {permission.label}
                                </Label>
                                <Switch
                                    id={permission.id}
                                    checked={permissions[permission.id] || false}
                                    onCheckedChange={(value) => handlePermissionChange(permission.id, value)}
                                />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button type="button" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Permisos
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
