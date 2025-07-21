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
import { doc, setDoc, collection, updateDoc, deleteDoc, getDocs, addDoc } from 'firebase/firestore';

export function DemandantesModal({ proceso, isOpen, onClose }: { proceso: any | null; isOpen: boolean; onClose: () => void }) {
  const [demandantes, setDemandantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const { toast } = useToast();

  const [enEdicion, setEnEdicion] = useState<string | null>(null);
  const [valoresEditados, setValoresEditados] = useState<any>({});

  const [nuevoDemandante, setNuevoDemandante] = useState({
    nombre_demandante: '',
    identidad_demandante: '',
    poder: '',
  });

  const fetchDemandantesFromFirebase = async (num_registro: string) => {
    setCargando(true);
    try {
      const demandantesCollectionRef = collection(db, 'procesos', num_registro, 'demandantes');
      const querySnapshot = await getDocs(demandantesCollectionRef);
      const demandantesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDemandantes(demandantesData);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al cargar los demandantes desde Firebase.' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen && proceso?.num_registro) {
      fetchDemandantesFromFirebase(proceso.num_registro);
    }
  }, [isOpen, proceso]);

  const handleAgregarCambio = (campo: string, valor: string) => {
    setNuevoDemandante((prev) => ({ ...prev, [campo]: valor }));
  };
  
  const handleEditChange = (campo: string, valor: string) => {
    setValoresEditados((prev: any) => ({ ...prev, [campo]: valor }));
  };

  const handleEditar = (demandante: any) => {
    setEnEdicion(demandante.id);
    setValoresEditados(demandante);
  };

  const handleCancelar = () => {
    setEnEdicion(null);
    setValoresEditados({});
  };

  const handleGuardar = async (demandanteId: string) => {
    if (!proceso?.num_registro) return;

    try {
        const demandanteDocRef = doc(db, 'procesos', proceso.num_registro, 'demandantes', demandanteId);
        await updateDoc(demandanteDocRef, valoresEditados);
        toast({ title: 'Éxito', description: 'Demandante actualizado en Firebase.' });
        fetchDemandantesFromFirebase(proceso.num_registro);
        handleCancelar();
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error al Guardar', description: err.message });
    }
  };

  const handleEliminar = async (demandanteId: string) => {
     if (!proceso?.num_registro) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este demandante de forma permanente?')) return;
    
    try {
        const demandanteDocRef = doc(db, 'procesos', proceso.num_registro, 'demandantes', demandanteId);
        await deleteDoc(demandanteDocRef);
        toast({ title: 'Eliminado', description: 'Demandante eliminado de Firebase.' });
        fetchDemandantesFromFirebase(proceso.num_registro);
    } catch(err: any) {
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: err.message });
    }
  };


  const handleAgregar = async () => {
    if (!nuevoDemandante.nombre_demandante || !nuevoDemandante.identidad_demandante) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Por favor, complete los campos de nombre e identidad.' });
      return;
    }
    if (!proceso?.num_registro) return;

    try {
      const demandantesCollectionRef = collection(db, 'procesos', proceso.num_registro, 'demandantes');
      await addDoc(demandantesCollectionRef, {
        num_registro: proceso.num_registro,
        ...nuevoDemandante
      });

      toast({ title: 'Éxito', description: 'Demandante agregado a Firebase.' });

      fetchDemandantesFromFirebase(proceso.num_registro);
      setNuevoDemandante({ nombre_demandante: '', identidad_demandante: '', poder: '' });
      
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al Agregar', description: err.message });
    }
  };


  if (!proceso) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Demandantes del Proceso #{proceso.num_registro}</DialogTitle>
          <DialogDescription>Gestiona los demandantes asociados a este proceso desde Firebase.</DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {cargando && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          
          {!cargando && (
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
                {demandantes.map((d) => {
                   const modoEdicion = enEdicion === d.id;
                   return (
                     <TableRow key={d.id}>
                       <TableCell>
                         {modoEdicion ? (
                           <Input value={valoresEditados.nombre_demandante} onChange={(e) => handleEditChange('nombre_demandante', e.target.value)} />
                         ) : (
                           d.nombre_demandante
                         )}
                       </TableCell>
                       <TableCell>
                         {modoEdicion ? (
                           <Input value={valoresEditados.identidad_demandante} onChange={(e) => handleEditChange('identidad_demandante', e.target.value)} />
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
                             <Button size="sm" onClick={() => handleGuardar(d.id)}><Save className="h-4 w-4 mr-1"/> Guardar</Button>
                             <Button variant="ghost" size="sm" onClick={handleCancelar}><XCircle className="h-4 w-4 mr-1"/> Cancelar</Button>
                           </div>
                         ) : (
                           <div className="flex gap-2 justify-end">
                             <Button variant="outline" size="sm" onClick={() => handleEditar(d)}><Edit className="h-4 w-4 mr-1"/> Editar</Button>
                             <Button variant="destructive" size="sm" onClick={() => handleEliminar(d.id)}><Trash2 className="h-4 w-4 mr-1"/> Eliminar</Button>
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
