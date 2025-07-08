'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, Palette, Languages } from 'lucide-react';

export default function ConfiguracionPage() {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        Configuración
                    </CardTitle>
                    <CardDescription>
                        Ajuste las preferencias de la aplicación a su gusto.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notificaciones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                        <Label htmlFor="notifications-switch" className="flex flex-col space-y-1">
                            <span>Notificaciones por Correo</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Recibir un correo cuando finalice un análisis masivo.
                            </span>
                        </Label>
                        <Switch id="notifications-switch" defaultChecked />
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Apariencia
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                        <Label htmlFor="theme-select" className="flex flex-col space-y-1">
                            <span>Tema de la Aplicación</span>
                             <span className="font-normal leading-snug text-muted-foreground">
                                Elija entre el tema claro u oscuro.
                            </span>
                        </Label>
                        <Select defaultValue="system">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleccionar tema" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Claro</SelectItem>
                                <SelectItem value="dark">Oscuro</SelectItem>
                                <SelectItem value="system">Sistema</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                        <Label htmlFor="language-select" className="flex flex-col space-y-1">
                            <span>Idioma</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Configure el idioma de la interfaz.
                            </span>
                        </Label>
                         <Select defaultValue="es">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleccionar idioma" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="es">Español</SelectItem>
                                <SelectItem value="en" disabled>Inglés (Próximamente)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button>Guardar Configuración</Button>
            </div>
        </div>
    );
}
