'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, Palette, UploadCloud, Link, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { ExcelDataUploader } from '@/components/dashboard/excel-data-uploader';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

const functions = getFunctions(app);
// Asumimos que la función de prueba se llamará 'testGoogleDriveConnection'
// Por ahora, usaremos la función existente y la llamaremos sin un folderName para probar.
const testGoogleDriveConnectionCallable = httpsCallable(functions, 'getGoogleDriveFiles');


export default function ConfiguracionPage() {
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const { toast } = useToast();
    const [isTestingDrive, setIsTestingDrive] = useState(false);
    const [driveTestResult, setDriveTestResult] = useState<'success' | 'error' | null>(null);

    const handleTestDriveConnection = async () => {
        setIsTestingDrive(true);
        setDriveTestResult(null);
        toast({ title: "Probando Conexión...", description: "Intentando conectar con Google Drive." });
        try {
            // Llamamos a la función. Una respuesta exitosa (aunque esté vacía) significa que se conectó.
            // Le pasamos un nombre de carpeta que probablemente no exista para solo probar el acceso.
            await testGoogleDriveConnectionCallable({ folderName: 'test-connection-do-not-create' });
            setDriveTestResult('success');
            toast({ title: "¡Conexión Exitosa!", description: "La función pudo autenticarse con Google Drive correctamente." });
        } catch (error: any) {
            setDriveTestResult('error');
             toast({
                variant: 'destructive',
                title: 'Error de Conexión a Drive',
                description: 'No se pudo conectar. Verifique que la API de Drive esté habilitada y que la carpeta esté compartida con la cuenta de servicio.'
            });
            console.error(error);
        } finally {
            setIsTestingDrive(false);
        }
    };


    return (
        <>
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <Settings className="h-6 w-6" />
                            Configuración
                        </CardTitle>
                        <CardDescription>
                            Ajuste las preferencias y conexiones de la aplicación.
                        </CardDescription>
                    </CardHeader>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Link className="h-5 w-5" />
                            Conexión con Google Drive
                        </CardTitle>
                        <CardDescription>
                            Configure el acceso a la carpeta de Google Drive donde se almacenan los soportes de los pensionados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="drive-folder-id">ID de la Carpeta Principal de Drive</Label>
                            <Input id="drive-folder-id" defaultValue="YOUR_MAIN_DRIVE_FOLDER_ID" readOnly className="bg-muted" />
                            <p className="text-xs text-muted-foreground mt-1">Este valor está configurado en el backend. Póngase en contacto con el desarrollador para cambiarlo.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button onClick={handleTestDriveConnection} disabled={isTestingDrive}>
                                {isTestingDrive ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Link className="mr-2 h-4 w-4" />
                                )}
                                Probar Conexión
                            </Button>
                            {driveTestResult === 'success' && <div className="flex items-center text-sm text-green-600 gap-2"><CheckCircle className="h-4 w-4"/> Conectado</div>}
                            {driveTestResult === 'error' && <div className="flex items-center text-sm text-red-600 gap-2"><AlertTriangle className="h-4 w-4"/> Falló</div>}
                        </div>
                    </CardContent>
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
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <UploadCloud className="h-5 w-5" />
                            Migración de Datos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between space-x-2 p-4 border rounded-lg">
                             <div className="flex flex-col space-y-1">
                                <span>Carga Masiva desde Excel</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                    Suba y procese archivos de Excel para poblar colecciones en Firebase.
                                </span>
                            </div>
                            <Button onClick={() => setIsUploaderOpen(true)}>
                                Abrir Herramienta de Carga
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <ExcelDataUploader isOpen={isUploaderOpen} onClose={() => setIsUploaderOpen(false)} />
        </>
    );
}
