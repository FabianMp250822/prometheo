
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, FileText, AlertTriangle, FolderSymlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentViewerModal } from './document-viewer-modal';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
// import { getFunctions, httpsCallable } from 'firebase/functions';

// const functions = getFunctions();
// const getGoogleDriveFilesCallable = httpsCallable(functions, 'getGoogleDriveFiles');

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

  const fetchDriveFiles = useCallback(async () => {
    if (!documento) return;
    setIsLoading(true);
    setError(null);
    try {
        // --- This is where the call to the Firebase Function would go ---
        // const result = await getGoogleDriveFilesCallable({ folderName: documento });
        // const driveFiles = result.data as DriveFile[];
        
        // --- Mocking the response for now ---
        console.log(`Simulating fetch for folder: ${documento}`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
        const mockFiles: DriveFile[] = [
            { id: '1', name: 'Resolucion_Pension.pdf', webViewLink: '#', mimeType: 'application/pdf' },
            { id: '2', name: 'Cedula_Ciudadania.pdf', webViewLink: '#', mimeType: 'application/pdf' },
            { id: '3', name: 'Historia_Laboral.pdf', webViewLink: '#', mimeType: 'application/pdf' },
        ];
        // --- End of Mock ---
        
        // Replace mockFiles with driveFiles when the function is ready
        setFiles(mockFiles);

        if (mockFiles.length === 0) {
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
    // This will need adjustment once real URLs are available.
    // For now, it will likely not work as webViewLink is not a direct file link.
    // The Firebase Function would need to return a direct-access or proxied URL.
    setDocumentUrl(file.webViewLink); 
    setDocumentTitle(file.name);
  };
  
  const handleOpenFolder = () => {
      // This would open the folder directly in Google Drive.
      // The link would ideally come from the Firebase Function.
      const folderUrl = `https://drive.google.com/drive/u/0/folders/DRIVE_FOLDER_ID`; // Placeholder
      window.open(folderUrl, '_blank');
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
            <Button variant="ghost" onClick={handleOpenFolder} className="flex items-center gap-2">
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
