'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, UserPlus, Edit, Trash2, Save, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';

const API_URL = 'https://appdajusticia.com/procesos.php';

export function DemandantesModal({ proceso, isOpen, onClose }: { proceso: any | null; isOpen: boolean; onClose: () => void }) {
  const [demandantes, setDemandantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [enEdicion, setEnEdicion] = useState<number | null>(null);
  const [valoresEditados, setValoresEditados] = useState<any>({});

  const [nuevoDemandante, setNuevoDemandante] = useState({
    nombre_demandante: '',
    identidad_demandante: '',
    poder: '',
  });

  const fetchDemandantes = async (num_registro: string) => {
    setCargando(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}?num_registro=${num_registro}`);
       if (!response.ok) {
        throw new Error('Error al obtener demandantes del servidor');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDemandantes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al cargar los demandantes.');
      setDemandantes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen && proceso?.num_registro) {
      fetchDemandantes(proceso.num_registro);
    } else {
      setDemandantes([]);
      setError(null);
      setEnEdicion(null);
      setValoresEditados({});
    }
  }, [isOpen, proceso]);

  const handleAgregarCambio = (campo: string, valor: string) => {
    setNuevoDemandante((prev) => ({ ...prev, [campo]: valor }));
  };
  
  const handleEditChange = (campo: string, valor: string) => {
    setValoresEditados((prev: any) => ({ ...prev, [campo]: valor }));
  };

  const handleEditar = (index: number) => {
    setEnEdicion(index);
    setValoresEditados(demandantes[index]);
  };

  const handleCancelar = () => {
    setEnEdicion(null);
    setValoresEditados({});
  };

  const handleGuardar = async (index: number) => {
    const cambios = valoresEditados;
    if (!cambios || !cambios.identidad_demandante) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se puede identificar el demandante para guardar.' });
      return;
    }

    const body = {
        action: 'editDemandante',
        num_registro: cambios.num_registro,
        identidad_demandante: cambios.identidad_demandante,
        cambios: {
            nombre_demandante: cambios.nombre_demandante,
            poder: cambios.poder,
        },
    };

    try {
        // 1. Guardar en API externa
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.error) throw new Error(`Error de la API externa: ${data.error}`);

        // 2. Guardar en Firebase
        const procesoDocRef = doc(db, 'procesos', cambios.num_registro);
        const demandanteDocRef = doc(collection(procesoDocRef, 'demandantes'), cambios.identidad_demandante);
        await updateDoc(demandanteDocRef, {
            nombre_demandante: cambios.nombre_demandante,
            poder: cambios.poder,
        });

        toast({ title: 'Éxito', description: 'Demandante actualizado en ambos sistemas.' });
        await fetchDemandantes(proceso.num_registro);
        handleCancelar();
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error al Guardar', description: err.message });
    }
  };

  const handleEliminar = async (index: number) => {
    const demandante = demandantes[index];
    if (!confirm('¿Estás seguro de que deseas eliminar este demandante de forma permanente?')) return;
    
    const body = {
      action: 'deleteDemandante',
      num_registro: demandante.num_registro,
      identidad_demandante: demandante.identidad_demandante,
    };
    
    try {
        // 1. Eliminar de API Externa
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.error) throw new Error(`Error de la API externa: ${data.error}`);
        
        // 2. Eliminar de Firebase
        const procesoDocRef = doc(db, 'procesos', demandante.num_registro);
        const demandanteDocRef = doc(collection(procesoDocRef, 'demandantes'), demandante.identidad_demandante);
        await deleteDoc(demandanteDocRef);
        
        toast({ title: 'Eliminado', description: 'Demandante eliminado de ambos sistemas.' });
        await fetchDemandantes(proceso.num_registro);
    } catch(err: any) {
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: err.message });
    }
  };


  const handleAgregar = async () => {
    if (!nuevoDemandante.nombre_demandante || !nuevoDemandante.identidad_demandante) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Por favor, complete los campos de nombre e identidad.' });
      return;
    }
    if (!proceso?.num_registro) {
      toast({ variant: 'destructive', title: 'Error de Proceso', description: 'No se encontró el número de registro del proceso.' });
      return;
    }

    const body = {
      action: 'addDemandante',
      num_registro: proceso.num_registro,
      nombre_demandante: nuevoDemandante.nombre_demandante,
      identidad_demandante: nuevoDemandante.identidad_demandante,
      poder: nuevoDemandante.poder || '',
    };
    
    try {
      // 1. Guardar en la API externa
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(`Error de la API externa: ${data.error}`);
      }

      // 2. Guardar en Firebase
      const procesoDocRef = doc(db, 'procesos', proceso.num_registro);
      const demandanteDocRef = doc(collection(procesoDocRef, 'demandantes'), nuevoDemandante.identidad_demandante);
      
      const firebaseData = {
          num_registro: proceso.num_registro,
          ...nuevoDemandante
      };
      
      await setDoc(demandanteDocRef, firebaseData);

      toast({ title: 'Éxito Total', description: 'Demandante agregado a la API externa y a Firebase.' });

      await fetchDemandantes(proceso.num_registro);
      setNuevoDemandante({ nombre_demandante: '', identidad_demandante: '', poder: '' });
      
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al Agregar', description: err.message });
      console.error("Error en operación de guardado dual:", err);
    }
  };


  if (!proceso) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Demandantes del Proceso #{proceso.num_registro}</DialogTitle>
          <DialogDescription>Gestiona los demandantes asociados a este proceso.</DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {cargando && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {error && <p className="text-red-500 p-4">Error: {error}</p>}
          
          {!cargando && !error && (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>N° Identidad</TableHead>
                  <TableHead>Poder</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandantes.map((d, index) => {
                   const modoEdicion = enEdicion === index;
                   return (
                     <TableRow key={d.identidad_demandante}>
                       <TableCell>
                         {modoEdicion ? (
                           <Input value={valoresEditados.nombre_demandante} onChange={(e) => handleEditChange('nombre_demandante', e.target.value)} />
                         ) : (
                           d.nombre_demandante
                         )}
                       </TableCell>
                       <TableCell>
                         {modoEdicion ? (
                           <Input value={valoresEditados.identidad_demandante} disabled />
                         ) : (
                           d.identidad_demandante
                         )}
                       </TableCell>
                       <TableCell>
                         {modoEdicion ? (
                           <Select value={valoresEditados.poder} onValueChange={(v) => handleEditChange('poder', v)}>
                             <SelectTrigger><SelectValue/></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="SI">SI</SelectItem>
                               <SelectItem value="NO">NO</SelectItem>
                             </SelectContent>
                           </Select>
                         ) : (
                           d.poder
                         )}
                       </TableCell>
                       <TableCell className="text-right">
                         {modoEdicion ? (
                           <div className="flex gap-2 justify-end">
                             <Button size="sm" onClick={() => handleGuardar(index)}><Save className="h-4 w-4 mr-1"/> Guardar</Button>
                             <Button variant="ghost" size="sm" onClick={handleCancelar}><XCircle className="h-4 w-4 mr-1"/> Cancelar</Button>
                           </div>
                         ) : (
                           <div className="flex gap-2 justify-end">
                             <Button variant="outline" size="sm" onClick={() => handleEditar(index)}><Edit className="h-4 w-4 mr-1"/> Editar</Button>
                             <Button variant="destructive" size="sm" onClick={() => handleEliminar(index)}><Trash2 className="h-4 w-4 mr-1"/> Eliminar</Button>
                           </div>
                         )}
                       </TableCell>
                     </TableRow>
                   )
                })}
                {/* Fila para agregar */}
                <TableRow>
                  <TableCell>
                    <Input placeholder="Nombre" value={nuevoDemandante.nombre_demandante} onChange={(e) => handleAgregarCambio('nombre_demandante', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input placeholder="Identidad" value={nuevoDemandante.identidad_demandante} onChange={(e) => handleAgregarCambio('identidad_demandante', e.target.value)} />
                  </TableCell>
                  <TableCell>
                     <Select onValueChange={(value) => handleAgregarCambio('poder', value)} value={nuevoDemandante.poder}>
                        <SelectTrigger><SelectValue placeholder="Poder" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SI">SI</SelectItem>
                          <SelectItem value="NO">NO</SelectItem>
                        </SelectContent>
                      </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={handleAgregar}><UserPlus className="h-4 w-4 mr-1"/> Agregar</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
