'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface ExcelDataUploaderProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExcelDataUploader({ isOpen, onClose }: ExcelDataUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [idColumnName, setIdColumnName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setCollectionName('');
    setIdColumnName('');
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseDate = (excelDate: any): Timestamp | null => {
      if (!excelDate) return null;
      // XLSX can return dates as numbers (days since 1900) or strings.
      if (typeof excelDate === 'number') {
          // The formula adjusts for the Excel 1900 leap year bug.
          const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
          return Timestamp.fromDate(jsDate);
      }
      if (typeof excelDate === 'string') {
          // Attempt to parse common string formats. This can be made more robust.
          const date = new Date(excelDate);
          if (!isNaN(date.getTime())) {
              return Timestamp.fromDate(date);
          }
      }
      return null;
  };


  const handleFileUpload = async () => {
    if (!file || !collectionName || !idColumnName) {
      toast({
        variant: 'destructive',
        title: 'Campos Incompletos',
        description: 'Por favor, seleccione un archivo, ingrese un nombre de colección y el nombre de la columna ID.',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    // 1. Check if collection exists
    try {
      const collectionRef = collection(db, collectionName);
      const docSnap = await getDoc(doc(collectionRef));
      // This is a simplified check. A more robust check might query for limit(1).
      // For this use case, we'll proceed and let the user decide.
      // A simple `getDoc` on a collection path doesn't work. Let's ask for confirmation.
      if (!window.confirm(`¿Está seguro que desea escribir en la colección "${collectionName}"? Si no existe, se creará. Si existe, se podrían sobreescribir documentos.`)) {
          setIsProcessing(false);
          return;
      }
    } catch (e) {
      // This part is tricky, as Firestore doesn't have a native "collection exists" check.
      // We'll proceed with user confirmation.
    }

    // 2. Read and process Excel file
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            throw new Error("El archivo Excel está vacío o tiene un formato incorrecto.");
        }

        // 3. Group data by ID column
        const groupedData: { [key: string]: any[] } = {};
        jsonData.forEach(row => {
          const id = row[idColumnName];
          if (id) {
            if (!groupedData[id]) {
              groupedData[id] = [];
            }
            // Sanitize row data and convert dates
            const sanitizedRow = { ...row };
            for (const key in sanitizedRow) {
                if (key.toLowerCase().includes('fecha')) {
                    sanitizedRow[key] = parseDate(sanitizedRow[key]);
                }
            }
            groupedData[id].push(sanitizedRow);
          }
        });
        
        // 4. Upload data in batches
        const allIds = Object.keys(groupedData);
        const BATCH_SIZE = 250; 
        let recordsProcessed = 0;

        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunkIds = allIds.slice(i, i + BATCH_SIZE);

          chunkIds.forEach(id => {
            const records = groupedData[id];
            // Here, we assume the main document has one primary record and the rest are history.
            // A simpler approach is to store all records in an array.
            const docRef = doc(db, collectionName, id.toString());
            const docData = {
                id: id.toString(),
                records: records,
                createdAt: Timestamp.now()
            };
            batch.set(docRef, docData);
          });
          
          await batch.commit();
          recordsProcessed += chunkIds.length;
          setProgress((recordsProcessed / allIds.length) * 100);
        }

        setResult({ success: true, message: `Se procesaron y guardaron ${allIds.length} documentos en la colección "${collectionName}".` });

      } catch (error: any) {
        setResult({ success: false, message: `Error: ${error.message}` });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Carga Masiva desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel para crear o actualizar una colección en Firebase.
          </DialogDescription>
        </DialogHeader>

        {!isProcessing && !result && (
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="file-upload">1. Seleccione el archivo Excel</Label>
              <Input id="file-upload" type="file" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="collection-name">2. Nombre de la Colección en Firebase</Label>
              <Input id="collection-name" type="text" placeholder="Ej: causantes, parris1" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
            </div>
             <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="id-column-name">3. Nombre de la Columna ID</Label>
              <Input id="id-column-name" type="text" placeholder="Ej: CEDULA" value={idColumnName} onChange={(e) => setIdColumnName(e.target.value)} />
               <p className="text-xs text-muted-foreground">Esta columna se usará como el ID del documento en Firebase.</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Procesando archivo, por favor espere...</p>
            <Progress value={progress} className="w-full" />
            <p className="text-sm font-medium">{Math.round(progress)}% completado</p>
          </div>
        )}

        {result && (
            <div className='p-4'>
                 <Alert variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <AlertTitle>{result.success ? 'Carga Completada' : 'Error en la Carga'}</AlertTitle>
                    <AlertDescription>
                        {result.message}
                    </AlertDescription>
                </Alert>
            </div>
        )}

        <DialogFooter>
          {result ? (
            <Button variant="outline" onClick={handleClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Cancelar</Button>
              <Button onClick={handleFileUpload} disabled={isProcessing || !file || !collectionName || !idColumnName}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Iniciar Carga
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
