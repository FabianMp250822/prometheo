
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, getDocs, query, where, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { UserPlus, Loader2, PlusCircle, Trash2, FileUp, Search, UserCheck } from 'lucide-react';
import { formatCurrency, parseEmployeeName } from '@/lib/helpers';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

type SearchResult = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  source: 'pensionado' | 'cliente';
};

export default function AgregarClientePage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedExistingClient, setSelectedExistingClient] = useState<SearchResult | null>(null);

  const [salarioMinimo, setSalarioMinimo] = useState(1300000);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [nuevoGrupo, setNuevoGrupo] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    correo: '',
    telefonoFijo: '',
    celular: '',
    salario: salarioMinimo * 2,
    multiplicadorSalario: 2,
    plazoMeses: 0,
    cuotaMensual: '0',
    grupo: "",
    direccion: '',
  });
  
  const [convenioPagoFile, setConvenioPagoFile] = useState<File | null>(null);
  const [otrosArchivos, setOtrosArchivos] = useState<{ nombreArchivo: string, archivo: File | null }[]>([{ nombreArchivo: '', archivo: null }]);

  const fetchGrupos = useCallback(async () => {
    try {
      const gruposSnapshot = await getDocs(collection(db, "grupos"));
      const gruposFirebase = gruposSnapshot.docs.map((doc) => doc.data().nombre as string);
      setGrupos(gruposFirebase);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los grupos.' });
    }
  }, [toast]);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  const searchExistingUsers = useCallback(async (searchVal: string) => {
    if (searchVal.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSelectedExistingClient(null); // Reset on new search
    try {
      const resultsMap = new Map<string, SearchResult>();

      // Search in 'nuevosclientes' by Cédula
      const clientesCedulaQuery = query(collection(db, "nuevosclientes"), where("cedula", ">=", searchVal), where("cedula", "<=", searchVal + '\uf8ff'), limit(5));
      const clientesCedulaSnap = await getDocs(clientesCedulaQuery);
      clientesCedulaSnap.forEach(doc => {
          const data = doc.data();
          resultsMap.set(data.cedula, { id: doc.id, nombres: data.nombres, apellidos: data.apellidos, cedula: data.cedula, source: 'cliente' });
      });
      
      // Search in 'pensionados' by Documento
      const pensionadosCedulaQuery = query(collection(db, "pensionados"), where("documento", ">=", searchVal), where("documento", "<=", searchVal + '\uf8ff'), limit(5));
      const pensionadosCedulaSnap = await getDocs(pensionadosCedulaQuery);
      pensionadosCedulaSnap.forEach(doc => {
          const data = doc.data();
          const { nombres, apellidos } = parseEmployeeName(data.empleado);
          if (!resultsMap.has(data.documento)) {
            resultsMap.set(data.documento, { id: doc.id, nombres, apellidos, cedula: data.documento, source: 'pensionado' });
          }
      });
      
      // If search is not numeric, also search by name
      if (isNaN(Number(searchVal))) {
        const searchUpper = searchVal.toUpperCase();
        
        // Search in 'nuevosclientes' by Nombre
        const clientesNameQuery = query(collection(db, "nuevosclientes"), where("nombres", ">=", searchUpper), where("nombres", "<=", searchUpper + '\uf8ff'), limit(5));
        const clientesNameSnap = await getDocs(clientesNameQuery);
        clientesNameSnap.forEach(doc => {
          const data = doc.data();
          if (!resultsMap.has(data.cedula)) {
            resultsMap.set(data.cedula, { id: doc.id, nombres: data.nombres, apellidos: data.apellidos, cedula: data.cedula, source: 'cliente' });
          }
        });

        // Search in 'pensionados' by Empleado
        const pensionadosNameQuery = query(collection(db, "pensionados"), where("empleado", ">=", searchUpper), where("empleado", "<=", searchUpper + '\uf8ff'), limit(5));
        const pensionadosNameSnap = await getDocs(pensionadosNameQuery);
        pensionadosNameSnap.forEach(doc => {
          const data = doc.data();
          const { nombres, apellidos } = parseEmployeeName(data.empleado);
          if (!resultsMap.has(data.documento)) {
            resultsMap.set(data.documento, { id: doc.id, nombres, apellidos, cedula: data.documento, source: 'pensionado' });
          }
        });
      }

      setSearchResults(Array.from(resultsMap.values()));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error de Búsqueda', description: error.message });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);
  
  useEffect(() => {
      searchExistingUsers(debouncedSearchTerm);
  }, [debouncedSearchTerm, searchExistingUsers]);

  const handleSelectUser = (user: SearchResult) => {
    setFormData(prev => ({
        ...prev,
        nombres: user.nombres,
        apellidos: user.apellidos,
        cedula: user.cedula,
        // Reset other fields
        correo: '',
        telefonoFijo: '',
        celular: '',
        direccion: '',
    }));
    setSearchTerm(`${user.nombres} ${user.apellidos}`);
    setIsDropdownVisible(false);
    if(user.source === 'cliente') {
        setSelectedExistingClient(user);
    } else {
        setSelectedExistingClient(null);
    }
  };
  
  const calcularCuota = (salario: number, plazoMeses: number): string => {
    if (salario > 0 && plazoMeses > 0) {
      return (salario / plazoMeses).toFixed(2);
    }
    return '0';
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let updatedForm = { ...formData, [name]: value };

    if (name === 'multiplicadorSalario') {
      const multiplicador = Number(value);
      const nuevoSalario = salarioMinimo * multiplicador;
      updatedForm.salario = nuevoSalario;
      updatedForm.cuotaMensual = calcularCuota(nuevoSalario, Number(updatedForm.plazoMeses));
    }

    if (name === 'plazoMeses') {
      updatedForm.cuotaMensual = calcularCuota(Number(formData.salario), Number(value));
    }
    
    if (name === 'salario') {
       updatedForm.cuotaMensual = calcularCuota(Number(value), Number(updatedForm.plazoMeses));
    }

    setFormData(updatedForm);
  };
  
  const handleGrupoChange = (value: string) => {
    if (value === 'nueva-opcion') {
      setIsAddingGroup(true);
      setFormData(prev => ({...prev, grupo: ''}));
    } else {
      setIsAddingGroup(false);
      setFormData(prev => ({...prev, grupo: value}));
    }
  };
  
   const handleNuevoGrupoSubmit = async () => {
    if (nuevoGrupo.trim() !== "") {
      try {
        await addDoc(collection(db, "grupos"), { nombre: nuevoGrupo });
        toast({ title: 'Éxito', description: 'Nuevo grupo agregado con éxito.' });
        await fetchGrupos(); // Refresh groups list
        setFormData(prev => ({...prev, grupo: nuevoGrupo}));
        setNuevoGrupo("");
        setIsAddingGroup(false);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al guardar el nuevo grupo.' });
      }
    }
  };
  
  const handleOtroArchivoChange = (index: number, field: 'nombre' | 'file', value: string | File | null) => {
      const newOtros = [...otrosArchivos];
      if(field === 'nombre') newOtros[index].nombreArchivo = value as string;
      if(field === 'file') newOtros[index].archivo = value as File;
      setOtrosArchivos(newOtros);
  };
  
  const addOtroArchivo = () => {
      setOtrosArchivos([...otrosArchivos, { nombreArchivo: '', archivo: null }]);
  };

  const removeOtroArchivo = (index: number) => {
      setOtrosArchivos(otrosArchivos.filter((_, i) => i !== index));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExistingClient) {
        toast({ variant: 'destructive', title: 'Cliente ya Existe', description: 'Este cliente ya está registrado. No se puede crear un duplicado.' });
        return;
    }
    setIsSaving(true);
    
     const archivoSinNombre = otrosArchivos.find(
      (archivo) => archivo.archivo && !archivo.nombreArchivo.trim()
    );
    if (archivoSinNombre) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Un archivo adjunto no tiene un nombre asignado.' });
      setIsSaving(false);
      return;
    }

    try {
      const archivosURLs: { [key: string]: string } = {};

      if (convenioPagoFile) {
        const storageRef = ref(storage, `convenios/${formData.cedula}_${convenioPagoFile.name}`);
        await uploadBytes(storageRef, convenioPagoFile);
        archivosURLs['convenioPago'] = await getDownloadURL(storageRef);
      }

      for (const archivoObj of otrosArchivos) {
        if (archivoObj.archivo) {
          const storageRef = ref(storage, `otros/${formData.cedula}_${archivoObj.archivo.name}`);
          await uploadBytes(storageRef, archivoObj.archivo);
          archivosURLs[archivoObj.nombreArchivo] = await getDownloadURL(storageRef);
        }
      }

      const dataToSave = { ...formData, salario: Number(formData.salario), archivos: archivosURLs };
      await addDoc(collection(db, "nuevosclientes"), dataToSave);
      
      toast({ title: 'Éxito', description: 'Cliente registrado exitosamente.' });
      // Reset form
      setFormData({
        nombres: '', apellidos: '', cedula: '', correo: '', telefonoFijo: '', celular: '',
        salario: salarioMinimo * 2, multiplicadorSalario: 2, plazoMeses: 0, cuotaMensual: '0',
        grupo: "", direccion: '',
      });
      setConvenioPagoFile(null);
      setOtrosArchivos([{ nombreArchivo: '', archivo: null }]);
      setSearchTerm('');
      setSearchResults([]);
      setSelectedExistingClient(null);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Ocurrió un error al registrar el cliente: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Agregar Nuevo Cliente
          </CardTitle>
          <CardDescription>Busque para pre-llenar datos o complete el formulario para registrar un nuevo cliente.</CardDescription>
        </CardHeader>
      </Card>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
            <CardHeader><CardTitle className="text-xl">1. Búsqueda y Datos Personales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, apellidos o cédula para autocompletar..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsDropdownVisible(true);
                        }}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 150)}
                        onFocus={() => setIsDropdownVisible(true)}
                        className="pl-10"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                     {isDropdownVisible && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {searchResults.map(user => (
                                <div
                                    key={user.id}
                                    className="p-3 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSelectUser(user)}
                                >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium">{user.nombres} {user.apellidos}</p>
                                        <p className="text-sm text-muted-foreground">C.C. {user.cedula}</p>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded-full ${user.source === 'cliente' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.source === 'cliente' ? 'Cliente Registrado' : 'Pensionado'}
                                      </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedExistingClient && (
                    <Alert variant="destructive">
                        <UserCheck className="h-4 w-4" />
                        <AlertTitle>Cliente ya Registrado</AlertTitle>
                        <AlertDescription>
                            Este cliente ya existe en la base de datos de DAJUSTICIA. No se puede crear un duplicado.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div><Label htmlFor="nombres">Nombres</Label><Input id="nombres" name="nombres" value={formData.nombres} onChange={handleChange} required/></div>
                    <div><Label htmlFor="apellidos">Apellidos</Label><Input id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} required /></div>
                    <div><Label htmlFor="cedula">Cédula</Label><Input id="cedula" name="cedula" value={formData.cedula} onChange={handleChange} required /></div>
                    <div><Label htmlFor="direccion">Dirección</Label><Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} required /></div>
                    <div><Label htmlFor="correo">Correo Electrónico</Label><Input type="email" id="correo" name="correo" value={formData.correo} onChange={handleChange} required /></div>
                    <div><Label htmlFor="telefonoFijo">Teléfono Fijo</Label><Input type="tel" id="telefonoFijo" name="telefonoFijo" value={formData.telefonoFijo} onChange={handleChange} /></div>
                    <div><Label htmlFor="celular">Celular</Label><Input type="tel" id="celular" name="celular" value={formData.celular} onChange={handleChange} required /></div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="text-xl">2. Información de Contrato y Pagos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grupo">Grupo</Label>
                <Select name="grupo" value={formData.grupo} onValueChange={handleGrupoChange} required>
                  <SelectTrigger><SelectValue placeholder="Seleccione un grupo" /></SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => <SelectItem key={g} value={g}>{g.toUpperCase()}</SelectItem>)}
                    <SelectItem value="nueva-opcion">AGREGAR NUEVO GRUPO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAddingGroup && (
                <div className="flex items-end gap-2">
                    <div className="flex-1"><Label htmlFor="nuevoGrupo">Nombre del Nuevo Grupo</Label><Input id="nuevoGrupo" value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)} /></div>
                    <Button type="button" onClick={handleNuevoGrupoSubmit} disabled={!nuevoGrupo.trim()}><PlusCircle className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div><Label>Aporte Op.</Label><Input value={formatCurrency(salarioMinimo)} readOnly className="bg-muted" /></div>
                  <div><Label htmlFor="multiplicadorSalario">Multiplicador</Label><Input type="number" id="multiplicadorSalario" name="multiplicadorSalario" min="1" max="10" value={formData.multiplicadorSalario} onChange={handleChange} required /></div>
                  <div><Label htmlFor="salario">Salario a Cancelar</Label><Input type="number" id="salario" name="salario" value={formData.salario} onChange={handleChange} /></div>
                  <div><Label htmlFor="plazoMeses">Plazo (Meses)</Label><Input type="number" id="plazoMeses" name="plazoMeses" value={formData.plazoMeses} onChange={handleChange} required /></div>
                  <div className="md:col-span-2 lg:col-span-4"><Label>Cuota Mensual Calculada</Label><Input value={formatCurrency(parseFloat(formData.cuotaMensual))} readOnly className="font-bold text-lg h-auto bg-muted" /></div>
             </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle className="text-xl">3. Carga de Documentos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div><Label htmlFor="convenioPagoFile">Convenio de Pago</Label><Input type="file" id="convenioPagoFile" name="convenioPagoFile" onChange={(e) => setConvenioPagoFile(e.target.files ? e.target.files[0] : null)} /></div>
                
                <Label>Otros Archivos</Label>
                <div className="space-y-2">
                {otrosArchivos.map((archivo, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <Input placeholder="Nombre del Archivo" value={archivo.nombreArchivo} onChange={(e) => handleOtroArchivoChange(index, 'nombre', e.target.value)} className="flex-1" />
                        <Input type="file" onChange={(e) => handleOtroArchivoChange(index, 'file', e.target.files ? e.target.files[0] : null)} className="flex-1" />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeOtroArchivo(index)} disabled={otrosArchivos.length === 1}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                </div>
                 <Button type="button" variant="outline" size="sm" onClick={addOtroArchivo}><PlusCircle className="mr-2 h-4 w-4" />Añadir Otro Archivo</Button>
            </CardContent>
        </Card>
        
        <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSaving || !!selectedExistingClient}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Registrar Cliente
            </Button>
        </div>
      </form>
    </div>
  );
}
