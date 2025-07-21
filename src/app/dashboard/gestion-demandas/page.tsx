'use client';

import { useState, useTransition, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileClock, Loader2, ServerCrash, Download, Save } from 'lucide-react';
import { ExternalDemandsTable } from '@/components/dashboard/external-demands-table';
import { ProcessDetailsSheet } from '@/components/dashboard/process-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { DemandantesModal } from '@/components/dashboard/demandantes-modal';
import { AnotacionesModal } from '@/components/dashboard/anotaciones-modal';


export default function GestionDemandasPage() {
  const [procesos, setProcesos] = useState<any[]>([]);
  const [demandantes, setDemandantes] = useState<{ [key: string]: any[] }>({});
  const [anotaciones, setAnotaciones] = useState<{ [key: string]: any[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const [selectedProcessForDetails, setSelectedProcessForDetails] = useState<any | null>(null);
  const [selectedProcessForDemandantes, setSelectedProcessForDemandantes] = useState<any | null>(null);
  const [selectedProcessForAnotaciones, setSelectedProcessForAnotaciones] = useState<any | null>(null);

  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [savingProgress, setSavingProgress] = useState<{current: number, total: number} | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const fetchExternalData = async (url: string) => {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
    });
    if (!response.ok) {
        throw new Error(`Error en la respuesta de la red: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(`Error de la API: ${data.error}`);
    }
    return data;
  }

  const handleFetchData = useCallback(() => {
    startFetching(async () => {
      setError(null);
      setProcesos([]);
      setDemandantes({});
      setAnotaciones({});
      setLoadingMessage('Obteniendo lista de procesos...');
      
      try {
        const procesosData = await fetchExternalData('https://appdajusticia.com/procesos.php?all=true');

        if (!Array.isArray(procesosData)) {
            throw new Error('La respuesta de la API de procesos no es un array válido.');
        }
        
        const registrosUnicos = [...new Set(procesosData.map((p: any) => p.num_registro))];
        
        setLoadingMessage(`Obteniendo detalles de demandantes para ${registrosUnicos.length} procesos...`);
        const demandantesData: { [key: string]: any[] } = {};

        await Promise.all(
            registrosUnicos.map(async (numRegistro) => {
                 try {
                    const res = await fetchExternalData(`https://appdajusticia.com/procesos.php?num_registro=${numRegistro}`);
                    if (res && !res.error && Array.isArray(res)) {
                        demandantesData[numRegistro] = res;
                    } else {
                        demandantesData[numRegistro] = [];
                    }
                 } catch (e) {
                    console.warn(`No se pudieron cargar demandantes para el registro ${numRegistro}`, e);
                    demandantesData[numRegistro] = [];
                 }
            })
        );
        
        setLoadingMessage(`Obteniendo anotaciones para ${registrosUnicos.length} procesos...`);
        const anotacionesData: { [key: string]: any[] } = {};
        await Promise.all(
            registrosUnicos.map(async (numRegistro) => {
                try {
                    const res = await fetchExternalData(`https://appdajusticia.com/anotaciones.php?num_registro=${numRegistro}`);
                    if(res && !res.error && Array.isArray(res)) {
                        anotacionesData[numRegistro] = res;
                    } else {
                        anotacionesData[numRegistro] = [];
                    }
                } catch (e) {
                    console.warn(`No se pudieron cargar anotaciones para el registro ${numRegistro}`, e);
                    anotacionesData[numRegistro] = [];
                }
            })
        );

        setProcesos(procesosData);
        setDemandantes(demandantesData);
        setAnotaciones(anotacionesData);

        toast({
          title: 'Datos Obtenidos',
          description: `Se encontraron ${procesosData.length} procesos, con sus demandantes y anotaciones.`,
        });

      } catch (err: any) {
        setError(`Error al conectar con el servicio externo: ${err.message}. Por favor, verifique que el servicio esté disponible.`);
      } finally {
        setLoadingMessage(null);
      }
    });
  }, [toast]);

  const handleSaveData = () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'No Autenticado',
            description: 'Debe iniciar sesión para guardar datos.',
        });
        return;
    }

    if (procesos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay datos para guardar',
        description: 'Primero debes obtener los datos del servidor externo.',
      });
      return;
    }

    startSaving(async () => {
      const BATCH_SIZE = 100; // Procesar 100 procesos por lote
      const totalBatches = Math.ceil(procesos.length / BATCH_SIZE);
      setSavingProgress({ current: 0, total: totalBatches });

      try {
        for (let i = 0; i < procesos.length; i += BATCH_SIZE) {
            const batchChunk = procesos.slice(i, i + BATCH_SIZE);
            const batch = writeBatch(db);
            const procesosCollection = collection(db, 'procesos');

            batchChunk.forEach(proceso => {
                const procesoDocRef = doc(procesosCollection, proceso.num_registro);
                
                const procesoData = Object.fromEntries(
                    Object.entries(proceso).filter(([_, v]) => v != null)
                );
                batch.set(procesoDocRef, procesoData);

                const demandantesDeProceso = demandantes[proceso.num_registro];
                if (demandantesDeProceso && demandantesDeProceso.length > 0) {
                    const demandantesSubCollection = collection(procesoDocRef, 'demandantes');
                    demandantesDeProceso.forEach(demandante => {
                    if (demandante.identidad_demandante) {
                        const demandanteDocRef = doc(demandantesSubCollection, demandante.identidad_demandante);
                        const demandanteData = Object.fromEntries(
                            Object.entries(demandante).filter(([_, v]) => v != null)
                        );
                        batch.set(demandanteDocRef, demandanteData);
                    }
                    });
                }

                const anotacionesDeProceso = anotaciones[proceso.num_registro];
                if (anotacionesDeProceso && anotacionesDeProceso.length > 0) {
                    const anotacionesSubCollection = collection(procesoDocRef, 'anotaciones');
                    anotacionesDeProceso.forEach(anotacion => {
                        if(anotacion.auto) {
                            const anotacionDocRef = doc(anotacionesSubCollection, anotacion.auto);
                            const anotacionData = Object.fromEntries(
                                Object.entries(anotacion).filter(([_,v]) => v != null)
                            );
                            batch.set(anotacionDocRef, anotacionData);
                        }
                    });
                }
            });

            await batch.commit();
            setSavingProgress({ current: (i / BATCH_SIZE) + 1, total: totalBatches });
        }

        toast({
            title: 'Guardado Exitoso',
            description: `${procesos.length} procesos y sus datos asociados han sido guardados en Firebase.`,
        });

      } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Error al Guardar',
            description: `Error de Firestore: ${error.message}`,
        });
      } finally {
        setSavingProgress(null);
      }
    });
  };

  const handleViewDetails = (process: any) => {
    setSelectedProcessForDetails(process);
  };
  
  const handleViewDemandantes = (process: any) => {
    setSelectedProcessForDemandantes(process);
  };

  const handleViewAnotaciones = (process: any) => {
    setSelectedProcessForAnotaciones(process);
  }


  return (
    <div className="p-4 md:p-8 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <FileClock className="h-6 w-6" />
                Gestión de Demandas Externas
              </CardTitle>
              <CardDescription>
                Obtenga y guarde los datos de procesos y demandantes externos.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleFetchData} disabled={isFetching || isSaving}>
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Obtener Datos Externos
              </Button>
              {procesos.length > 0 && (
                 <Button onClick={handleSaveData} disabled={isFetching || isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
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
            <AlertTitle>Error al Obtener Datos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {procesos.length > 0 && !isFetching && !isSaving && (
         <ExternalDemandsTable 
            procesos={procesos} 
            demandantes={demandantes}
            onViewDetails={handleViewDetails}
          />
      )}

      <ProcessDetailsSheet
        process={selectedProcessForDetails}
        isOpen={!!selectedProcessForDetails}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                setSelectedProcessForDetails(null);
            }
        }}
        onViewDemandantes={handleViewDemandantes}
        onViewAnotaciones={handleViewAnotaciones}
        onDataSaved={() => {
          setSelectedProcessForDetails(null);
          handleFetchData();
        }}
       />
       
       <DemandantesModal
          proceso={selectedProcessForDemandantes}
          isOpen={!!selectedProcessForDemandantes}
          onClose={() => setSelectedProcessForDemandantes(null)}
        />
        
       <AnotacionesModal
          proceso={selectedProcessForAnotaciones}
          anotaciones={anotaciones[selectedProcessForAnotaciones?.num_registro] || []}
          isOpen={!!selectedProcessForAnotaciones}
          onClose={() => setSelectedProcessForAnotaciones(null)}
       />
    </div>
  );
}
