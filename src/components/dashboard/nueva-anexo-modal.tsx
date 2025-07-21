'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Save, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addAnexo } from '@/app/actions/anexos-api';

interface NuevaAnexoModalProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: any;
}

export function NuevaAnexoModal({ isOpen, onClose, proceso }: NuevaAnexoModalProps) {
  const [formData, setFormData] = useState({
    descripccion: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar un archivo para subir.' });
      return;
    }
    setIsSaving(true);
    
    const apiFormData = new FormData();
    apiFormData.append('num_registro', proceso.num_registro);
    apiFormData.append('descripccion', formData.descripccion);
    apiFormData.append('archivo_adjunto', file);

    try {
      const result = await addAnexo(apiFormData);
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast({ title: 'Éxito', description: 'Anexo agregado correctamente.' });
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Anexo</DialogTitle>
            <DialogDescription>
              Seleccione un archivo y añada una descripción. El anexo se guardará en el sistema externo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="archivo_adjunto">Archivo</Label>
              <Input id="archivo_adjunto" type="file" onChange={handleFileChange} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="descripccion">Descripción</Label>
              <Textarea id="descripccion" name="descripccion" value={formData.descripccion} onChange={handleChange} placeholder="Añada una descripción del anexo..." />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Guardar Anexo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
