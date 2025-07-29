

'use client';

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileClock, Loader2, ServerCrash, Download, Save, RefreshCw } from 'lucide-react';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';
import { ProcessDetailsSheet } from '@/components/dashboard/process-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { collection, doc, getDocs, query, orderBy, limit, startAfter, where, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { DemandantesModal } from '@/components/dashboard/demandantes-modal';
import { AnotacionesModal } from '@/components/dashboard/anotaciones-modal';
import { AnexosModal } from '@/components/dashboard/anexos-modal';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { saveSyncedDataToFirebase } from '@/services/processes-service';


const ITEMS_PER_PAGE = 20;

// Debounce hook to delay querying Firestore
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


export default function GestionDemandasPage() {
  const [externalData, setExternalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  // State for data displayed from Firebase
  const [firebaseProcesos, setFirebaseProcesos] = useState<any[]>([]);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // State for search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearching, setIsSearching] = useState(false);

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
  
  const fetchProcesos = useCallback(async (cursor?: QueryDocumentSnapshot<DocumentData> | null) => {
      const isLoadMore = !!cursor;
      if (isLoadMore) {
          setIsLoadingFirebase(true);
      } else {
          setFirebaseProcesos([]); // Reset for initial fetch
          setIsLoadingFirebase(true);
      }

      try {
          let q = query(collection(db, 'procesos'), orderBy('num_registro'), limit(ITEMS_PER_PAGE));
          if (isLoadMore && cursor) {
              q = query(q, startAfter(cursor));
          }
          
          const querySnapshot = await getDocs(q);
          const newProcesos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

          setLastDoc(lastVisible || null);
          setHasMore(newProcesos.length === ITEMS_PER_PAGE);
          setFirebaseProcesos(prev => isLoadMore ? [...prev, ...newProcesos] : newProcesos);
      } catch (err: any) {
          console.error("Error fetching from Firebase:", err);
          toast({ variant: 'destructive', title: 'Error de Firebase', description: `No se pudieron cargar los procesos: ${err.message}` });
      } finally {
          setIsLoadingFirebase(false);
      }
  }, [toast]);
  
  // Effect for initial data load
  useEffect(() => {
    fetchProcesos(null);
  }, []);

  // Effect for handling search queries
  useEffect(() => {
      const search = async () => {
          if (debouncedSearchTerm.length < 3) {
              if (searchTerm === '') fetchProcesos(null); // Reload initial if search cleared
              return;
          }

          setIsSearching(true);
          setIsLoadingFirebase(true);

          try {
              const isNumeric = /^\d+$/.test(debouncedSearchTerm);
              let searchPromises: Promise<QueryDocumentSnapshot<DocumentData>[]>[] = [];

              if (isNumeric) {
                  const radicadoIniQuery = query(collection(db, 'procesos'), where('num_radicado_ini', '>=', debouncedSearchTerm), where('num_radicado_ini', '<=', debouncedSearchTerm + '\uf8ff'));
                  const radicadoUltQuery = query(collection(db, 'procesos'), where('num_radicado_ult', '>=', debouncedSearchTerm), where('num_radicado_ult', '<=', debouncedSearchTerm + '\uf8ff'));
                  searchPromises.push(getDocs(radicadoIniQuery).then(snap => snap.docs));
                  searchPromises.push(getDocs(radicadoUltQuery).then(snap => snap.docs));
              } else {
                  const upperSearchTerm = debouncedSearchTerm.toUpperCase();
                  const demandanteQuery = query(collection(db, 'procesos'), where('nombres_demandante', '>=', upperSearchTerm), where('nombres_demandante', '<=', upperSearchTerm + '\uf8ff'));
                  const demandadoQuery = query(collection(db, 'procesos'), where('nombres_demandado', '>=', upperSearchTerm), where('nombres_demandado', '<=', upperSearchTerm + '\uf8ff'));
                  searchPromises.push(getDocs(demandanteQuery).then(snap => snap.docs));
                  searchPromises.push(getDocs(demandadoQuery).then(snap => snap.docs));
              }

              const results = await Promise.all(searchPromises);
              const combinedDocs = [...results[0], ...results[1]];
              const uniqueDocs = Array.from(new Map(combinedDocs.map(doc => [doc.id, doc])).values());
              
              setFirebaseProcesos(uniqueDocs.map(doc => ({ id: doc.id, ...doc.data() })));
              setHasMore(false); // Disable pagination during search

          } catch (error) {
              console.error('Error during search:', error);
              toast({ variant: 'destructive', title: 'Error de Búsqueda', description: 'No se pudo realizar la búsqueda.' });
          } finally {
              setIsSearching(false);
              setIsLoadingFirebase(false);
          }
      };

      search();
  }, [debouncedSearchTerm, toast, searchTerm]);

  // --- External API Data Fetching for Syncing ---
  const handleFetchData = useCallback(() => {
    startFetching(async () => {
      setError(null);
      setExternalData(null);
      setLoadingMessage('Iniciando sincronización... Esto puede tomar varios minutos.');
      
      try {
        const functions = getFunctions(app);
        const syncExternalDataCallable = httpsCallable(functions, 'syncExternalData');
        const result = await syncExternalDataCallable();
        const { success, data, error: resultError } = result.data as { success: boolean; data?: any; error?: string };
        
        if (success && data) {
          setExternalData(data);
          toast({ title: 'Datos Externos Obtenidos', description: `Se encontraron ${data.procesos.length} procesos listos para guardar.` });
        } else {
          setError(`Error al conectar con el servicio externo: ${resultError}.`);
        }
      } catch (e: any) {
        setError(`Error al llamar a la función: ${e.message}`);
      }
      setLoadingMessage(null);
    });
  }, [toast]);

  // --- Data Saving to Firebase ---
  const handleSaveData = useCallback(() => {
    if (!user) {
        toast({ variant: 'destructive', title: 'No Autenticado', description: 'Debe iniciar sesión para guardar datos.' });
        return;
    }

    if (!externalData || externalData.procesos.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos para guardar', description: 'Primero debes obtener los datos del servidor externo.' });
      return;
    }

    startSaving(async () => {
      setLoadingMessage(`Iniciando guardado...`);
      try {
        await saveSyncedDataToFirebase(externalData);
        toast({ title: 'Guardado Exitoso', description: `${externalData.procesos.length} procesos y sus datos asociados han sido guardados en Firebase.` });
        await fetchProcesos(null);

      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error al Guardar', description: `Error de Firestore: ${error.message}` });
      } finally {
        setSavingProgress(null);
        setExternalData(null); // Clear memory
      }
    });
  }, [externalData, toast, user]);

  // --- UI Handlers ---
  const handleViewDetails = (process: any) => {
    setSelectedProcess(process);
    setIsDetailsSheetOpen(true);
  };
  
  const handleRefresh = () => {
      setSearchTerm('');
      fetchProcesos(null);
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
              {externalData && (
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

       <Card>
          <CardHeader>
              <CardTitle>Procesos en Firebase</CardTitle>
              <div className='flex flex-col md:flex-row justify-between md:items-center gap-4'>
                <CardDescription>
                  {debouncedSearchTerm ? `Resultados de búsqueda para "${debouncedSearchTerm}".` : `Mostrando registros paginados.`}
                </CardDescription>
                <div className='flex items-center gap-2'>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                      <RefreshCw className="mr-2 h-4 w-4"/>
                      Refrescar
                  </Button>
                </div>
              </div>
          </CardHeader>
          <CardContent>
              <ExternalDemandsTable 
                  procesos={firebaseProcesos} 
                  onViewDetails={handleViewDetails}
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                  isSearching={isSearching}
              />
               {!debouncedSearchTerm && (
                <div className="flex justify-center py-4">
                  {isLoadingFirebase && firebaseProcesos.length > 0 ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                  ) : hasMore ? (
                      <Button onClick={() => fetchProcesos(lastDoc)} disabled={isLoadingFirebase}>
                          Cargar más
                      </Button>
                  ) : firebaseProcesos.length > 0 && (
                      <p className="text-sm text-muted-foreground">Has llegado al final de la lista.</p>
                  )}
                </div>
               )}
                {isLoadingFirebase && firebaseProcesos.length === 0 && (
                    <div className="flex justify-center items-center p-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}
          </CardContent>
       </Card>

      <ProcessDetailsSheet
        process={selectedProcess}
        isOpen={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
        onViewDemandantes={() => setIsDemandantesModalOpen(true)}
        onViewAnotaciones={() => setIsAnotacionesModalOpen(true)}
        onViewAnexos={() => setIsAnexosModalOpen(true)}
        onDataSaved={() => {
          setIsDetailsSheetOpen(false);
          fetchProcesos(null);
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
