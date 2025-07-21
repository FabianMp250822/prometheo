'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Search, Trash2, Edit, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Anotacion } from '@/lib/data';
import { corregirTexto, transformarFecha, convertirAFormatoOrdenable, convertirHoraLimite, anadirPrefijoRuta } from '@/lib/anotaciones-helpers';
import { NuevaAnotacionModal } from './nueva-anotacion-modal';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DocumentViewerModal } from './document-viewer-modal';


const ANOTACIONES_API = 'https://appdajusticia.com/anotaciones.php';

export function AnotacionesModal({ proceso, anotaciones: initialAnotaciones, isOpen, onClose }: { proceso: any | null; anotaciones: any[]; isOpen: boolean; onClose: () => void }) {
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [anotacionParaEditar, setAnotacionParaEditar] = useState<Anotacion | null>(null);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && Array.isArray(initialAnotaciones)) {
        const anotacionesCorregidas = initialAnotaciones.map((a: any) => ({
        ...a,
        fecha: transformarFecha(a.fecha),
        fecha_limite: transformarFecha(a.fecha_limite),
        detalle: corregirTexto(a.detalle),
        archivo_url: anadirPrefijoRuta(a.archivo_url),
      }));

      // Sort ascending (oldest first)
      anotacionesCorregidas.sort((a, b) => {
        const fechaA = convertirAFormatoOrdenable(a.fecha);
        const fechaB = convertirAFormatoOrdenable(b.fecha);
        if (fechaA < fechaB) return -1;
        if (fechaA > fechaB) return 1;
        
        const horaA = convertirHoraLimite(a.hora_limite);
        const horaB = convertirHoraLimite(b.hora_limite);
        if (horaA < horaB) return -1;
        if (horaA > horaB) return 1;
        
        return 0;
      });

      setAnotaciones(anotacionesCorregidas);
    }
  }, [isOpen, initialAnotaciones]);

  const anotacionesFiltradas = useMemo(() => {
    if (!busqueda) return anotaciones;
    return anotaciones.filter(a => 
      a.detalle.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [busqueda, anotaciones]);

  const handleEditar = (anotacion: Anotacion) => {
    setAnotacionParaEditar(anotacion);
    setShowNuevoModal(true);
  };

  const handleEliminar = async (auto: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta anotación?')) return;

    try {
        const formData = new FormData();
        formData.append('action', 'deleteAnotacion');
        formData.append('auto', auto);

        const response = await fetch(ANOTACIONES_API, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.error) throw new Error(`Error de la API: ${data.error}`);
        
        // Also delete from Firebase
        const anotacionDocRef = doc(db, 'procesos', proceso.num_registro, 'anotaciones', auto);
        await deleteDoc(anotacionDocRef);
        
        toast({ title: 'Éxito', description: 'Anotación eliminada de ambos sistemas.' });
        // TODO: Need a way to refresh the data in the parent component
        onClose();


    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: err.message });
    }
  };
  
  const handleViewDocument = (url: string, title: string) => {
    setDocumentUrl(url);
    setDocumentTitle(title);
  };

  const handleCloseNuevoModal = () => {
    setShowNuevoModal(false);
    setAnotacionParaEditar(null);
    // TODO: Need a way to refresh the data in the parent component
    onClose();
  };

  if (!proceso) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anotaciones del Proceso #{proceso.num_registro}</DialogTitle>
            <DialogDescription>Gestiona las anotaciones, recordatorios y documentos asociados a este proceso.</DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar en anotaciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowNuevoModal(true)}>
              <PlusCircle className="mr-2 h-4 w-4"/>
              Agregar Anotación
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {cargando && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
            {error && <p className="text-red-500 p-4">Error: {error}</p>}
            
            {!cargando && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Actuación</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Clase</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anotacionesFiltradas.length > 0 ? anotacionesFiltradas.map((anotacion) => (
                    <TableRow key={anotacion.auto}>
                      <TableCell>{anotacion.fecha || '-'}</TableCell>
                      <TableCell className="max-w-sm whitespace-pre-wrap">{anotacion.detalle}</TableCell>
                      <TableCell>{anotacion.clase}</TableCell>
                      <TableCell>{anotacion.fecha_limite || '-'}</TableCell>
                      <TableCell>
                        {anotacion.archivo_url && anotacion.nombre_documento ? (
                           <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDocument(anotacion.archivo_url!, anotacion.nombre_documento!)}
                            >
                                <FileDown className="h-3 w-3 mr-1" />
                                Ver
                           </Button>
                        ) : (
                            <span className="text-xs text-muted-foreground">No adjunto</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleEditar(anotacion)}><Edit className="h-3 w-3 mr-1"/> Editar</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleEliminar(anotacion.auto)}><Trash2 className="h-3 w-3 mr-1"/> Eliminar</Button>
                        </div>
                       </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">No se encontraron anotaciones.</TableCell>
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
        <NuevaAnotacionModal
          isOpen={showNuevoModal}
          onClose={handleCloseNuevoModal}
          proceso={proceso}
          anotacionExistente={anotacionParaEditar}
        />
      )}

      {documentUrl && (
        <DocumentViewerModal
          url={documentUrl}
          title={documentTitle || "Visor de Documento"}
          onClose={() => setDocumentUrl(null)}
        />
      )}
    </>
  );
}
