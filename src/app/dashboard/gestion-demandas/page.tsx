'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileClock, Loader2, ServerCrash, Download, Save, RefreshCw } from 'lucide-react';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';
import { ProcessDetailsSheet } from '@/components/dashboard/process-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { writeBatch, collection, doc, getDocs, query, orderBy, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { DemandantesModal } from '@/components/dashboard/demandantes-modal';
import { AnotacionesModal } from '@/components/dashboard/anotaciones-modal';
import { AnexosModal } from '@/components/dashboard/anexos-modal';

const ITEMS_PER_PAGE = 20;

export default function GestionDemandasPage() {
  // State for data from external API (for syncing)
  const [externalProcesos, setExternalProcesos] = useState<any[]>([]);
  const [externalDemandantes, setExternalDemandantes] = useState<{ [key: string]: any[] }>({});
  const [externalAnotaciones, setExternalAnotaciones] = useState<{ [key: string]: any[] }>({});
  const [externalAnexos, setExternalAnexos] = useState<{ [key: string]: any[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  // State for data displayed from Firebase
  const [firebaseProcesos, setFirebaseProcesos] = useState<any[]>([]);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modals and sheets state
  const [selectedProcess, setSelectedProcess] = useState<any | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isDemandantesModalOpen, setIsDemandantesModalOpen] = useState(false);
  const [isAnotacionesModalOpen, setIsAnotacionesModalOpen] = useState(false);
  const [isAnexosModalOpen, setIsAnexosModalOpen] = useState(false);

  // Transitions for async operations
  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [savingProgress, setSavingProgress] = useState<{current: number, total: number} | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // --- Data Fetching from Firebase ---
  const fetchProcesosFromFirebase = useCallback(async (loadMore = false) => {
    if (!loadMore) {
      setIsLoadingFirebase(true);
      setFirebaseProcesos([]);
      setLastDoc(null);
    }
    
    try {
      let q = query(collection(db, 'procesos'), orderBy('num_registro'), limit(ITEMS_PER_PAGE));
      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const querySnapshot = await getDocs(q);
      const newProcesos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

      setLastDoc(lastVisible || null);
      setHasMore(newProcesos.length === ITEMS_PER_PAGE);

      setFirebaseProcesos(prev => loadMore ? [...prev, ...newProcesos] : newProcesos);

    } catch (err: any) {
      console.error("Error fetching from Firebase:", err);
      toast({ variant: 'destructive', title: 'Error de Firebase', description: `No se pudieron cargar los procesos: ${err.message}` });
    } finally {
      setIsLoadingFirebase(false);
    }
  }, [lastDoc, toast]);
  
  useEffect(() => {
    fetchProcesosFromFirebase();
  }, []); // Initial fetch from Firebase

  // --- External API Data Fetching for Syncing ---
  const fetchExternalData = async (url: string) => {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
    });
    if (!response.ok) {
        throw new Error(`Error en la respuesta de la red: ${response.statusText}`);
    }
    const textResponse = await response.text();
    // Clean response before parsing JSON
    const jsonStart = textResponse.indexOf('[');
    const jsonEnd = textResponse.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
      return []; // Return empty array if not a valid JSON array structure
    }
    const jsonString = textResponse.substring(jsonStart, jsonEnd + 1);
    try {
        const data = JSON.parse(jsonString);
        if (data.error) throw new Error(`Error de la API: ${data.error}`);
        return data;
    } catch (e) {
        console.error("JSON parsing error", e);
        throw new Error("La respuesta de la API no es un JSON válido.");
    }
  }

  const handleFetchData = useCallback(() => {
    startFetching(async () => {
      setError(null);
      setExternalProcesos([]);
      setExternalDemandantes({});
      setExternalAnotaciones({});
      setExternalAnexos({});

      try {
        setLoadingMessage('Obteniendo lista de procesos...');
        const procesosData = await fetchExternalData('https://appdajusticia.com/procesos.php?all=true');
        if (!Array.isArray(procesosData)) throw new Error('La respuesta de la API de procesos no es un array válido.');
        setExternalProcesos(procesosData);
        
        const registrosUnicos = [...new Set(procesosData.map((p: any) => p.num_registro))];
        
        // Fetch Demandantes
        setLoadingMessage(`Obteniendo demandantes para ${registrosUnicos.length} procesos...`);
        const demandantesData: { [key: string]: any[] } = {};
        await Promise.all(registrosUnicos.map(async (numRegistro) => {
          demandantesData[numRegistro] = await fetchExternalData(`https://appdajusticia.com/procesos.php?num_registro=${numRegistro}`);
        }));
        setExternalDemandantes(demandantesData);

        // Fetch Anotaciones
        setLoadingMessage(`Obteniendo anotaciones para ${registrosUnicos.length} procesos...`);
        const anotacionesData: { [key: string]: any[] } = {};
        await Promise.all(registrosUnicos.map(async (numRegistro) => {
          anotacionesData[numRegistro] = await fetchExternalData(`https://appdajusticia.com/anotaciones.php?num_registro=${numRegistro}`);
        }));
        setExternalAnotaciones(anotacionesData);

        // Fetch Anexos
        setLoadingMessage(`Obteniendo anexos para ${registrosUnicos.length} procesos...`);
        const anexosData: { [key: string]: any[] } = {};
        await Promise.all(registrosUnicos.map(async (numRegistro) => {
          anexosData[numRegistro] = await fetchExternalData(`https://appdajusticia.com/crud_anexos.php?num_registro=${numRegistro}`);
        }));
        setExternalAnexos(anexosData);

        toast({ title: 'Datos Externos Obtenidos', description: `Se encontraron ${procesosData.length} procesos con todos sus datos asociados.` });

      } catch (err: any) {
        setError(`Error al conectar con el servicio externo: ${err.message}.`);
      } finally {
        setLoadingMessage(null);
      }
    });
  }, [toast]);

  // --- Data Saving to Firebase ---
  const handleSaveData = () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'No Autenticado', description: 'Debe iniciar sesión para guardar datos.' });
        return;
    }

    if (externalProcesos.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos para guardar', description: 'Primero debes obtener los datos del servidor externo.' });
      return;
    }

    startSaving(async () => {
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(externalProcesos.length / BATCH_SIZE);
      setSavingProgress({ current: 0, total: totalBatches });

      try {
        for (let i = 0; i < externalProcesos.length; i += BATCH_SIZE) {
            const batchChunk = externalProcesos.slice(i, i + BATCH_SIZE);
            const batch = writeBatch(db);
            
            batchChunk.forEach(proceso => {
                const procesoDocRef = doc(db, 'procesos', proceso.num_registro);
                batch.set(procesoDocRef, Object.fromEntries(Object.entries(proceso).filter(([_, v]) => v != null)));

                const subCollections = {
                  demandantes: externalDemandantes[proceso.num_registro],
                  anotaciones: externalAnotaciones[proceso.num_registro],
                  anexos: externalAnexos[proceso.num_registro]
                };

                for (const [key, items] of Object.entries(subCollections)) {
                  if (items && items.length > 0) {
                      const subCollectionRef = collection(procesoDocRef, key);
                      items.forEach(item => {
                          const itemId = item.identidad_demandante || item.auto;
                          if (itemId) {
                              const itemDocRef = doc(subCollectionRef, itemId.toString());
                              batch.set(itemDocRef, Object.fromEntries(Object.entries(item).filter(([_, v]) => v != null)));
                          }
                      });
                  }
                }
            });

            await batch.commit();
            setSavingProgress({ current: (i / BATCH_SIZE) + 1, total: totalBatches });
        }

        toast({ title: 'Guardado Exitoso', description: `${externalProcesos.length} procesos y sus datos asociados han sido guardados en Firebase.` });
        await fetchProcesosFromFirebase(); // Refresh the list from Firebase

      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error al Guardar', description: `Error de Firestore: ${error.message}` });
      } finally {
        setSavingProgress(null);
        setExternalProcesos([]); // Clear memory
      }
    });
  };

  // --- UI Handlers ---
  const handleViewDetails = (process: any) => {
    setSelectedProcess(process);
    setIsDetailsSheetOpen(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <FileClock className="h-6 w-6" />
                Gestión de Demandas
              </CardTitle>
              <CardDescription>
                Visualice datos desde Firebase o sincronice desde el sistema externo.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleFetchData} disabled={isFetching || isSaving}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Obtener Datos Externos
              </Button>
              {externalProcesos.length > 0 && (
                 <Button onClick={handleSaveData} disabled={isFetching || isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar en Firebase
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {(isFetching || isSaving) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center p-4 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div>
                <p className="font-semibold">{isSaving ? 'Guardando datos en Firebase...' : 'Obteniendo datos externos...'}</p>
                <p className="text-sm text-muted-foreground">{loadingMessage}</p>
                {savingProgress && (
                  <div className='mt-2'>
                    <p className='text-sm text-muted-foreground'>Guardando lote {savingProgress.current} de {savingProgress.total}</p>
                    <Progress value={(savingProgress.current / savingProgress.total) * 100} className="w-full mt-1" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
         <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Error de Sincronización</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingFirebase ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
         <Card>
            <CardHeader className='flex-row items-center justify-between'>
                <div>
                    <CardTitle>Procesos en Firebase</CardTitle>
                    <CardDescription>Mostrando {firebaseProcesos.length} registros.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchProcesosFromFirebase()}>
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    Refrescar
                </Button>
            </CardHeader>
            <CardContent>
                <ExternalDemandsTable 
                    procesos={firebaseProcesos} 
                    onViewDetails={handleViewDetails}
                />
                 <div className="flex justify-center py-4">
                    {hasMore && (
                        <Button onClick={() => fetchProcesosFromFirebase(true)} disabled={isLoadingFirebase}>
                            {isLoadingFirebase && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cargar más
                        </Button>
                    )}
                    {!hasMore && firebaseProcesos.length > 0 && (
                        <p className="text-sm text-muted-foreground">Has llegado al final de la lista.</p>
                    )}
                </div>
            </CardContent>
         </Card>
      )}

      <ProcessDetailsSheet
        process={selectedProcess}
        isOpen={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
        onViewDemandantes={() => setIsDemandantesModalOpen(true)}
        onViewAnotaciones={() => setIsAnotacionesModalOpen(true)}
        onViewAnexos={() => setIsAnexosModalOpen(true)}
        onDataSaved={() => {
          setIsDetailsSheetOpen(false);
          fetchProcesosFromFirebase();
        }}
       />
       
       <DemandantesModal
          proceso={selectedProcess}
          isOpen={isDemandantesModalOpen}
          onClose={() => setIsDemandantesModalOpen(false)}
        />
        
       <AnotacionesModal
          proceso={selectedProcess}
          isOpen={isAnotacionesModalOpen}
          onClose={() => setIsAnotacionesModalOpen(false)}
       />
       
       <AnexosModal
          proceso={selectedProcess}
          isOpen={isAnexosModalOpen}
          onClose={() => setIsAnexosModalOpen(false)}
        />
    </div>
  );
}
