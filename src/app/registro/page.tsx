
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const functions = getFunctions();
const createUserCallable = httpsCallable(functions, 'createUser');

export default function RegistroPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        cedula: '',
        fechaNacimiento: '',
        lugar: '',
        edad: '',
        direccion: '',
        municipio: '',
        telefonoFijo: '',
        celular: '',
        correo: '',
        password: '', // Add password field to state
        pensionado: 'No',
        tipoPension: '',
        ultimoCargo: '',
        mesadaEmpresa: '',
        mesadaColpensiones: '',
        empresaPension: '',
        compartido: 'No',
        motivo: '',
        autoriza: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleRadioChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.autoriza) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debe autorizar el tratamiento de sus datos personales.' });
            return;
        }
        setIsLoading(true);
        try {
            // 1. Create user in Firebase Auth
            await createUserCallable({
                email: formData.correo,
                password: formData.password,
                displayName: `${formData.nombre} ${formData.apellidos}`,
                role: 'Usuario',
            });

            // 2. Save form data to 'prospectos' collection
            const prospectoData = { ...formData };
            delete prospectoData.password; // Do not save password in Firestore
            await addDoc(collection(db, 'prospectos'), prospectoData);

            toast({ title: 'Registro Exitoso', description: 'Su cuenta ha sido creada. Ahora puede iniciar sesión.' });
            router.push('/login');
            
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error en el Registro', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex items-center justify-center">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="ghost" asChild>
                            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio</Link>
                        </Button>
                        <Link href="/login" className="text-sm text-primary hover:underline">¿Ya estás registrado? Inicia Sesión</Link>
                    </div>
                    <CardTitle className="text-center text-3xl font-headline text-[#1B4D3E]">Formulario de Ingreso de Cliente</CardTitle>
                    <CardDescription className="text-center">Por favor, complete todos los campos con la información requerida.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Datos del Cliente */}
                        <section>
                            <h3 className="text-xl font-semibold mb-4 border-b pb-2">I. Datos del Cliente</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div><Label htmlFor="nombre">Nombres</Label><Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required /></div>
                                <div><Label htmlFor="apellidos">Apellidos</Label><Input id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} required /></div>
                                <div><Label htmlFor="cedula">Cédula Nº</Label><Input id="cedula" name="cedula" value={formData.cedula} onChange={handleChange} required /></div>
                                <div><Label htmlFor="fechaNacimiento">Fecha Nacimiento</Label><Input id="fechaNacimiento" name="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} /></div>
                                <div><Label htmlFor="lugar">Lugar</Label><Input id="lugar" name="lugar" value={formData.lugar} onChange={handleChange} /></div>
                                <div><Label htmlFor="edad">Edad Actual Cumplida</Label><Input id="edad" name="edad" type="number" value={formData.edad} onChange={handleChange} /></div>
                                <div className="md:col-span-2"><Label htmlFor="direccion">Dirección Residencia</Label><Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} /></div>
                                <div><Label htmlFor="municipio">Municipio</Label><Input id="municipio" name="municipio" value={formData.municipio} onChange={handleChange} /></div>
                                <div><Label htmlFor="telefonoFijo">Teléfono fijo</Label><Input id="telefonoFijo" name="telefonoFijo" value={formData.telefonoFijo} onChange={handleChange} /></div>
                                <div><Label htmlFor="celular">Celular(es)</Label><Input id="celular" name="celular" value={formData.celular} onChange={handleChange} required /></div>
                                <div><Label htmlFor="correo">Correo Electrónico (será su usuario)</Label><Input id="correo" name="correo" type="email" value={formData.correo} onChange={handleChange} required /></div>
                                <div><Label htmlFor="password">Contraseña</Label><Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required /></div>
                                <div className="flex flex-col gap-2"><Label>Pensionado</Label><RadioGroup name="pensionado" value={formData.pensionado} onValueChange={(v) => handleRadioChange('pensionado', v)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Si" id="p-si" /><Label htmlFor="p-si">Si</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="No" id="p-no" /><Label htmlFor="p-no">No</Label></div></RadioGroup></div>
                                <div className="flex flex-col gap-2"><Label>Tipo de Pensión</Label><RadioGroup name="tipoPension" value={formData.tipoPension} onValueChange={(v) => handleRadioChange('tipoPension', v)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Legal" id="tp-legal" /><Label htmlFor="tp-legal">Legal</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Convencional" id="tp-conv" /><Label htmlFor="tp-conv">Convencional</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="No" id="tp-no" /><Label htmlFor="tp-no">No</Label></div></RadioGroup></div>
                                <div className="md:col-span-3 grid md:grid-cols-3 gap-4">
                                  <div><Label htmlFor="ultimoCargo">Último cargo desempeñado</Label><Input id="ultimoCargo" name="ultimoCargo" value={formData.ultimoCargo} onChange={handleChange} /></div>
                                  <div><Label htmlFor="mesadaEmpresa">Mesada Actual empresa</Label><Input id="mesadaEmpresa" name="mesadaEmpresa" value={formData.mesadaEmpresa} onChange={handleChange} /></div>
                                  <div><Label htmlFor="mesadaColpensiones">Mesada Actual Colpensiones</Label><Input id="mesadaColpensiones" name="mesadaColpensiones" value={formData.mesadaColpensiones} onChange={handleChange} /></div>
                                </div>
                                <div><Label htmlFor="empresaPension">Empresa de la cual se pensionó</Label><Input id="empresaPension" name="empresaPension" placeholder="Ejemplo: Electricaribe" value={formData.empresaPension} onChange={handleChange} /></div>
                                <div className="flex flex-col gap-2"><Label>¿Está Compartido?</Label><RadioGroup name="compartido" value={formData.compartido} onValueChange={(v) => handleRadioChange('compartido', v)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Si" id="c-si" /><Label htmlFor="c-si">Si</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="No" id="c-no" /><Label htmlFor="c-no">No</Label></div></RadioGroup></div>
                                <div className="md:col-span-3"><Label htmlFor="motivo">¿Qué lo motiva o interesa acudir a nuestros servicios?</Label><Textarea id="motivo" name="motivo" value={formData.motivo} onChange={handleChange} /></div>
                            </div>
                        </section>
                        
                        {/* Placeholder for other sections */}
                        <section><h3 className="text-xl font-semibold mb-4 border-b pb-2 text-muted-foreground">II. Datos del Cónyuge (Opcional)</h3></section>
                        <section><h3 className="text-xl font-semibold mb-4 border-b pb-2 text-muted-foreground">III. Persona Autorizada para Recibir Información</h3></section>
                        <section><h3 className="text-xl font-semibold mb-4 border-b pb-2 text-muted-foreground">IV. Núcleo Familiar</h3></section>

                        <div className="flex items-start space-x-2">
                            <Checkbox id="autoriza" name="autoriza" checked={formData.autoriza} onCheckedChange={(checked) => setFormData(prev => ({...prev, autoriza: !!checked}))} />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="autoriza" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Autorizo el tratamiento de mis datos personales
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    He leído y acepto la Política de Tratamiento de Datos y autorizo a Dajusticia para el tratamiento de mis datos.
                                </p>
                            </div>
                        </div>

                        <div className="text-center">
                            <Button type="submit" size="lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Enviar Formulario
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
