'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Search, Trash2, Edit, FileDown, Upload, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NuevaAnexoModal } from './nueva-anexo-modal';

type Anexo = {
  auto: string;
  nombre_documento: string;
  descripccion: string;
  ruta_archivo: string;
};

export function AnexosModal({ proceso, isOpen, onClose }: { proceso: any | null; isOpen: boolean; onClose: () => void }) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [showNuevoModal, setShowNuevoModal] = useState(false);

  // useEffect(() => {
  //   if (isOpen && proceso?.num_registro) {
  //     // This fetch is disabled to prevent 403 Forbidden errors from the external server.
  //     // The functionality will be migrated to Firebase.
  //   }
  // }, [isOpen, proceso]);

  const anexosFiltrados = useMemo(() => {
    if (!busqueda) return anexos;
    return anexos.filter(a =>
      (a.nombre_documento || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.descripccion || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [busqueda, anexos]);
  
  const handleEliminar = async (auto: string) => {
    // Logic to delete from Firebase will be implemented here.
    toast({ title: 'En desarrollo', description: 'La eliminación de anexos se conectará a Firebase.' });
  };


  const handleCloseNuevoModal = () => {
    setShowNuevoModal(false);
    // Logic to refresh from Firebase will be implemented here.
  };

  if (!proceso) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anexos del Proceso #{proceso.num_registro}</DialogTitle>
            <DialogDescription>Gestiona los documentos adjuntos a este proceso.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en anexos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowNuevoModal(true)}>
              <FileUp className="mr-2 h-4 w-4"/>
              Agregar Anexo
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {cargando && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
            
            {!cargando && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Documento</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anexosFiltrados.length > 0 ? anexosFiltrados.map((anexo) => (
                    <TableRow key={anexo.auto}>
                      <TableCell className="font-medium">{anexo.nombre_documento}</TableCell>
                      <TableCell className="text-muted-foreground">{anexo.descripccion}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button asChild variant="outline" size="sm">
                            <a href={`https://appdajusticia.com/${anexo.ruta_archivo}`} target="_blank" rel="noopener noreferrer">
                              <FileDown className="h-3 w-3 mr-1" /> Ver
                            </a>
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleEliminar(anexo.auto)}>
                            <Trash2 className="h-3 w-3 mr-1"/> Eliminar
                          </Button>
                        </div>
                       </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">No se encontraron anexos.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {showNuevoModal && (
        <NuevaAnexoModal
          isOpen={showNuevoModal}
          onClose={handleCloseNuevoModal}
          proceso={proceso}
        />
      )}
    </>
  );
}
