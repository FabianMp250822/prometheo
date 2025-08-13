
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, FileText, AlertTriangle, FolderSymlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerModal } from './document-viewer-modal';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

const functions = getFunctions(app);
const getGoogleDriveFilesCallable = httpsCallable(functions, 'getGoogleDriveFiles');

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
}

interface SoportesDriveModalProps {
    isOpen: boolean;
    onClose: () => void;
    documento: string;
    nombre: string;
}

export function SoportesDriveModal({ isOpen, onClose, documento, nombre }: SoportesDriveModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [folderWebViewLink, setFolderWebViewLink] = useState<string | null>(null);

  const fetchDriveFiles = useCallback(async () => {
    if (!documento) return;
    setIsLoading(true);
    setError(null);
    try {
        const result = await getGoogleDriveFilesCallable({ folderName: documento });
        const driveFiles = result.data as DriveFile[];
        
        setFiles(driveFiles);
        // Assuming the parent folder link could be part of the response in a real scenario
        // For now, we'll use a placeholder or construct it if possible.
        
        if (driveFiles.length === 0) {
             toast({ title: 'Sin Archivos', description: 'No se encontraron documentos en Google Drive para este usuario.' });
        }
        
    } catch (err: any) {
      console.error(err);
      setError('No se pudieron cargar los documentos desde Google Drive. Contacte al administrador.');
      toast({ variant: 'destructive', title: 'Error de Conexión', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [documento, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchDriveFiles();
    }
  }, [isOpen, fetchDriveFiles]);

  const handleViewDocument = (file: DriveFile) => {
    // For many file types, webViewLink can be embedded. For others, it might force a download.
    // For office docs, it opens in the editor. Adjusting this might be needed based on real behavior.
    setDocumentUrl(file.webViewLink); 
    setDocumentTitle(file.name);
  };
  
  const handleOpenFolder = () => {
      // This would open the folder directly in Google Drive.
      // In a real implementation, the function could return the folder's webViewLink.
      // For now, we don't have this link, so the button can be disabled or link to a generic search.
      if (folderWebViewLink) {
          window.open(folderWebViewLink, '_blank');
      } else {
          toast({ description: "El enlace directo a la carpeta no está disponible en esta vista."})
      }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Soportes de: {nombre}</DialogTitle>
            <DialogDescription>Documentos obtenidos desde la carpeta de Google Drive (ID: {documento}).</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Conectando con Google Drive...</p>
              </div>
            )}
            
            {error && (
                <div className="p-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            {!isLoading && !error && (
               <ul className="divide-y">
                 {files.length > 0 ? files.map((file) => (
                    <li key={file.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary"/>
                            <span className="font-medium text-sm">{file.name}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewDocument(file)}>Ver Documento</Button>
                    </li>
                 )) : (
                    <li className="p-10 text-center text-sm text-muted-foreground">
                        No se encontraron soportes en la carpeta de Google Drive.
                    </li>
                 )}
               </ul>
            )}
          </div>
          <DialogFooter className="flex-row justify-between w-full">
            <Button variant="ghost" onClick={handleOpenFolder} className="flex items-center gap-2" disabled>
                <FolderSymlink className="h-4 w-4"/>
                Abrir Carpeta en Drive
            </Button>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
