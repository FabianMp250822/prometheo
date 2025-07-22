'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, XCircle, CheckCircle, FileCheck2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface ExcelDataUploaderProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExcelRow = { [key: string]: string | number | null };
type GroupedData = { [key: string]: ExcelRow[] };
type ComponentState = 'initial' | 'confirming' | 'processing' | 'result';

export function ExcelDataUploader({ isOpen, onClose }: ExcelDataUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [idColumnName, setIdColumnName] = useState('CEDULA');
  
  const [state, setState] = useState<ComponentState>('initial');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [parsedData, setParsedData] = useState<GroupedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setCollectionName('');
    setIdColumnName('CEDULA');
    setState('initial');
    setProgress(0);
    setProgressText('');
    setResult(null);
    setParsedData(null);
    setError(null);
  };

  const handleClose = () => {
    if (state === 'processing') return; // Don't allow closing while processing
    resetState();
    onClose();
  };

  const parseDate = (excelDate: any): Timestamp | null => {
      if (!excelDate && excelDate !== 0) return null;
      if (excelDate instanceof Date) {
          if (!isNaN(excelDate.getTime())) return Timestamp.fromDate(excelDate);
          return null;
      }
      if (typeof excelDate === 'number') {
          const jsDate = XLSX.SSF.parse_date_code(excelDate);
          if (jsDate) return Timestamp.fromDate(new Date(jsDate.y, jsDate.m - 1, jsDate.d, jsDate.H, jsDate.M, jsDate.S));
      }
      if (typeof excelDate === 'string') {
          const date = new Date(excelDate);
          if (!isNaN(date.getTime())) return Timestamp.fromDate(date);
      }
      return null;
  };

  const handlePrepareUpload = async () => {
    if (!file || !collectionName || !idColumnName) {
      toast({
        variant: 'destructive',
        title: 'Campos Incompletos',
        description: 'Por favor, complete todos los campos.',
      });
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        if (jsonData.length === 0) throw new Error("El archivo Excel está vacío.");
        if (!jsonData[0] || !(idColumnName in jsonData[0])) throw new Error(`La columna ID "${idColumnName}" no se encontró en el archivo.`);

        const groupedData: GroupedData = {};
        jsonData.forEach(row => {
          const idValue = row[idColumnName];
          if (idValue === null || idValue === undefined || idValue === '') return;
          const id = String(idValue);

          if (!groupedData[id]) groupedData[id] = [];
          
          const sanitizedRow: ExcelRow = {};
          for (const key in row) {
            if (Object.prototype.hasOwnProperty.call(row, key)) {
              sanitizedRow[key] = key.toUpperCase().includes('FECHA') ? parseDate(row[key]) : row[key];
            }
          }
          groupedData[id].push(sanitizedRow);
        });

        setParsedData(groupedData);
        setState('confirming');
      } catch (err: any) {
        setError(err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const handleStartUpload = async () => {
    if (!parsedData) return;
    setState('processing');

    try {
      const allIds = Object.keys(parsedData);
      const BATCH_SIZE = 250;
      const totalDocs = allIds.length;
      let docsProcessed = 0;

      for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunkIds = allIds.slice(i, i + BATCH_SIZE);

        for (const id of chunkIds) {
          const docRef = doc(db, collectionName, id);
          const records = parsedData[id];
          const docData = {
            [idColumnName]: id,
            records: records,
            lastUpdatedAt: Timestamp.now()
          };
          batch.set(docRef, docData, { merge: false });
        }
        
        await batch.commit();
        docsProcessed += chunkIds.length;
        setProgress((docsProcessed / totalDocs) * 100);
        setProgressText(`Lote ${Math.ceil(docsProcessed / BATCH_SIZE)} de ${Math.ceil(totalDocs / BATCH_SIZE)} guardado. Documentos: ${docsProcessed}/${totalDocs}`);
      }

      setResult({ success: true, message: `Se procesaron y guardaron ${totalDocs} documentos en la colección "${collectionName}".` });
    } catch (error: any) {
      setResult({ success: false, message: `Error: ${error.message}` });
      console.error("Upload error:", error);
    } finally {
      setState('result');
    }
  };
  
  const totalDocuments = useMemo(() => parsedData ? Object.keys(parsedData).length : 0, [parsedData]);


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (state === 'processing') e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Carga Masiva desde Excel</DialogTitle>
           {state === 'initial' && <DialogDescription>Suba un archivo para crear o actualizar una colección en Firebase.</DialogDescription>}
           {state === 'confirming' && <DialogDescription>Verifique los detalles y confirme la carga de datos.</DialogDescription>}
           {state === 'processing' && <DialogDescription>Procesando y guardando los datos en Firebase.</DialogDescription>}
           {state === 'result' && <DialogDescription>Resumen de la operación de carga.</DialogDescription>}
        </DialogHeader>

        {state === 'initial' && (
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="collection-name">1. Nombre de la Colección</Label>
              <Input id="collection-name" type="text" placeholder="Ej: pensionados, causantes" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
            </div>
             <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="id-column-name">2. Nombre de la Columna ID</Label>
              <Input id="id-column-name" type="text" value={idColumnName} onChange={(e) => setIdColumnName(e.target.value)} />
               <p className="text-xs text-muted-foreground">Esta columna se usará como el ID del documento.</p>
            </div>
             <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="file-upload">3. Seleccione el archivo Excel</Label>
              <Input id="file-upload" type="file" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error de Preparación</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
        )}
        
        {state === 'confirming' && (
            <div className="p-4 space-y-4">
                <Alert variant="default" className='border-amber-500'>
                    <FileCheck2 className="h-4 w-4" />
                    <AlertTitle>Confirmar Carga</AlertTitle>
                    <AlertDescription>
                        <p>Se van a procesar <strong className='text-foreground'>{totalDocuments}</strong> documentos únicos.</p>
                        <p>Los datos se guardarán en la colección: <strong className='text-foreground'>{collectionName}</strong>.</p>
                        <p className='mt-2 text-xs'>Si un documento con la misma cédula ya existe, será **reemplazado por completo** con los datos del archivo.</p>
                    </AlertDescription>
                </Alert>
            </div>
        )}
        
        {state === 'processing' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Procesando archivo...</p>
            <Progress value={progress} className="w-full" />
            <p className="text-sm font-medium text-muted-foreground">{progressText}</p>
          </div>
        )}

        {state === 'result' && result && (
            <div className='p-4'>
                 <Alert variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <AlertTitle>{result.success ? 'Carga Completada' : 'Error en la Carga'}</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                </Alert>
            </div>
        )}

        <DialogFooter className='gap-2 sm:gap-0'>
            {state === 'initial' && (
                <>
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handlePrepareUpload} disabled={!file || !collectionName || !idColumnName}>
                        <Upload className="mr-2 h-4 w-4" />
                        Validar y Preparar
                    </Button>
                </>
            )}
            {state === 'confirming' && (
                <>
                    <Button variant="outline" onClick={() => setState('initial')}>Atrás</Button>
                    <Button onClick={handleStartUpload}>Confirmar e Iniciar Carga</Button>
                </>
            )}
            {state === 'result' && (
                 <Button variant="outline" onClick={handleClose}>Cerrar</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
