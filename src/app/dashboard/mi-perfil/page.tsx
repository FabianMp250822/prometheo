'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, KeyRound, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MiPerfilPage() {
    const currentUser = {
        name: 'Administrador',
        email: 'admin@prometeo.com',
        avatarUrl: 'https://placehold.co/100x100.png'
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Mi Perfil
                    </CardTitle>
                    <CardDescription>
                        Actualice su información personal y de seguridad.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-start gap-8">
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Button variant="outline">Cambiar Foto</Button>
                        </div>
                        <form className="flex-1 space-y-4">
                             <div>
                                <Label htmlFor="name">Nombre Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="name" defaultValue={currentUser.name} className="pl-10" />
                                </div>
                            </div>
                             <div>
                                <Label htmlFor="email">Correo Electrónico</Label>
                                 <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" type="email" defaultValue={currentUser.email} className="pl-10" />
                                </div>
                            </div>
                             <div>
                                <Label htmlFor="new-password">Nueva Contraseña</Label>
                                 <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="new-password" type="password" placeholder="Dejar en blanco para no cambiar" className="pl-10" />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                                 <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="confirm-password" type="password" placeholder="Confirmar nueva contraseña" className="pl-10" />
                                </div>
                            </div>
                            <Button>Guardar Cambios</Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
