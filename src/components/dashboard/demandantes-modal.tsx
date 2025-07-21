'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'https://appdajusticia.com/procesos.php';

export function DemandantesModal({ proceso, isOpen, onClose }: { proceso: any | null; isOpen: boolean; onClose: () => void }) {
  const [demandantes, setDemandantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    }
  }, [isOpen, proceso]);

  const handleAgregarCambio = (campo: string, valor: string) => {
    setNuevoDemandante((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleAgregar = async () => {
    if (!nuevoDemandante.nombre_demandante || !nuevoDemandante.identidad_demandante) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa los campos requeridos.' });
      return;
    }
    if (!proceso?.num_registro) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el número de registro del proceso.' });
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
       const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      toast({ title: 'Éxito', description: 'Demandante agregado correctamente.' });
      await fetchDemandantes(proceso.num_registro); // Recargar
      setNuevoDemandante({ nombre_demandante: '', identidad_demandante: '', poder: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al agregar', description: err.message });
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
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandantes.map((d, index) => (
                  <TableRow key={index}>
                    <TableCell>{d.nombre_demandante}</TableCell>
                    <TableCell>{d.identidad_demandante}</TableCell>
                    <TableCell>{d.poder}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled><Edit className="h-4 w-4 mr-1"/> Editar</Button>
                        <Button variant="destructive" size="sm" disabled><Trash2 className="h-4 w-4 mr-1"/> Eliminar</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                        <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SI">SI</SelectItem>
                          <SelectItem value="NO">NO</SelectItem>
                        </SelectContent>
                      </Select>
                  </TableCell>
                  <TableCell>
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
