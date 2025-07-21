'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Search, Trash2, Edit, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Anotacion } from '@/lib/data';
import { corregirTexto, transformarFecha, convertirAFormatoOrdenable, convertirHoraLimite, anadirPrefijoRuta } from '@/lib/anotaciones-helpers';
import { NuevaAnotacionModal } from './nueva-anotacion-modal';
import { collection, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DocumentViewerModal } from './document-viewer-modal';

export function AnotacionesModal({ proceso, isOpen, onClose }: { proceso: any | null; isOpen: boolean; onClose: () => void }) {
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const { toast } = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [anotacionParaEditar, setAnotacionParaEditar] = useState<Anotacion | null>(null);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  const fetchAnotacionesFromFirebase = useCallback(async (numRegistro: string) => {
    setCargando(true);
    try {
      const q = query(collection(db, 'procesos', numRegistro, 'anotaciones'), orderBy('fecha'));
      const querySnapshot = await getDocs(q);
      const anotacionesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Apply same corrections as before
          detalle: corregirTexto(data.detalle),
          fecha: transformarFecha(data.fecha),
          fecha_limite: transformarFecha(data.fecha_limite),
          archivo_url: data.archivo_url ? anadirPrefijoRuta(data.archivo_url) : null,
        } as Anotacion;
      });
      setAnotaciones(anotacionesData);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las anotaciones desde Firebase.' });
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen && proceso?.num_registro) {
      fetchAnotacionesFromFirebase(proceso.num_registro);
    }
  }, [isOpen, proceso, fetchAnotacionesFromFirebase]);


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

  const handleEliminar = async (anotacionId: string) => {
    if (!proceso?.num_registro || !anotacionId) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta anotación de Firebase?')) return;

    try {
        const anotacionDocRef = doc(db, 'procesos', proceso.num_registro, 'anotaciones', anotacionId);
        await deleteDoc(anotacionDocRef);
        toast({ title: 'Éxito', description: 'Anotación eliminada de Firebase.' });
        fetchAnotacionesFromFirebase(proceso.num_registro);
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
    if(proceso?.num_registro) {
        fetchAnotacionesFromFirebase(proceso.num_registro);
    }
  };

  if (!proceso) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anotaciones del Proceso #{proceso.num_registro}</DialogTitle>
            <DialogDescription>Gestiona las anotaciones, recordatorios y documentos asociados a este proceso desde Firebase.</DialogDescription>
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
            
            {!cargando && (
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
                    <TableRow key={anotacion.id}>
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
                          <Button variant="destructive" size="sm" onClick={() => handleEliminar(anotacion.id!)}><Trash2 className="h-3 w-3 mr-1"/> Eliminar</Button>
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
