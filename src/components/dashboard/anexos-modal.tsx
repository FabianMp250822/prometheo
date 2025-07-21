'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Search, Trash2, FileDown, FileUp, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NuevaAnexoModal } from './nueva-anexo-modal';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DocumentViewerModal } from './document-viewer-modal';

type Anexo = {
  id: string;
  auto: string;
  nombre_documento: string;
  descripccion: string;
  ruta_archivo: string;
};

export function AnexosModal({ proceso, isOpen, onClose }: { proceso: any | null; isOpen: boolean; onClose: () => void }) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [cargando, setCargando] = useState(false);
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  const fetchAnexosFromFirebase = useCallback(async (numRegistro: string) => {
    setCargando(true);
    try {
      const anexosCollectionRef = collection(db, 'procesos', numRegistro, 'anexos');
      const querySnapshot = await getDocs(anexosCollectionRef);
      const anexosData = querySnapshot.docs.map(doc => ({ 
          id: doc.id,
          ...doc.data()
      } as Anexo));
      setAnexos(anexosData);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al cargar los anexos desde Firebase.' });
    } finally {
      setCargando(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isOpen && proceso?.num_registro) {
      fetchAnexosFromFirebase(proceso.num_registro);
    }
  }, [isOpen, proceso, fetchAnexosFromFirebase]);


  const anexosFiltrados = useMemo(() => {
    if (!busqueda) return anexos;
    return anexos.filter(a =>
      (a.nombre_documento || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.descripccion || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [busqueda, anexos]);
  
  const handleEliminar = async (anexoId: string) => {
    if (!proceso?.num_registro || !anexoId) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este anexo de Firebase? Esto no se puede deshacer.')) return;
    
    try {
        const anexoDocRef = doc(db, 'procesos', proceso.num_registro, 'anexos', anexoId);
        await deleteDoc(anexoDocRef);
        // Note: This does not delete the file from Storage, only the Firestore record.
        toast({ title: 'Éxito', description: 'Registro del anexo eliminado de Firebase.' });
        fetchAnexosFromFirebase(proceso.num_registro);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: err.message });
    }
  };


  const handleCloseNuevoModal = () => {
    setShowNuevoModal(false);
    if (proceso?.num_registro) {
      fetchAnexosFromFirebase(proceso.num_registro);
    }
  };

  const handleViewDocument = (url: string, title: string) => {
    setDocumentUrl(url);
    setDocumentTitle(title);
  };

  if (!proceso) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anexos del Proceso #{proceso.num_registro}</DialogTitle>
            <DialogDescription>Gestiona los documentos adjuntos a este proceso desde Firebase.</DialogDescription>
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
                    <TableRow key={anexo.id}>
                      <TableCell className="font-medium">{anexo.nombre_documento}</TableCell>
                      <TableCell className="text-muted-foreground">{anexo.descripccion}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                           <Button 
                              variant="outline" 
                              size="sm"
                              disabled={!anexo.ruta_archivo}
                              onClick={() => handleViewDocument(anexo.ruta_archivo, anexo.nombre_documento)}>
                                <FileDown className="h-3 w-3 mr-1" /> Ver
                           </Button>
                           <a href={anexo.ruta_archivo} target="_blank" rel="noopener noreferrer" download={anexo.nombre_documento}>
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3 mr-1" /> Descargar
                              </Button>
                            </a>
                          <Button variant="destructive" size="sm" onClick={() => handleEliminar(anexo.id)}>
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
