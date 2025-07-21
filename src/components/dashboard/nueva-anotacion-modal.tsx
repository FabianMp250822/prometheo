'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Anotacion } from '@/lib/data';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ANOTACIONES_API = 'https://appdajusticia.com/anotaciones.php';

interface NuevaAnotacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: any;
  anotacionExistente: Anotacion | null;
}

export function NuevaAnotacionModal({ isOpen, onClose, proceso, anotacionExistente }: NuevaAnotacionModalProps) {
  const [formData, setFormData] = useState({
    detalle: '',
    clase: '',
    fecha: '',
    fecha_limite: '',
    hora_limite: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (anotacionExistente) {
      setFormData({
        detalle: anotacionExistente.detalle || '',
        clase: anotacionExistente.clase || '',
        fecha: anotacionExistente.fecha || '',
        fecha_limite: anotacionExistente.fecha_limite || '',
        hora_limite: anotacionExistente.hora_limite || '',
      });
    } else {
      setFormData({
        detalle: '',
        clase: '',
        fecha: '',
        fecha_limite: '',
        hora_limite: '',
      });
    }
  }, [anotacionExistente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const action = anotacionExistente ? 'editAnotacion' : 'addAnotacion';
    
    const apiFormData = new FormData();
    apiFormData.append('action', action);
    apiFormData.append('num_registro', proceso.num_registro);
    if (anotacionExistente) {
      apiFormData.append('auto', anotacionExistente.auto);
    }
    Object.entries(formData).forEach(([key, value]) => {
      apiFormData.append(key, value);
    });

    try {
      // 1. Save to external API
      const response = await fetch(ANOTACIONES_API, {
        method: 'POST',
        body: apiFormData,
      });

      const data = await response.json();
      if (data.error) throw new Error(`Error de la API: ${data.error}`);

      // 2. Save to Firebase
      // If it's a new anotacion, the API returns the new 'auto' id
      const anotacionId = anotacionExistente ? anotacionExistente.auto : data.auto;
      if (!anotacionId) throw new Error("No se recibió un ID para la anotación.");

      const anotacionDocRef = doc(db, 'procesos', proceso.num_registro, 'anotaciones', anotacionId.toString());
      const firebaseData = {
          ...formData,
          auto: anotacionId.toString(),
          num_registro: proceso.num_registro,
      };

      await setDoc(anotacionDocRef, firebaseData, { merge: true });

      toast({
        title: 'Éxito',
        description: `Anotación ${anotacionExistente ? 'actualizada' : 'creada'} correctamente en ambos sistemas.`,
      });
      onClose();

    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{anotacionExistente ? 'Editar Anotación' : 'Agregar Nueva Anotación'}</DialogTitle>
            <DialogDescription>
              Complete los detalles de la anotación. Los cambios se guardarán en la API externa y en Firebase.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="detalle" className="text-right">Detalle</Label>
              <Textarea id="detalle" name="detalle" value={formData.detalle} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clase" className="text-right">Clase</Label>
              <Input id="clase" name="clase" value={formData.clase} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fecha" className="text-right">Fecha Actuación</Label>
                <Input id="fecha" name="fecha" type="text" placeholder="DD-MM-YYYY" value={formData.fecha} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fecha_limite" className="text-right">Fecha Límite</Label>
                <Input id="fecha_limite" name="fecha_limite" type="text" placeholder="DD-MM-YYYY" value={formData.fecha_limite} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hora_limite" className="text-right">Hora Límite</Label>
                <Input id="hora_limite" name="hora_limite" type="text" placeholder="HH:MM am/pm" value={formData.hora_limite} onChange={handleChange} className="col-span-3" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
