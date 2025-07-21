'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Save, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Anotacion } from '@/lib/data';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
    nombre_documento: '',
    archivo_url: ''
  });
  const [file, setFile] = useState<File | null>(null);
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
        nombre_documento: anotacionExistente.nombre_documento || '',
        archivo_url: anotacionExistente.archivo_url || '',
      });
    } else {
      setFormData({
        detalle: '',
        clase: '',
        fecha: '',
        fecha_limite: '',
        hora_limite: '',
        nombre_documento: '',
        archivo_url: '',
      });
    }
  }, [anotacionExistente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let fileUrl = anotacionExistente?.archivo_url || '';
      let fileName = anotacionExistente?.nombre_documento || '';

      if (file) {
        const storageRef = ref(storage, `anotaciones/${proceso.num_registro}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(uploadResult.ref);
        fileName = file.name;
      }
      
      const dataToSave = {
        ...formData,
        archivo_url: fileUrl,
        nombre_documento: fileName,
        num_registro: proceso.num_registro,
      };

      const anotacionesCollectionRef = collection(db, 'procesos', proceso.num_registro, 'anotaciones');

      if (anotacionExistente?.id) {
        const anotacionDocRef = doc(anotacionesCollectionRef, anotacionExistente.id);
        await setDoc(anotacionDocRef, dataToSave, { merge: true });
        toast({ title: 'Éxito', description: 'Anotación actualizada correctamente.' });
      } else {
        await addDoc(anotacionesCollectionRef, dataToSave);
        toast({ title: 'Éxito', description: 'Anotación creada correctamente.' });
      }
      
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
              Complete los detalles. Los cambios se guardarán en Firebase.
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">Archivo</Label>
              <Input id="file" type="file" onChange={handleFileChange} className="col-span-3" />
            </div>
            {formData.archivo_url && !file && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3 text-sm text-muted-foreground">
                  Archivo actual: {formData.nombre_documento}
                </div>
              </div>
            )}
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
