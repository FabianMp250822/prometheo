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
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface ExcelDataUploaderProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom type for rows to avoid 'any'
type ExcelRow = { [key: string]: string | number | null };

export function ExcelDataUploader({ isOpen, onClose }: ExcelDataUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [idColumnName, setIdColumnName] = useState('CEDULA'); // Default to CEDULA as requested
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setCollectionName('');
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Improved date parsing to handle Excel's numeric format and common string formats
  const parseDate = (excelDate: any): Timestamp | null => {
      if (!excelDate && excelDate !== 0) return null;
      
      // XLSX 'cellDates: true' should return Date objects, but we double-check
      if (excelDate instanceof Date) {
          if (!isNaN(excelDate.getTime())) {
              return Timestamp.fromDate(excelDate);
          }
          return null;
      }

      // Handle Excel's numeric date format
      if (typeof excelDate === 'number') {
          const jsDate = XLSX.SSF.parse_date_code(excelDate);
          if (jsDate) {
              return Timestamp.fromDate(new Date(jsDate.y, jsDate.m - 1, jsDate.d, jsDate.H, jsDate.M, jsDate.S));
          }
      }
      
      // Handle common string formats as a fallback
      if (typeof excelDate === 'string') {
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
        description: 'Por favor, seleccione un archivo e ingrese un nombre de colección y el nombre de la columna ID.',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    if (!window.confirm(`¿Está seguro de que desea escribir en la colección "${collectionName}"? Si ya existen documentos con las mismas cédulas, se sobreescribirán por completo con los datos del archivo.`)) {
        setIsProcessing(false);
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // cellDates is important for date parsing
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        if (jsonData.length === 0) {
            throw new Error("El archivo Excel está vacío o tiene un formato incorrecto.");
        }
        
        // 1. Validate that the ID column exists
        if (!jsonData[0] || !(idColumnName in jsonData[0])) {
             throw new Error(`La columna ID especificada ("${idColumnName}") no se encontró en el archivo Excel.`);
        }

        // 2. Group data by the ID column
        const groupedData: { [key: string]: ExcelRow[] } = {};
        jsonData.forEach(row => {
          const idValue = row[idColumnName];
          if (idValue === null || idValue === undefined || idValue === '') {
            // Skip rows with no ID
            return;
          }
          const id = String(idValue);

          if (!groupedData[id]) {
            groupedData[id] = [];
          }
          
          // Sanitize each row, converting dates and ensuring all keys are present
          const sanitizedRow: ExcelRow = {};
          for (const key in row) {
             if (Object.prototype.hasOwnProperty.call(row, key)) {
                // Check if key contains 'FECHA' and parse it
                if (key.toUpperCase().includes('FECHA')) {
                    sanitizedRow[key] = parseDate(row[key]);
                } else {
                    sanitizedRow[key] = row[key];
                }
             }
          }
          groupedData[id].push(sanitizedRow);
        });
        
        // 3. Upload data in batches
        const allIds = Object.keys(groupedData);
        const BATCH_SIZE = 250; 
        let recordsProcessed = 0;

        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunkIds = allIds.slice(i, i + BATCH_SIZE);

          for (const id of chunkIds) {
            const docRef = doc(db, collectionName, id);
            const records = groupedData[id];
            
            // The structure is one document per ID, containing an array of its historical records.
            const docData = {
              [idColumnName]: id, // Store the ID field within the doc as well
              records: records,
              lastUpdatedAt: Timestamp.now()
            };
            
            batch.set(docRef, docData, { merge: false }); // Use set with merge:false to completely overwrite
          }
          
          await batch.commit();
          recordsProcessed += chunkIds.length;
          setProgress((recordsProcessed / allIds.length) * 100);
        }

        setResult({ success: true, message: `Se procesaron y guardaron ${allIds.length} documentos en la colección "${collectionName}".` });

      } catch (error: any) {
        setResult({ success: false, message: `Error: ${error.message}` });
        console.error("Upload error:", error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };


  return (
    <Dialog open={isOpen} onOpenChange={!isProcessing ? handleClose : undefined}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (isProcessing) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Carga Masiva desde Excel</DialogTitle>
          <DialogDescription>
            Suba un archivo Excel para crear o actualizar una colección en Firebase.
          </DialogDescription>
        </DialogHeader>

        {!isProcessing && !result && (
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="collection-name">1. Nombre de la Colección en Firebase</Label>
              <Input id="collection-name" type="text" placeholder="Ej: causantes, parris1" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
            </div>
             <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="id-column-name">2. Nombre de la Columna ID</Label>
              <Input id="id-column-name" type="text" value={idColumnName} onChange={(e) => setIdColumnName(e.target.value)} />
               <p className="text-xs text-muted-foreground">Esta columna se usará como el ID del documento en Firebase. Debe existir en el Excel.</p>
            </div>
             <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="file-upload">3. Seleccione el archivo Excel</Label>
              <Input id="file-upload" type="file" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
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
